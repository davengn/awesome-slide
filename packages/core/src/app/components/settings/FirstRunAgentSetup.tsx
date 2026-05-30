import { Clock3, FolderSearch, KeyRound, Route, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FirstRunAgentSetupAction = 'auto-scan' | 'manual-path' | 'byok' | 'do-later';

type FirstRunAgentSetupProps = {
  pending?: boolean;
  error?: string | null;
  onAction: (action: FirstRunAgentSetupAction, triggerId: string) => void;
};

const FIRST_RUN_ACTIONS: Array<{
  action: FirstRunAgentSetupAction;
  label: string;
  detail: string;
  icon: typeof FolderSearch;
  tone: string;
}> = [
  {
    action: 'auto-scan',
    label: 'Auto-scan local agents',
    detail: 'PATH and known locations',
    icon: FolderSearch,
    tone: 'bg-[#111827] text-[#21d19f]',
  },
  {
    action: 'manual-path',
    label: 'Specify agent path',
    detail: 'Executable, command, or project',
    icon: Route,
    tone: 'bg-[#d36b4f] text-white',
  },
  {
    action: 'byok',
    label: 'Use BYOK provider',
    detail: 'API key model provider',
    icon: KeyRound,
    tone: 'bg-[#6b5fd8] text-white',
  },
  {
    action: 'do-later',
    label: 'Do later',
    detail: 'Keep managing slides',
    icon: Clock3,
    tone: 'bg-muted text-muted-foreground',
  },
];

export function FirstRunAgentSetup({ pending = false, error, onAction }: FirstRunAgentSetupProps) {
  return (
    <aside
      className="grid gap-3 rounded-[8px] border border-brand/25 bg-background px-3 py-3 shadow-edge md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-4"
      aria-labelledby="agent-first-run-title"
    >
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-brand/10 text-brand">
          <TerminalSquare className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="agent-first-run-title" className="text-[13px] font-semibold text-foreground">
            Connect an agent for prompt-based slide work
          </h2>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Choose local CLI, manual path, or BYOK. Slide management stays available without setup.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-2 rounded-[7px] border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FIRST_RUN_ACTIONS.map((item) => {
          const Icon = item.icon;
          const triggerId = `first-run-${item.action}`;
          return (
            <button
              key={item.action}
              id={triggerId}
              type="button"
              disabled={pending && item.action === 'do-later'}
              onClick={() => onAction(item.action, triggerId)}
              className="grid min-h-[56px] min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-hairline bg-muted/35 px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <span
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-[6px]',
                  item.tone,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-foreground">
                  {item.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {item.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
