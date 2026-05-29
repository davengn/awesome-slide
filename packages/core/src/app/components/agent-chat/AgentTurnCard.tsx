import { AlertCircle, Bot, Loader2, User } from 'lucide-react';
import type React from 'react';
import type { AgentChatMessage, AgentEditProposal, RunState } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { FilesFromTurn } from './FilesFromTurn.tsx';
import { ProposalControls } from './ProposalControls.tsx';
import { ProposalPreview } from './ProposalPreview.tsx';
import { RunStatusCard } from './RunStatusCard.tsx';

interface AgentTurnCardProps {
  message: AgentChatMessage;
  selectedOperationIds: Record<string, string[]>;
  applyingProps: Record<string, boolean>;
  onToggleOperation: (proposalId: string, opId: string) => void;
  onApplyProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
}

export const AgentTurnCard: React.FC<AgentTurnCardProps> = ({
  message,
  selectedOperationIds,
  applyingProps,
  onToggleOperation,
  onApplyProposal,
  onRejectProposal,
}) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'group flex flex-col gap-2 rounded-xl p-3 text-xs leading-relaxed transition-all duration-200 hover:shadow-sm border',
        isUser
          ? 'self-end bg-neutral-900 text-white border-neutral-800 max-w-[85%] rounded-br-none'
          : 'self-start bg-neutral-50/70 border-neutral-200/60 text-neutral-900 rounded-bl-none w-full',
      )}
    >
      {/* Title / Header of the Turn Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium text-[10px] text-neutral-400 select-none">
          {isUser ? (
            <>
              <User className="h-3 w-3 stroke-[2.5]" />
              <span>You</span>
            </>
          ) : (
            <>
              <Bot className="h-3 w-3 stroke-[2.5] text-neutral-500" />
              <span>Agent</span>
            </>
          )}
        </div>
        <span className="text-[9px] text-neutral-400 select-none">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Main body of the turn card */}
      <div className="flex flex-col gap-3 overflow-hidden">
        {message.content.map((part, index) => {
          const partKey = `${part.type}-${index}`;
          if (part.type === 'text' && part.text) {
            return (
              <p key={partKey} className="whitespace-pre-wrap break-words font-sans text-xs">
                {part.text}
              </p>
            );
          }
          if (part.type === 'progress' && part.text) {
            return (
              <div
                key={partKey}
                className="flex items-center gap-2 text-[11px] text-neutral-500 bg-neutral-100/50 border border-neutral-200/40 rounded-lg p-2 animate-pulse"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                <span className="font-medium font-sans">{part.text}</span>
              </div>
            );
          }
          if (part.type === 'proposal-summary' && part.data) {
            const proposal = part.data as AgentEditProposal;
            const pId = proposal.id;
            const selOps = selectedOperationIds[pId] || [];
            const isApplying = applyingProps[pId] || false;

            return (
              <div key={partKey} className="flex flex-col gap-2.5 mt-1">
                {/* Files from turn tray */}
                <FilesFromTurn proposal={proposal} />

                {/* Proposal validation, diffs, and preview */}
                <div className="border border-neutral-200/70 rounded-xl overflow-hidden bg-white shadow-sm">
                  <ProposalPreview
                    proposal={proposal}
                    selectedOperationIds={selOps}
                    onToggleOperation={(opId) => onToggleOperation(pId, opId)}
                  />
                  <ProposalControls
                    proposal={proposal}
                    selectedOperationIds={selOps}
                    isApplying={isApplying}
                    onApply={() => onApplyProposal(pId)}
                    onReject={() => onRejectProposal(pId)}
                  />
                </div>
              </div>
            );
          }
          if (part.type === 'proposal-summary' && part.text) {
            return (
              <div
                key={partKey}
                className="mt-1 p-2.5 bg-neutral-100 border border-neutral-200/50 rounded-lg flex flex-col gap-1.5"
              >
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
                  Proposed Changes
                </span>
                <p className="text-xs text-neutral-700">{part.text}</p>
              </div>
            );
          }
          return null;
        })}

        {/* Queued indicator */}
        {message.state === 'queued' && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 italic bg-neutral-100/40 border border-neutral-200/30 rounded-lg p-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
            <span>Queued...</span>
          </div>
        )}

        {/* Failed / Error display */}
        {message.error && (
          <div className="mt-1 p-3 bg-red-50/70 border border-red-200/60 text-red-700 text-xs rounded-xl flex gap-2">
            <AlertCircle className="h-4 w-4 stroke-[2] shrink-0 mt-0.5 text-red-500" />
            <div className="flex flex-col gap-1 w-full overflow-hidden">
              <span className="font-semibold text-red-900">{message.error.message}</span>
              {message.error.diagnostics && (
                <pre className="mt-1 overflow-x-auto text-[10px] font-mono bg-red-100/60 p-2 rounded-lg text-red-800 leading-normal max-h-40">
                  {message.error.diagnostics}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Compact Run Status Card when loading or streaming */}
        {!isUser && ['loading', 'streaming'].includes(message.state) && (
          <RunStatusCard state={message.state as RunState} />
        )}
      </div>
    </div>
  );
};
