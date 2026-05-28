import { Bot, Settings, Wifi, WifiOff, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useReducer, useRef, useState } from 'react';
import { cancelRun, getSession, startRun, streamRunEvents } from '../../lib/agent-chat-client.ts';
import { agentChatReducer } from '../../lib/agent-chat-state.ts';
import { loadSession, saveSession } from '../../lib/agent-chat-storage.ts';
import type { AgentChatSession, AgentConnectionRef } from '../../lib/agent-chat-types.ts';
import { Button } from '../ui/button.tsx';
import { ChatComposer } from './ChatComposer.tsx';
import { ChatMessageList } from './ChatMessageList.tsx';

interface AgentChatPanelProps {
  onClose: () => void;
  slideId?: string;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ onClose, slideId: _slideId }) => {
  const [activeConnection, setActiveConnection] = useState<AgentConnectionRef | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<'interactive' | 'read-only'>('interactive');
  const [settingsRoute, setSettingsRoute] = useState('/settings/connections');

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
          contextPreferences: [],
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
  }, []);

  // Keep storage synchronized
  useEffect(() => {
    if (session) {
      saveSession(session);
    }
  }, [session]);

  const handleSendPrompt = async (prompt: string) => {
    if (!session) return;
    try {
      const activePreferences = session.contextPreferences;
      const res = await startRun(session.id, prompt, undefined, activePreferences);

      dispatch({
        type: 'START_RUN',
        payload: { runId: res.runId, prompt },
      });

      // Abort any existing stream subscription
      if (streamAbortRef.current) {
        streamAbortRef.current();
      }

      // Subscribe to SSE events
      const { abort } = streamRunEvents(
        res.runId,
        (event) => {
          dispatch({ type: 'RECEIVE_EVENT', payload: event });
        },
        (err) => {
          console.error('SSE Stream Error:', err);
        },
      );
      streamAbortRef.current = abort;
    } catch (err) {
      console.error('Failed to start run:', err);
    }
  };

  const handleCancelRun = async () => {
    if (!session?.currentRunId) return;
    try {
      await cancelRun(session.currentRunId);
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

    try {
      const res = await startRun(
        session.id,
        lastUserMsg.content[0].text || '',
        undefined,
        session.contextPreferences,
      );

      dispatch({
        type: 'START_RUN',
        payload: {
          runId: res.runId,
          prompt: lastUserMsg.content[0].text || '',
        },
      });

      if (streamAbortRef.current) {
        streamAbortRef.current();
      }

      const { abort } = streamRunEvents(
        res.runId,
        (event) => {
          dispatch({ type: 'RECEIVE_EVENT', payload: event });
        },
        (err) => {
          console.error('SSE Retry Stream Error:', err);
        },
      );
      streamAbortRef.current = abort;
    } catch (err) {
      console.error('Failed to retry run:', err);
    }
  };

  const isRunActive = !!session?.currentRunId;
  const lastMessage = session?.messages[session.messages.length - 1];
  const canRetry = !!(lastMessage && lastMessage.state === 'failed');

  return (
    <aside
      className="w-[380px] h-full border-l border-neutral-200 bg-white flex flex-col shadow-lg z-50 select-none"
      aria-label="Agent Chat Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 bg-neutral-50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-neutral-800" />
          <h2 className="text-sm font-semibold text-neutral-800">Agent Chat</h2>
        </div>

        <div className="flex items-center gap-1">
          {activeConnection && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 border border-neutral-200"
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-neutral-200 text-neutral-500"
            aria-label="Close Chat Panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Degradation / Warning banner */}
      {activeConnection && activeConnection.status !== 'ready' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-amber-800 leading-tight">
            Connection state is degraded ({activeConnection.status}). Edits may fail.
          </span>
          <a
            href={settingsRoute}
            className="text-[11px] text-neutral-900 font-semibold underline flex items-center gap-0.5"
          >
            <Settings className="h-3 w-3" />
            Configure
          </a>
        </div>
      )}

      {/* Message List */}
      {session ? (
        <ChatMessageList messages={session.messages} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
          Loading session...
        </div>
      )}

      {/* Composer */}
      {runtimeMode === 'interactive' ? (
        <ChatComposer
          onSend={handleSendPrompt}
          onCancel={handleCancelRun}
          onRetry={handleRetryRun}
          isRunActive={isRunActive}
          canRetry={canRetry}
        />
      ) : (
        <div className="p-4 border-t border-neutral-200 bg-neutral-100 text-center text-xs text-neutral-500 font-medium">
          Chat is in read-only mode for static builds.
        </div>
      )}
    </aside>
  );
};
