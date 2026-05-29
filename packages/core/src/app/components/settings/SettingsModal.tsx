import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getAgentConnectionSettings } from '@/lib/agent-connection-client';
import { SETTINGS_MODAL_ACCESSIBILITY_CONTRACT } from '@/lib/agent-connection-state';
import type {
  AgentConnectionsSettingsResponse,
  SettingsModalCloseReason,
  SettingsModalState,
} from '@/lib/agent-connection-types';
import { getProviderRegistry } from '@/lib/agent-connections';
import { ExecutionModelSettings } from './ExecutionModelSettings';
import { PlaceholderSettingsSection, SettingsNav } from './SettingsNav';

type SettingsSection = SettingsModalState['activeSection'];

type SettingsModalProps = {
  open: boolean;
  activeSection: SettingsSection;
  executionTab: SettingsModalState['executionTab'];
  scanState?: SettingsModalState['scanState'];
  validationErrors?: Record<string, string>;
  returnFocusTo?: string;
  onOpenChange: (open: boolean, reason?: SettingsModalCloseReason) => void;
  onSectionChange: (section: SettingsSection) => void;
  onExecutionTabChange: (tab: SettingsModalState['executionTab']) => void;
  onViewportWidthChange?: (width: number) => void;
  onRequestRescan?: () => void;
};

export function SettingsModal({
  open,
  activeSection,
  executionTab,
  scanState,
  validationErrors = {},
  returnFocusTo,
  onOpenChange,
  onSectionChange,
  onExecutionTabChange,
  onViewportWidthChange,
  onRequestRescan,
}: SettingsModalProps) {
  const [settings, setSettings] = useState<AgentConnectionsSettingsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const closeReasonRef = useRef<SettingsModalCloseReason>('programmatic');
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
    wasOpenRef.current = true;
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenRef.current) return;
    wasOpenRef.current = false;
    window.setTimeout(() => {
      const target = returnFocusTo ? document.getElementById(returnFocusTo) : null;
      (target ?? lastActiveElementRef.current)?.focus();
    }, 0);
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (!open || !import.meta.env.DEV) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getAgentConnectionSettings()
      .then((response) => {
        if (!cancelled) setSettings(response);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setSettings(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !onViewportWidthChange) return;
    const update = () => onViewportWidthChange(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, onViewportWidthChange]);

  const providers = useMemo(() => settings?.providers ?? getProviderRegistry(), [settings]);
  const liveMessage =
    loadError ?? Object.values(validationErrors).find((message) => message.trim().length > 0) ?? '';

  const requestClose = (reason: SettingsModalCloseReason) => {
    closeReasonRef.current = reason;
    onOpenChange(false, reason);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        requestClose(closeReasonRef.current);
        closeReasonRef.current = 'programmatic';
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-labelledby={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.titleId}
        aria-describedby={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.descriptionId}
        onEscapeKeyDown={() => {
          closeReasonRef.current = 'escape';
        }}
        onPointerDownOutside={() => {
          closeReasonRef.current = 'backdrop';
        }}
        className="grid h-[min(860px,calc(100dvh-1rem))] w-[min(1040px,calc(100vw-1rem))] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[10px] p-0"
      >
        <DialogHeader className="border-b border-hairline px-5 py-4 pr-14">
          <p className="text-[10.5px] font-semibold uppercase text-brand">Settings</p>
          <DialogTitle
            id={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.titleId}
            className="text-[20px] font-semibold tracking-normal"
          >
            Execution &amp; model
          </DialogTitle>
          <DialogDescription
            id={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.descriptionId}
            className="max-w-[42rem] text-[12.5px] leading-relaxed"
          >
            Choose between Local CLI and BYOK. API keys are stored outside project files.
          </DialogDescription>
          <button
            type="button"
            onClick={() => requestClose('close-button')}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-background text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
            aria-label={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.closeLabel}
            title={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.closeLabel}
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogHeader>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
          <SettingsNav
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            ariaLabel={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.navLabel}
          />
          <main className="min-h-0 overflow-y-auto bg-background px-4 py-4 md:px-6 md:py-5">
            <div
              id={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.liveRegionId}
              className="sr-only"
              role="status"
              aria-live="polite"
            >
              {liveMessage}
            </div>
            {loadError && (
              <p
                className="mb-4 rounded-[8px] border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-destructive"
                role="alert"
              >
                {loadError}
              </p>
            )}
            {loading && !settings ? (
              <div className="grid min-h-[260px] place-items-center rounded-[8px] border border-hairline bg-muted/35">
                <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading settings
                </div>
              </div>
            ) : activeSection === 'execution-model' ? (
              <ExecutionModelSettings
                executionTab={executionTab}
                scanState={scanState}
                providers={providers}
                connections={settings?.connections ?? []}
                activeConnectionId={settings?.activeConnectionId}
                validationErrors={validationErrors}
                executionTabLabel={SETTINGS_MODAL_ACCESSIBILITY_CONTRACT.executionTabLabel}
                onExecutionTabChange={onExecutionTabChange}
                onRequestRescan={onRequestRescan}
              />
            ) : (
              <PlaceholderSettingsSection section={activeSection} />
            )}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
