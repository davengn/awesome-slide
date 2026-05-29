import { Check, KeyRound, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import type {
  AgentConnectionConfig,
  ProviderRegistryEntry,
  SettingsModalState,
} from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';
import { ProviderIcon } from './ProviderIcon';

type ExecutionModelSettingsProps = {
  executionTab: SettingsModalState['executionTab'];
  scanState?: SettingsModalState['scanState'];
  providers: ProviderRegistryEntry[];
  connections: AgentConnectionConfig[];
  activeConnectionId?: string;
  validationErrors?: Record<string, string>;
  executionTabLabel: string;
  onExecutionTabChange: (tab: SettingsModalState['executionTab']) => void;
  onRequestRescan?: () => void;
};

export function ExecutionModelSettings({
  executionTab,
  scanState = 'idle',
  providers,
  connections,
  activeConnectionId,
  validationErrors = {},
  executionTabLabel,
  onExecutionTabChange,
  onRequestRescan,
}: ExecutionModelSettingsProps) {
  const localProviders = providers.filter((provider) => provider.type === 'local-agent');
  const apiProviders = providers.filter((provider) => provider.type === 'api-provider');
  const activeConnection = connections.find((connection) => connection.id === activeConnectionId);

  return (
    <div className="grid gap-5">
      <fieldset className="grid grid-cols-2 rounded-[10px] bg-muted p-1">
        <legend className="sr-only">{executionTabLabel}</legend>
        <SegmentButton
          active={executionTab === 'local-cli'}
          label="Local CLI"
          detail={`${localProviders.length} available`}
          onClick={() => onExecutionTabChange('local-cli')}
        />
        <SegmentButton
          active={executionTab === 'byok'}
          label="BYOK"
          detail="API provider"
          onClick={() => onExecutionTabChange('byok')}
        />
      </fieldset>

      {executionTab === 'local-cli' ? (
        <LocalCliPanel
          providers={localProviders}
          configuredCount={
            connections.filter((connection) => connection.type !== 'api-key-provider').length
          }
          activeConnectionName={activeConnection?.displayName}
          scanState={scanState}
          scanError={validationErrors.scan}
          onRequestRescan={onRequestRescan}
        />
      ) : (
        <ByokShell providers={apiProviders} />
      )}
    </div>
  );
}

function SegmentButton({
  active,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'grid min-h-14 min-w-0 place-items-start justify-stretch rounded-[8px] px-4 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/35',
        active
          ? 'bg-background text-foreground shadow-edge'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className="truncate text-[13px] font-semibold leading-tight">{label}</span>
      <span className="mt-1 truncate text-[11.5px] leading-tight text-muted-foreground">
        {detail}
      </span>
    </button>
  );
}

function LocalCliPanel({
  providers,
  configuredCount,
  activeConnectionName,
  scanState,
  scanError,
  onRequestRescan,
}: {
  providers: ProviderRegistryEntry[];
  configuredCount: number;
  activeConnectionName?: string;
  scanState: SettingsModalState['scanState'];
  scanError?: string;
  onRequestRescan?: () => void;
}) {
  return (
    <section aria-labelledby="local-cli-heading" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="local-cli-heading" className="text-[13px] font-semibold text-foreground">
            Local CLI
          </h3>
          <p className="mt-1 max-w-[38rem] text-[12.5px] leading-relaxed text-muted-foreground">
            Detected agents appear here after a user-approved scan. Manual setup stays available.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={!activeConnectionName}
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] font-medium text-foreground outline-none hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <Zap className="size-3.5" aria-hidden />
            Test
          </button>
          <button
            type="button"
            onClick={onRequestRescan}
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <RefreshCw
              className={cn('size-3.5', scanState === 'scanning' && 'animate-spin')}
              aria-hidden
            />
            Rescan
          </button>
        </div>
      </div>

      {scanError && (
        <p
          className="rounded-[7px] border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
          role="alert"
        >
          {scanError}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {providers.slice(0, 8).map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            selected={activeConnectionName === provider.displayName}
          />
        ))}
      </div>

      <div className="rounded-[8px] border border-hairline bg-muted/35 px-3 py-2 text-[12px] text-muted-foreground">
        Configured local connections: {configuredCount}
      </div>
    </section>
  );
}

function ProviderCard({
  provider,
  selected,
}: {
  provider: ProviderRegistryEntry;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        'grid min-h-[62px] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px] border bg-background px-3 py-2',
        selected ? 'border-brand/70 shadow-edge' : 'border-hairline',
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-muted">
        <ProviderIcon providerId={provider.id} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-foreground">
          {provider.displayName}
        </span>
        <span className="mt-0.5 block truncate text-[11px] italic text-muted-foreground">
          not installed
        </span>
      </span>
      {selected && <Check className="size-4 text-brand" aria-label="selected" />}
    </div>
  );
}

function ByokShell({ providers }: { providers: ProviderRegistryEntry[] }) {
  const firstProvider = providers[0];
  const defaultModel = firstProvider?.defaultModels?.[0] ?? '';

  return (
    <section aria-labelledby="byok-heading" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="byok-heading" className="text-[13px] font-semibold text-foreground">
            BYOK
          </h3>
          <p className="mt-1 max-w-[38rem] text-[12.5px] leading-relaxed text-muted-foreground">
            API keys stay outside project files. This shell is ready for provider validation.
          </p>
        </div>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-hairline bg-muted/40 px-2.5 text-[11.5px] text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden />
          credential reference only
        </span>
      </div>

      <div className="grid gap-3 rounded-[8px] border border-hairline bg-background p-3">
        <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Provider</span>
          <select
            value={firstProvider?.id ?? ''}
            disabled
            className="h-9 rounded-[7px] border border-hairline bg-muted/50 px-3 text-[12.5px] text-muted-foreground outline-none"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Model</span>
          <select
            value={defaultModel}
            disabled
            className="h-9 rounded-[7px] border border-hairline bg-muted/50 px-3 text-[12.5px] text-muted-foreground outline-none"
          >
            {firstProvider?.defaultModels?.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>API key</span>
          <div className="flex h-9 items-center gap-2 rounded-[7px] border border-hairline bg-muted/50 px-3 text-[12.5px] text-muted-foreground">
            <KeyRound className="size-3.5" aria-hidden />
            Stored by credential reference
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="grid min-h-[58px] grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 rounded-[8px] border border-hairline bg-muted/35 px-3 py-2"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-[7px] bg-background">
              <ProviderIcon providerId={provider.id} className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-foreground">
                {provider.displayName}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {provider.keyHint ?? 'API key'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
