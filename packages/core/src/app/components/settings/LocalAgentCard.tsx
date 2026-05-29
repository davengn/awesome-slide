import { Check, ShieldAlert } from 'lucide-react';
import type { LocalAgentCandidate } from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';
import { ProviderIcon } from './ProviderIcon';

type LocalAgentCardProps = {
  candidate: LocalAgentCandidate;
  selected: boolean;
  onClick: () => void;
};

export function LocalAgentCard({ candidate, selected, onClick }: LocalAgentCardProps) {
  const isInstalled = candidate.status === 'installed';
  const isNotInstalled = candidate.status === 'not-installed';
  const isIncompatible = candidate.status === 'incompatible';
  const needsManualPath = candidate.status === 'needs-manual-path';

  let statusText = 'not installed';
  if (isInstalled) statusText = candidate.version ? `v${candidate.version}` : 'installed';
  else if (isIncompatible) statusText = 'incompatible';
  else if (needsManualPath) statusText = 'needs manual path';

  const sourceLabel =
    candidate.source === 'path'
      ? 'System PATH'
      : candidate.source === 'known-location'
        ? 'Default install'
        : candidate.source === 'approved-directory'
          ? 'Approved dir'
          : 'Project metadata';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'grid min-h-[66px] w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px] border bg-background px-3 py-2 text-left transition-all duration-200 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/35',
        selected ? 'border-brand/70 shadow-edge bg-muted/20' : 'border-hairline',
        isNotInstalled && 'opacity-65',
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-muted">
        <ProviderIcon providerId={candidate.provider} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-foreground">
          {candidate.displayName}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span
            className={cn(
              'truncate text-[11px] font-medium leading-none',
              isInstalled ? 'text-brand' : 'text-muted-foreground',
            )}
          >
            {statusText}
          </span>
          <span className="text-[10px] text-muted-foreground/60">•</span>
          <span className="truncate text-[10.5px] text-muted-foreground">{sourceLabel}</span>
        </span>
      </span>
      <span className="flex items-center justify-center shrink-0 min-w-[20px]">
        {selected && <Check className="size-4 text-brand" aria-label="selected" />}
        {isIncompatible && (
          <ShieldAlert className="size-4 text-destructive" aria-label="incompatible" />
        )}
      </span>
    </button>
  );
}
