import { Check, LogOut, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ActiveConnectionSnapshot } from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';
import { ProviderIcon } from './ProviderIcon';

export interface QuickConnectionSwitcherProps {
  activeConnection: ActiveConnectionSnapshot | null;
  connections: ActiveConnectionSnapshot[];
  onSetActiveConnection: (id: string, modelId?: string, reasoningEffort?: string) => Promise<void>;
  onRescan: () => Promise<void>;
  onOpenFullSettings: () => void;
  onBackToProjects: () => void;
}

export function QuickConnectionSwitcher({
  activeConnection,
  connections,
  onSetActiveConnection,
  onRescan,
  onOpenFullSettings,
  onBackToProjects,
}: QuickConnectionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeMode, setActiveMode] = useState<'local-cli' | 'byok'>(
    activeConnection?.type === 'api-provider' ? 'byok' : 'local-cli',
  );

  useEffect(() => {
    if (activeConnection) {
      setActiveMode(activeConnection.type === 'api-provider' ? 'byok' : 'local-cli');
    }
  }, [activeConnection]);

  const localConnections = connections.filter(
    (c) => c.type === 'local-agent' || c.type === 'manual-agent',
  );

  const handleModeChange = async (mode: 'local-cli' | 'byok') => {
    setActiveMode(mode);
    if (mode === 'local-cli') {
      const firstLocal = connections.find(
        (c) => c.type === 'local-agent' || c.type === 'manual-agent',
      );
      if (firstLocal) {
        await onSetActiveConnection(firstLocal.connectionId);
      }
    } else {
      const firstByok = connections.find((c) => c.type === 'api-provider');
      if (firstByok) {
        await onSetActiveConnection(firstByok.connectionId);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Agent connection settings"
          title="Agent connection settings"
          className={cn(
            'flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
            open && 'bg-muted text-foreground',
          )}
        >
          <SettingsIcon className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] p-0 font-sans border border-border bg-popover text-popover-foreground shadow-floating rounded-[10px] overflow-hidden select-none"
      >
        {/* Active connection header */}
        <div className="bg-muted/40 px-4 py-3.5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Connection
            </span>
            <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          {activeConnection ? (
            <div className="mt-1.5 flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-[6px] bg-muted border border-border/40">
                <ProviderIcon providerId={activeConnection.provider} className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                  {activeConnection.displayName}
                </div>
                <div className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                  {activeConnection.modelOrAgent}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 text-[12.5px] text-muted-foreground italic">
              No connection selected
            </div>
          )}
        </div>

        {/* Mode toggle / segmented buttons */}
        <div className="p-3 border-b border-border/60">
          <div className="grid grid-cols-2 rounded-[8px] bg-muted p-0.5 border border-border/20">
            <button
              type="button"
              onClick={() => handleModeChange('local-cli')}
              className={cn(
                'rounded-[6px] py-1.5 text-center text-[12px] font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                activeMode === 'local-cli'
                  ? 'bg-background text-foreground shadow-edge'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Use Local CLI
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('byok')}
              className={cn(
                'rounded-[6px] py-1.5 text-center text-[12px] font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                activeMode === 'byok'
                  ? 'bg-background text-foreground shadow-edge'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Use API (BYOK)
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-h-[220px] overflow-y-auto p-3">
          {activeMode === 'local-cli' ? (
            <div className="grid gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                Code Agent
              </span>
              {localConnections.length > 0 ? (
                <div className="grid gap-1">
                  {localConnections.map((conn) => {
                    const isSelected = activeConnection?.connectionId === conn.connectionId;
                    return (
                      <button
                        key={conn.connectionId}
                        type="button"
                        onClick={() => onSetActiveConnection(conn.connectionId)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2.5 px-2 py-2 rounded-[7px] text-left border transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                          isSelected
                            ? 'bg-brand/10 border-brand/40 text-brand font-semibold'
                            : 'bg-transparent border-transparent text-foreground hover:bg-muted/50 hover:border-border/30',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex size-6 items-center justify-center rounded-[5px] bg-muted/60">
                            <ProviderIcon providerId={conn.provider} className="size-3.5" />
                          </span>
                          <span className="truncate text-[12px]">{conn.displayName}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-[12px] text-muted-foreground italic">
                  No local agents configured.
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                Model Settings
              </span>

              {activeConnection && activeConnection.type === 'api-provider' ? (
                <div className="grid gap-2.5 px-1">
                  {/* Model ID Dropdown */}
                  {activeConnection.availableModels && (
                    <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
                      <span>Model ID</span>
                      <select
                        value={activeConnection.modelId || ''}
                        onChange={(e) =>
                          onSetActiveConnection(
                            activeConnection.connectionId,
                            e.target.value,
                            activeConnection.reasoningEffort,
                          )
                        }
                        className="h-8 w-full rounded-[6px] border border-border bg-background px-2 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                      >
                        {activeConnection.availableModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* Reasoning Effort Dropdown */}
                  {activeConnection.availableReasoningEfforts && (
                    <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
                      <span>Reasoning Effort</span>
                      <select
                        value={activeConnection.reasoningEffort || 'medium'}
                        onChange={(e) =>
                          onSetActiveConnection(
                            activeConnection.connectionId,
                            activeConnection.modelId,
                            e.target.value,
                          )
                        }
                        className="h-8 w-full rounded-[6px] border border-border bg-background px-2 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                      >
                        {activeConnection.availableReasoningEfforts.map((effort) => (
                          <option key={effort} value={effort}>
                            {effort}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-[12px] text-muted-foreground italic">
                  No API connection active.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border/60 bg-muted/20 p-2 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={async () => {
              setScanning(true);
              try {
                await onRescan();
              } finally {
                setScanning(false);
              }
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-[6px] border border-border/30 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <RefreshCw className={cn('size-3.5', scanning && 'animate-spin text-brand')} />
            <span className="mt-1 text-[10px] font-medium">Rescan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenFullSettings();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-[6px] border border-border/30 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <SettingsIcon className="size-3.5" />
            <span className="mt-1 text-[10px] font-medium">Settings</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onBackToProjects();
            }}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-[6px] border border-border/30 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <LogOut className="size-3.5" />
            <span className="mt-1 text-[10px] font-medium">Back</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
