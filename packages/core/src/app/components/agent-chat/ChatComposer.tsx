import {
  AlertCircle,
  Paperclip,
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ContextPreference } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { Button } from '../ui/button.tsx';
import { Textarea } from '../ui/textarea.tsx';

interface ChatComposerProps {
  onSend: (prompt: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  isRunActive: boolean;
  canRetry: boolean;
  cancellationCapable?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  inlineError?: string;
  preferences?: ContextPreference[];
  onTogglePreference?: (id: string) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onCancel,
  onRetry,
  isRunActive,
  canRetry,
  cancellationCapable = true,
  placeholder = 'Describe the design you want — paste or drop images, or @ a file...',
  value,
  onChange,
  inlineError,
  preferences = [],
  onTogglePreference,
}) => {
  const [internalPrompt, setInternalPrompt] = useState('');
  const prompt = value !== undefined ? value : internalPrompt;
  const setPrompt = onChange !== undefined ? onChange : setInternalPrompt;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  const handleSend = () => {
    if (!prompt.trim() || isRunActive) return;
    onSend(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Adjust height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
    // Reference prompt to trigger height recalculation on content change
    if (prompt) {
    }
  }, [prompt]);

  const handlePaperclipClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Count active optional context preferences
  const activePreferencesCount = preferences.filter((p) => p.enabled && !p.required).length;

  return (
    <section
      className="border-t border-neutral-200 p-4 bg-neutral-50/90 backdrop-blur-sm flex flex-col gap-2 shrink-0 select-none"
      aria-label="Chat Composer"
    >
      {/* Inline Errors */}
      {inlineError && (
        <div
          className="flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-2 animate-in fade-in slide-in-from-bottom-1 duration-150 mb-1"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="font-medium truncate">{inlineError}</span>
        </div>
      )}

      {/* Main Rounded Input Box Container */}
      <div className="border border-neutral-200 hover:border-neutral-300 focus-within:border-neutral-400 focus-within:shadow-md transition-all duration-200 rounded-2xl bg-white flex flex-col overflow-hidden">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              const attachmentText = ` [Attachment: ${file.name}]`;
              setPrompt(prompt ? `${prompt}${attachmentText}` : `[Attachment: ${file.name}] `);
            }
          }}
        />

        {/* Textarea Input */}
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-[48px] max-h-[140px] resize-none border-0 focus:ring-0 focus-visible:ring-0 shadow-none px-4 pt-3.5 pb-2 text-xs font-sans placeholder:text-neutral-400/90 bg-transparent text-neutral-800 leading-relaxed"
          disabled={isRunActive}
          aria-label="Agent Prompt Input"
        />

        {/* Context Preferences Selector (Inline inside the box) */}
        {showPreferences && preferences && preferences.length > 0 && (
          <div className="px-4 py-2 border-t border-neutral-100/60 flex flex-wrap gap-1.5 bg-neutral-50/50 transition-all duration-200">
            {preferences.map((pref) => {
              const isToggleable = !pref.required && !isRunActive;
              const isEnabled = pref.enabled;
              return (
                <button
                  key={pref.id}
                  type="button"
                  disabled={!isToggleable}
                  onClick={() => isToggleable && onTogglePreference?.(pref.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-155 focus:outline-none cursor-pointer select-none',
                    isEnabled
                      ? 'bg-neutral-900 text-white border border-neutral-900 shadow-sm'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800',
                    pref.required &&
                      'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed',
                    isRunActive && 'opacity-60 cursor-not-allowed',
                  )}
                  title={pref.required ? `${pref.label} (Required)` : `Toggle ${pref.label}`}
                >
                  <span className="truncate">{pref.label}</span>
                  {pref.required && (
                    <span className="text-[8px] px-1 bg-neutral-200 text-neutral-500 rounded">
                      Req
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-2.5 border-t border-neutral-100/60 bg-white">
          {/* Left: Settings & Attachments */}
          <div className="flex items-center gap-1">
            {/* Sliders settings button */}
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className={cn(
                'p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-all duration-150 relative cursor-pointer focus:outline-none border-0 bg-transparent',
                showPreferences && 'text-neutral-900 bg-neutral-50',
              )}
              title="Context preferences"
              aria-label="Toggle context preferences"
            >
              <SlidersHorizontal className="h-4 w-4 stroke-[2]" />
              {activePreferencesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white leading-none scale-[0.85] shadow-sm select-none">
                  {activePreferencesCount}
                </span>
              )}
            </button>

            {/* Paperclip attachments button */}
            <button
              type="button"
              onClick={handlePaperclipClick}
              disabled={isRunActive}
              className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl transition-all duration-150 cursor-pointer focus:outline-none border-0 bg-transparent"
              title="Attach files (simulated)"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4 stroke-[2]" />
            </button>
          </div>

          {/* Right: Send / Cancel Action */}
          <div>
            {isRunActive && cancellationCapable ? (
              <Button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-150 cursor-pointer font-semibold text-xs border border-red-200 shadow-sm"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Cancel</span>
              </Button>
            ) : isRunActive ? (
              <div className="flex items-center gap-1.5 px-4 py-1.5 text-neutral-400 text-xs font-medium">
                <span>Running...</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleSend}
                disabled={!prompt.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 rounded-xl transition-all duration-150 cursor-pointer font-semibold text-xs shadow-sm"
              >
                <SendHorizontal className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Send</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcut & Helper Text */}
      <span className="text-[10px] text-neutral-400 mt-2 font-medium font-sans select-none text-center block w-full tracking-wide">
        ⌘/Ctrl + Enter to send · paste images · @ to reference files
      </span>

      {/* Retry indicator */}
      {!isRunActive && canRetry && onRetry && (
        <div className="flex justify-end mt-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-[10px] font-semibold py-1 h-6 px-2.5 rounded-lg border-neutral-300 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 hover:border-neutral-400 cursor-pointer transition-all duration-150"
          >
            <RotateCcw className="h-3 w-3 stroke-[2]" />
            Retry last run
          </Button>
        </div>
      )}
    </section>
  );
};
