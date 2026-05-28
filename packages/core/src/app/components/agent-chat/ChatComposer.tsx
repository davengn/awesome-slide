import { RotateCcw, Send, StopCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button.tsx';
import { Textarea } from '../ui/textarea.tsx';

interface ChatComposerProps {
  onSend: (prompt: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  isRunActive: boolean;
  canRetry: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onCancel,
  onRetry,
  isRunActive,
  canRetry,
  placeholder = 'Ask the agent to edit this slide...',
  value,
  onChange,
}) => {
  const [internalPrompt, setInternalPrompt] = useState('');
  const prompt = value !== undefined ? value : internalPrompt;
  const setPrompt = onChange !== undefined ? onChange : setInternalPrompt;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!prompt.trim() || isRunActive) return;
    onSend(prompt.trim());
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Adjust height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  return (
    <div className="border-t border-neutral-200 p-4 bg-neutral-50 flex flex-col gap-2">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isRunActive}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none py-2 px-3 text-sm border-neutral-300 rounded-md focus:border-neutral-900 focus:ring-0"
        />

        {isRunActive ? (
          <Button
            type="button"
            onClick={onCancel}
            variant="destructive"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            aria-label="Cancel active run"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSend}
            disabled={!prompt.trim()}
            size="icon"
            className="h-10 w-10 flex-shrink-0 bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-200"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {canRetry && onRetry && !isRunActive && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs py-1 h-7 border-neutral-300 text-neutral-600 hover:text-neutral-900"
          >
            <RotateCcw className="h-3 w-3" />
            Retry last run
          </Button>
        </div>
      )}
    </div>
  );
};
