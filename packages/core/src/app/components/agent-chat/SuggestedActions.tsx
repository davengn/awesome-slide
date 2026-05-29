import type React from 'react';
import type { SuggestedAction } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onSelect: (action: SuggestedAction) => void;
  disabled?: boolean;
}

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({
  actions,
  onSelect,
  disabled = false,
}) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-neutral-200 bg-white flex flex-col gap-1.5 select-none">
      <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
        Suggested Actions
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => {
          const isHighRisk = action.riskLevel === 'high';
          const isMediumRisk = action.riskLevel === 'medium';

          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(action)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-all duration-150',
                isHighRisk
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800'
                  : isMediumRisk
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:text-amber-900'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900',
                disabled &&
                  'opacity-50 cursor-not-allowed hover:bg-neutral-50 hover:text-neutral-700',
              )}
              title={`${action.label} (${action.riskLevel} risk)`}
            >
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
