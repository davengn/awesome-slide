import { Loader2 } from 'lucide-react';
import type React from 'react';
import type { RunState } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';

interface RunStatusCardProps {
  state: RunState;
  className?: string;
}

export const RunStatusCard: React.FC<RunStatusCardProps> = ({ state, className }) => {
  const getStatusText = () => {
    switch (state) {
      case 'queued':
        return 'Waiting in queue...';
      case 'loading':
        return 'Analyzing slide layout and workspace...';
      case 'streaming':
        return 'Streaming agent edits...';
      case 'needs-review':
        return 'Changes proposed. Ready for review.';
      default:
        return 'Processing...';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border p-2.5 text-[11px] font-sans transition-all duration-200 select-none bg-neutral-100/30 border-neutral-200/40 text-neutral-600',
        state === 'streaming' && 'bg-indigo-50/40 border-indigo-100/30 text-indigo-700',
        state === 'loading' && 'bg-amber-50/40 border-amber-100/30 text-amber-700/90',
        className,
      )}
    >
      <Loader2
        className={cn(
          'h-3.5 w-3.5 animate-spin text-neutral-400',
          state === 'streaming' && 'text-indigo-500',
          state === 'loading' && 'text-amber-500',
        )}
      />
      <span className="font-semibold">{getStatusText()}</span>
    </div>
  );
};
