import type React from 'react';
import type { ContextPreference } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';

interface ContextChipsProps {
  preferences: ContextPreference[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export const ContextChips: React.FC<ContextChipsProps> = ({
  preferences,
  onToggle,
  disabled = false,
}) => {
  if (!preferences || preferences.length === 0) return null;

  return (
    <div className="px-4 py-2 bg-neutral-50/50 border-b border-neutral-200/80 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto select-none">
      {preferences.map((pref) => {
        const isToggleable = !pref.required && !disabled;
        const isEnabled = pref.enabled;

        return (
          <button
            key={pref.id}
            type="button"
            disabled={!isToggleable}
            onClick={() => isToggleable && onToggle(pref.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              // Active / Enabled state
              isEnabled
                ? 'bg-neutral-900 text-white shadow-sm border border-neutral-900 focus-visible:ring-neutral-900'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-950 focus-visible:ring-neutral-200',
              // Required state
              pref.required &&
                'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed',
              // Disabled wrapper state
              disabled && 'opacity-60 cursor-not-allowed hover:bg-white hover:text-neutral-600',
            )}
            title={pref.required ? `${pref.label} (Required context)` : `Toggle ${pref.label}`}
          >
            <span className="truncate max-w-[120px]">{pref.label}</span>
            {pref.required && (
              <span className="text-[9px] px-1 bg-neutral-200 text-neutral-600 rounded">Req</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
