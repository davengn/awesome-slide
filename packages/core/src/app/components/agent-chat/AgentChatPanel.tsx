import {
  Bot,
  CheckCircle,
  ChevronLeft,
  Clipboard,
  History,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { SUGGESTED_ACTIONS } from '../../lib/agent-chat-actions.ts';
import {
  applyProposal,
  cancelRun,
  getSession,
  rejectProposal,
  startRun,
  streamRunEvents,
} from '../../lib/agent-chat-client.ts';
import { buildAgentChatContext } from '../../lib/agent-chat-context.ts';
import { createAgentChatError, redactDiagnostics } from '../../lib/agent-chat-errors.ts';
import { agentChatReducer } from '../../lib/agent-chat-state.ts';
import { loadSession, saveSession } from '../../lib/agent-chat-storage.ts';
import type {
  AgentChatEvent,
  AgentChatSession,
  AgentConnectionRef,
  AgentEditProposal,
  SelectedElementDescriptor,
  SuggestedAction,
} from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { useInspectorOptional } from '../inspector/inspector-provider.tsx';
import { Button } from '../ui/button.tsx';
import { AuditHistory } from './AuditHistory.tsx';
import { ChatComposer } from './ChatComposer.tsx';
import { ChatMessageList } from './ChatMessageList.tsx';
import { SuggestedActions } from './SuggestedActions.tsx';

interface AgentChatPanelProps {
  onClose: () => void;
  slideId?: string;
  slideContext?: { id: string; title?: string; pageIndex?: number; pageCount?: number };
  selectedElements?: SelectedElementDescriptor[];
  notes?: string;
  seedPrompt?: string;
  collection?: { folderId?: string; deckId?: string; slideIds?: string[] };
}

function createRunFailureEvent(
  runId: string,
  message: string,
  diagnostics?: string,
): AgentChatEvent {
  return {
    sequence: Date.now(),
    runId,
    type: 'failed',
    payload: createAgentChatError('model-failed', message, diagnostics),
    createdAt: new Date().toISOString(),
  };
}

const findCommentAnchor = (line: number): HTMLElement | null => {
  const root = document.querySelector<HTMLElement>('[data-inspector-root]');
  if (!root) return null;
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-slide-loc]'));
  return (
    elements.find((el) => {
      const loc = el.dataset.slideLoc;
      if (!loc) return false;
      const [l] = loc.split(':');
      return Number(l) === line;
    }) || null
  );
};

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  onClose,
  slideId: _slideId,
  slideContext,
  selectedElements,
  notes,
  seedPrompt,
  collection,
}) => {
  const [activeConnection, setActiveConnection] = useState<AgentConnectionRef | null>(null);
  const inspector = useInspectorOptional();
  const [runtimeMode, setRuntimeMode] = useState<'interactive' | 'read-only'>('interactive');
  const [selectedOperationIds, setSelectedOperationIds] = useState<Record<string, string[]>>({});
  const [applyingProps, setApplyingProps] = useState<Record<string, boolean>>({});
  const [settingsRoute, setSettingsRoute] = useState('/settings/connections');
  const [composerPrompt, setComposerPrompt] = useState('');
  const [inlineError, setInlineError] = useState<string | undefined>(undefined);
  const [showAudit, setShowAudit] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'comments'>('chat');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  const [session, dispatch] = useReducer(agentChatReducer, null as unknown as AgentChatSession);
  const streamAbortRef = useRef<(() => void) | null>(null);

  // Load session details from API & LocalStorage
  useEffect(() => {
    let isMounted = true;
    getSession()
      .then((data) => {
        if (!isMounted) return;
        setActiveConnection(data.activeConnection);
        setRuntimeMode(data.runtime.mode);
        setSettingsRoute(data.runtime.settingsRoute);

        // Load or bootstrap local session
        const projectKey = 'proj_default';
        const localSess = loadSession(data.session.id, projectKey);

        const initializedSession: AgentChatSession = localSess || {
          ...data.session,
          projectKey,
          messages: [],
          contextPreferences: [
            {
              id: 'ctx-slide',
              kind: 'current-slide',
              enabled: !collection?.deckId,
              required: !collection?.deckId,
              label: 'Current Slide',
            },
            {
              id: 'ctx-elements',
              kind: 'selected-elements',
              enabled: true,
              required: false,
              label: 'Selected Elements',
            },
            {
              id: 'ctx-theme',
              kind: 'theme',
              enabled: true,
              required: false,
              label: 'Theme',
            },
            {
              id: 'ctx-notes',
              kind: 'speaker-notes',
              enabled: true,
              required: false,
              label: 'Speaker Notes',
            },
            {
              id: 'ctx-deck',
              kind: 'deck',
              enabled: !!collection?.deckId,
              required: !!collection?.deckId,
              label: 'Deck',
            },
            {
              id: 'ctx-folder',
              kind: 'folder',
              enabled: !!collection?.folderId,
              required: false,
              label: 'Folder',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch({
          type: 'SET_SESSION',
          payload: initializedSession,
        });
      })
      .catch((err) => {
        console.error('Failed to bootstrap agent chat session:', err);
      });

    return () => {
      isMounted = false;
      if (streamAbortRef.current) {
        streamAbortRef.current();
      }
    };
  }, [collection?.deckId, collection?.folderId]);

  // Keep storage synchronized
  useEffect(() => {
    if (session) {
      saveSession(session);
    }
  }, [session]);

  // Seed prompt from query param/prop
  useEffect(() => {
    if (session && seedPrompt) {
      setComposerPrompt(seedPrompt);
    }
  }, [session, seedPrompt]);

  useEffect(() => {
    if (!session?.currentRunId || streamAbortRef.current) {
      return;
    }
    const orphanedRun = session.messages.some(
      (message) =>
        message.runId === session.currentRunId &&
        message.role === 'assistant' &&
        ['queued', 'loading', 'streaming'].includes(message.state),
    );
    if (!orphanedRun) {
      return;
    }
    dispatch({
      type: 'RECEIVE_EVENT',
      payload: createRunFailureEvent(
        session.currentRunId,
        'The agent response stream disconnected before it completed.',
      ),
    });
  }, [session?.currentRunId, session?.messages]);

  const handleToggleContext = (id: string) => {
    if (!session) return;
    const updatedPreferences = session.contextPreferences.map((pref) =>
      pref.id === id ? { ...pref, enabled: !pref.enabled } : pref,
    );
    dispatch({
      type: 'SET_CONTEXT_PREFERENCE',
      payload: updatedPreferences,
    });
  };

  const handleSelectSuggestedAction = (action: SuggestedAction) => {
    if (!session) return;
    setComposerPrompt(action.promptTemplate);

    // Automatically enable preferred context kinds for this action
    const updatedPreferences = session.contextPreferences.map((pref) => {
      const shouldEnable = action.defaultContextKinds.includes(pref.kind);
      return { ...pref, enabled: shouldEnable || pref.required };
    });

    dispatch({
      type: 'SET_CONTEXT_PREFERENCE',
      payload: updatedPreferences,
    });
  };

  const handleSendPrompt = async (promptText: string) => {
    if (!session) return;
    setInlineError(undefined);
    try {
      const activePreferences = session.contextPreferences;

      // Build context payload filtering out non-enabled types
      const getsSlide = activePreferences.some((p) => p.kind === 'current-slide' && p.enabled);
      const getsSelection = activePreferences.some(
        (p) => p.kind === 'selected-elements' && p.enabled,
      );
      const getsNotes = activePreferences.some((p) => p.kind === 'speaker-notes' && p.enabled);
      const getsCollection = activePreferences.some(
        (p) => (p.kind === 'deck' || p.kind === 'folder') && p.enabled,
      );

      const builtContext = await buildAgentChatContext({
        project: { name: 'Awesome Slide Project' },
        slide: getsSlide ? slideContext : undefined,
        selection: getsSelection ? selectedElements : undefined,
        notes: getsNotes && notes ? { included: true, currentPage: notes } : undefined,
        collection: getsCollection ? collection : undefined,
      });

      // Clear composer prompt optimistically
      setComposerPrompt('');

      let runId: string;
      try {
        const res = await startRun(
          session.id,
          promptText,
          undefined,
          activePreferences,
          builtContext,
        );
        runId = res.runId;
      } catch (err) {
        // Restore prompt on failure (T090)
        setComposerPrompt(promptText);
        setInlineError(err instanceof Error ? err.message : String(err));
        return;
      }

      dispatch({
        type: 'START_RUN',
        payload: { runId, prompt: promptText },
      });

      // Abort any existing stream subscription
      if (streamAbortRef.current) {
        streamAbortRef.current();
      }

      // Subscribe to SSE events
      const { abort } = streamRunEvents(
        runId,
        (event) => {
          dispatch({ type: 'RECEIVE_EVENT', payload: event });
          if (['completed', 'failed', 'cancelled', 'proposal'].includes(event.type)) {
            streamAbortRef.current = null;
          }
        },
        (err) => {
          console.error('SSE Stream Error:', err);
          dispatch({
            type: 'RECEIVE_EVENT',
            payload: createRunFailureEvent(
              runId,
              'The agent response stream disconnected before it completed.',
              err.message,
            ),
          });
          streamAbortRef.current = null;
        },
      );
      streamAbortRef.current = abort;
    } catch (err) {
      console.error('Failed to start run:', err);
    }
  };

  const handleCancelRun = async () => {
    if (!session?.currentRunId) return;
    const runId = session.currentRunId;
    try {
      await cancelRun(runId);
      dispatch({
        type: 'RECEIVE_EVENT',
        payload: {
          sequence: Date.now(),
          runId,
          type: 'cancelled',
          payload: null,
          createdAt: new Date().toISOString(),
        },
      });
      if (streamAbortRef.current) {
        streamAbortRef.current();
        streamAbortRef.current = null;
      }
    } catch (err) {
      console.error('Failed to cancel run:', err);
    }
  };

  const handleRetryRun = async () => {
    if (!session) return;
    const lastUserMsg = [...session.messages].reverse().find((m) => m.role === 'user');

    if (!lastUserMsg) return;
    setInlineError(undefined);

    try {
      const activePreferences = session.contextPreferences;
      const getsSlide = activePreferences.some((p) => p.kind === 'current-slide' && p.enabled);
      const getsSelection = activePreferences.some(
        (p) => p.kind === 'selected-elements' && p.enabled,
      );
      const getsNotes = activePreferences.some((p) => p.kind === 'speaker-notes' && p.enabled);
      const getsCollection = activePreferences.some(
        (p) => (p.kind === 'deck' || p.kind === 'folder') && p.enabled,
      );

      const freshContext = await buildAgentChatContext({
        project: { name: 'Awesome Slide Project' },
        slide: getsSlide ? slideContext : undefined,
        selection: getsSelection ? selectedElements : undefined,
        notes: getsNotes && notes ? { included: true, currentPage: notes } : undefined,
        collection: getsCollection ? collection : undefined,
      });

      let runId: string;
      try {
        const res = await startRun(
          session.id,
          lastUserMsg.content[0].text || '',
          undefined,
          activePreferences,
          freshContext,
        );
        runId = res.runId;
      } catch (err) {
        setInlineError(err instanceof Error ? err.message : String(err));
        return;
      }

      dispatch({
        type: 'START_RUN',
        payload: {
          runId,
          prompt: lastUserMsg.content[0].text || '',
        },
      });

      if (streamAbortRef.current) {
        streamAbortRef.current();
      }

      const { abort } = streamRunEvents(
        runId,
        (event) => {
          dispatch({ type: 'RECEIVE_EVENT', payload: event });
          if (['completed', 'failed', 'cancelled', 'proposal'].includes(event.type)) {
            streamAbortRef.current = null;
          }
        },
        (err) => {
          console.error('SSE Retry Stream Error:', err);
          dispatch({
            type: 'RECEIVE_EVENT',
            payload: createRunFailureEvent(
              runId,
              'The agent response stream disconnected before it completed.',
              err.message,
            ),
          });
          streamAbortRef.current = null;
        },
      );
      streamAbortRef.current = abort;
    } catch (err) {
      console.error('Failed to retry run:', err);
    }
  };

  // Synchronize incoming proposals to auto-select operations by default
  useEffect(() => {
    if (!session) return;
    let changed = false;
    const nextSelected = { ...selectedOperationIds };
    for (const msg of session.messages) {
      if (msg.state === 'needs-review' && msg.proposalId) {
        if (!nextSelected[msg.proposalId]) {
          const proposalPart = msg.content.find((p) => p.type === 'proposal-summary');
          if (proposalPart?.data) {
            const proposal = proposalPart.data as AgentEditProposal;
            if (proposal.operations) {
              nextSelected[msg.proposalId] = proposal.operations.map((op) => op.id);
              changed = true;
            }
          }
        }
      }
    }
    if (changed) {
      setSelectedOperationIds(nextSelected);
    }
  }, [session, selectedOperationIds]);

  const handleToggleOperation = (proposalId: string, opId: string) => {
    setSelectedOperationIds((prev) => {
      const current = prev[proposalId] || [];
      const next = current.includes(opId)
        ? current.filter((id) => id !== opId)
        : [...current, opId];
      return { ...prev, [proposalId]: next };
    });
  };

  const handleApplyProposal = async (proposalId: string) => {
    const ops = selectedOperationIds[proposalId] || [];
    setApplyingProps((prev) => ({ ...prev, [proposalId]: true }));
    try {
      const res = await applyProposal(proposalId, ops);
      if (res.ok) {
        dispatch({
          type: 'APPLY_PROPOSAL',
          payload: {
            proposalId,
            state: ops.length === res.writtenFiles?.length ? 'applied' : 'partially-applied',
          },
        });

        // T100: Replace full page reload after apply with scoped slide/management refresh recovery and visible transaction feedback
        setAppliedFeedback('Changes applied successfully!');
        setTimeout(() => {
          setAppliedFeedback(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to apply proposal:', err);
    } finally {
      setApplyingProps((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    try {
      const res = await rejectProposal(proposalId);
      if (res.ok) {
        dispatch({
          type: 'REJECT_PROPOSAL',
          payload: { proposalId },
        });
      }
    } catch (err) {
      console.error('Failed to reject proposal:', err);
    }
  };

  const isRunActive = !!session?.currentRunId;
  const lastMessage = session?.messages[session.messages.length - 1];
  const canRetry = !!(lastMessage && lastMessage.state === 'failed');
  const diagnosticsText = session?.messages
    .filter((m) => m.state === 'failed' && m.error?.diagnostics)
    .map((m) => m.error?.diagnostics || '')
    .join('\n');

  const handleCopyDiagnostics = async () => {
    if (!diagnosticsText) return;
    const redacted = redactDiagnostics(diagnosticsText);
    try {
      await navigator.clipboard.writeText(redacted);
    } catch {
      const el = document.createElement('textarea');
      el.value = redacted;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  return (
    <aside
      className="relative w-[440px] h-full border-l border-neutral-200 bg-white flex flex-col shadow-lg z-50 select-none"
      aria-label="Agent Chat Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 bg-neutral-50 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-neutral-800" />
          <h2 className="text-sm font-semibold text-neutral-800 font-sans">Agent Chat</h2>
        </div>

        <div className="flex items-center gap-1">
          {activeConnection && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 border border-neutral-200 select-none"
              title={`Connection status: ${activeConnection.status}`}
            >
              {activeConnection.status === 'ready' ? (
                <Wifi className="h-3 w-3 text-emerald-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span>{activeConnection.displayName}</span>
            </div>
          )}
          {diagnosticsText && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyDiagnostics}
              className="h-8 w-8 hover:bg-neutral-200 text-neutral-500 rounded-lg cursor-pointer"
              aria-label="Copy diagnostics to clipboard"
              title="Copy error diagnostics"
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAudit(true)}
            className="h-8 w-8 hover:bg-neutral-200 text-neutral-500 rounded-lg cursor-pointer"
            aria-label="View Audit History"
            title="View Audit History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-neutral-200 text-neutral-500 rounded-lg cursor-pointer"
            aria-label="Collapse Sidebar"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Selector */}
      {inspector && (
        <div className="flex border-b border-neutral-200 bg-neutral-50/50 select-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-all duration-150 cursor-pointer',
              activeTab === 'chat'
                ? 'border-neutral-900 text-neutral-900 bg-white/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold border-b-2 text-center transition-all duration-150 cursor-pointer',
              activeTab === 'comments'
                ? 'border-neutral-900 text-neutral-900 bg-white/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-600',
            )}
          >
            Comments
          </button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'comments' ? (
        inspector && inspector.comments.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 font-sans bg-neutral-50/30">
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-semibold mb-1">
              <span>
                {inspector.comments.length}{' '}
                {inspector.comments.length === 1 ? 'Comment' : 'Comments'}
              </span>
              {inspector.pendingCount > 0 && (
                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 font-medium animate-pulse">
                  Unsaved edits: {inspector.pendingCount}
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {inspector.comments.map((c) => {
                const isSelected = inspector.selected?.line === c.line;
                return (
                  <div key={c.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const anchor = findCommentAnchor(c.line);
                        if (anchor) {
                          const loc = anchor.dataset.slideLoc || '';
                          const [_, colStr] = loc.split(':');
                          const column = Number(colStr) || 0;
                          if (!inspector.active) {
                            inspector.toggle();
                          }
                          inspector.setSelected({ line: c.line, column, anchor });
                        }
                      }}
                      className={cn(
                        'w-full text-left flex flex-col p-3.5 rounded-xl border text-xs transition-all duration-200 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                        isSelected
                          ? 'bg-blue-50/50 border-blue-200 shadow-xs'
                          : 'bg-white border-neutral-200/70 hover:border-neutral-300 hover:shadow-xs',
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-colors duration-200',
                            isSelected
                              ? 'bg-blue-500'
                              : 'bg-neutral-300 group-hover:bg-neutral-400',
                          )}
                        />
                        <span className="font-mono text-[9px] font-bold text-neutral-500 bg-neutral-100/80 px-1.5 py-0.5 rounded-sm">
                          Line {c.line}
                        </span>
                      </div>
                      <div className="text-neutral-700 leading-relaxed font-sans select-text break-words">
                        {c.note}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        inspector.remove(c.id);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 p-1 hover:bg-neutral-50 rounded transition-all duration-150 cursor-pointer animate-in fade-in duration-100"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-xs text-neutral-400 gap-2 p-6 text-center select-none font-sans">
            <Bot className="h-8 w-8 stroke-[1.5] text-neutral-300" />
            <span className="font-semibold">No comments on this slide.</span>
            <p className="text-[10px] text-neutral-400 leading-normal max-w-[200px]">
              Inspector comments and notes will show up here.
            </p>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Connection Degradation / Warning banner */}
          {activeConnection &&
            activeConnection.status !== 'ready' &&
            activeConnection.status !== 'failed' &&
            activeConnection.status !== 'offline' && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-amber-800 leading-tight flex-1">
                  Connection state is degraded ({activeConnection.status}). Edits may fail.
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await getSession();
                        setActiveConnection(data.activeConnection);
                      } catch (err) {
                        console.error('Failed to retry connection check:', err);
                      }
                    }}
                    className="text-[11px] text-neutral-900 font-semibold underline cursor-pointer bg-transparent border-0"
                  >
                    Retry
                  </button>
                  <a
                    href={settingsRoute}
                    className="text-[11px] text-neutral-900 font-semibold underline flex items-center gap-0.5"
                  >
                    <Settings className="h-3 w-3" />
                    Configure
                  </a>
                </div>
              </div>
            )}

          {/* Failed / Offline connection banner */}
          {activeConnection &&
            (activeConnection.status === 'failed' || activeConnection.status === 'offline') && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <WifiOff className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-[12px] text-red-800 font-medium leading-tight">
                    Agent connection {activeConnection.status === 'offline' ? 'offline' : 'failed'}
                  </span>
                </div>
                <p className="text-[11px] text-red-700 leading-snug">
                  No AI edits can be made until the connection is restored.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={settingsRoute}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-900 underline"
                  >
                    <Settings className="h-3 w-3" />
                    Set up connection
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await getSession();
                        setActiveConnection(data.activeConnection);
                      } catch (err) {
                        console.error('Failed to retry connection check:', err);
                      }
                    }}
                    className="text-[11px] text-red-900 font-semibold underline cursor-pointer bg-transparent border-0"
                  >
                    Retry check
                  </button>
                </div>
              </div>
            )}

          {/* Needs-setup banner */}
          {activeConnection && activeConnection.status === 'needs-setup' && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-blue-800 leading-tight flex-1">
                Agent connection not yet configured.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const data = await getSession();
                      setActiveConnection(data.activeConnection);
                    } catch (err) {
                      console.error('Failed to retry connection check:', err);
                    }
                  }}
                  className="text-[11px] text-blue-900 font-semibold underline cursor-pointer bg-transparent border-0"
                >
                  Retry
                </button>
                <a
                  href={settingsRoute}
                  className="text-[11px] text-blue-900 font-semibold underline flex items-center gap-0.5"
                >
                  <Settings className="h-3 w-3" />
                  Set up
                </a>
              </div>
            </div>
          )}

          {/* Applied Feedback toast */}
          {appliedFeedback && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200 shrink-0">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>{appliedFeedback}</span>
            </div>
          )}

          {/* Message List */}
          {session ? (
            <ChatMessageList
              messages={session.messages}
              selectedOperationIds={selectedOperationIds}
              applyingProps={applyingProps}
              onToggleOperation={handleToggleOperation}
              onApplyProposal={handleApplyProposal}
              onRejectProposal={handleRejectProposal}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-500 select-none font-sans">
              Loading session...
            </div>
          )}

          {/* Suggested Actions */}
          {session && runtimeMode === 'interactive' && !isRunActive && (
            <SuggestedActions
              actions={SUGGESTED_ACTIONS.filter((action) => {
                if (action.scope === 'selection') {
                  return !!selectedElements && selectedElements.length > 0;
                }
                if (action.scope === 'deck') {
                  return !!collection?.deckId;
                }
                return true;
              })}
              onSelect={handleSelectSuggestedAction}
              disabled={isRunActive}
            />
          )}

          {/* Composer */}
          {runtimeMode === 'interactive' ? (
            <ChatComposer
              onSend={handleSendPrompt}
              onCancel={handleCancelRun}
              onRetry={handleRetryRun}
              isRunActive={isRunActive}
              canRetry={canRetry}
              value={composerPrompt}
              onChange={setComposerPrompt}
              inlineError={inlineError}
              preferences={session?.contextPreferences || []}
              onTogglePreference={handleToggleContext}
            />
          ) : (
            <div className="p-4 border-t border-neutral-200 bg-neutral-100 text-center text-xs text-neutral-500 font-medium shrink-0">
              Chat is in read-only mode for static builds.
            </div>
          )}
        </div>
      )}

      {/* Audit History Panel overlay */}
      {showAudit && <AuditHistory onClose={() => setShowAudit(false)} />}
    </aside>
  );
};
