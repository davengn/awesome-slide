import { Bot, Loader2, User } from 'lucide-react';
import type React from 'react';
import type { AgentChatMessage } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { ScrollArea } from '../ui/scroll-area.tsx';

interface ChatMessageListProps {
  messages: AgentChatMessage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages }) => {
  return (
    <ScrollArea className="flex-1 p-4" aria-live="polite">
      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-neutral-500 py-8">
            No conversation history. Send a message to start chatting with the agent.
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3 max-w-[85%] rounded-lg p-3 text-sm leading-relaxed transition-all duration-200',
                  isUser
                    ? 'self-end bg-neutral-900 text-white rounded-br-none'
                    : 'self-start bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-bl-none',
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isUser ? (
                    <User className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <Bot className="h-4 w-4 text-neutral-600" />
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full overflow-hidden">
                  {message.content.map((part) => {
                    const partKey = `${part.type}-${part.text || ''}`;
                    if (part.type === 'text' && part.text) {
                      return (
                        <p key={partKey} className="whitespace-pre-wrap breakdown-words">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type === 'progress' && part.text) {
                      return (
                        <div
                          key={partKey}
                          className="flex items-center gap-2 text-xs text-neutral-500 italic animate-pulse"
                        >
                          <Loader2
                            className="h-3 w-3 animate-spin text-neutral-400"
                            aria-hidden="true"
                          />
                          <span>{part.text}</span>
                        </div>
                      );
                    }
                    if (part.type === 'proposal-summary' && part.text) {
                      return (
                        <div
                          key={partKey}
                          className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-md flex flex-col gap-2"
                        >
                          <div className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                            Proposed Changes
                          </div>
                          <div className="text-xs text-neutral-600">{part.text}</div>
                        </div>
                      );
                    }
                    return null;
                  })}

                  {message.state === 'queued' && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 italic">
                      <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
                      <span>Queued...</span>
                    </div>
                  )}

                  {message.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                      <p className="font-semibold">{message.error.message}</p>
                      {message.error.diagnostics && (
                        <pre className="mt-1 overflow-x-auto text-[10px] bg-red-100 p-1.5 rounded text-red-800">
                          {message.error.diagnostics}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
};
