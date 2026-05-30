import type React from 'react';
import type { AgentChatMessage } from '../../lib/agent-chat-types.ts';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { AgentTurnCard } from './AgentTurnCard.tsx';

interface ChatMessageListProps {
  messages: AgentChatMessage[];
  selectedOperationIds: Record<string, string[]>;
  applyingProps: Record<string, boolean>;
  onToggleOperation: (proposalId: string, opId: string) => void;
  onApplyProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  selectedOperationIds,
  applyingProps,
  onToggleOperation,
  onApplyProposal,
  onRejectProposal,
}) => {
  return (
    <ScrollArea className="flex-1 min-h-0 p-4" aria-live="polite">
      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-neutral-400 py-12 select-none font-sans">
            No conversation history. Send a message to start chatting with the agent.
          </div>
        ) : (
          messages.map((message) => (
            <AgentTurnCard
              key={message.id}
              message={message}
              selectedOperationIds={selectedOperationIds}
              applyingProps={applyingProps}
              onToggleOperation={onToggleOperation}
              onApplyProposal={onApplyProposal}
              onRejectProposal={onRejectProposal}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
};
