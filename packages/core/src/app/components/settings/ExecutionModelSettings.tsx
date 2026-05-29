import { Loader2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import type {
  AgentConnectionSettingsConnection,
  LocalAgentCandidate,
  ManualAgentPath,
  ProviderRegistryEntry,
  ScanDirectory,
  SettingsModalState,
} from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';
import { ByokProviderForm } from './ByokProviderForm';
import { LocalAgentCard } from './LocalAgentCard';
import { ManualAgentPathForm } from './ManualAgentPathForm';
import { ProviderIcon } from './ProviderIcon';

type ExecutionModelSettingsProps = {
  initialFocus?: SettingsModalState['initialFocus'];
  executionTab: SettingsModalState['executionTab'];
  scanState?: SettingsModalState['scanState'];
  providers: ProviderRegistryEntry[];
  connections: AgentConnectionSettingsConnection[];
  candidates: LocalAgentCandidate[];
  approvedDirectories: ScanDirectory[];
  activeConnectionId?: string;
  validationErrors?: Record<string, string>;
  executionTabLabel: string;
  onExecutionTabChange: (tab: SettingsModalState['executionTab']) => void;
  onRequestRescan?: () => void;
  onRequestCancelScan?: () => void;
  onAddApprovedDirectory: (path: string) => void;
  onRemoveApprovedDirectory: (id: string) => void;
  onActivateCandidate: (candidateId: string) => void;
  onActivateManualPath: (manualPath: ManualAgentPath) => void;
  onActivateByok: (request: {
    provider: string;
    modelId: string;
    apiKey?: string;
    envVarName?: string;
    displayName: string;
  }) => Promise<void>;
  onTestConnection: (id: string) => Promise<void>;
  onDeleteConnection: (id: string, deleteCredential?: boolean) => Promise<void>;
  onSetActiveConnection: (id: string) => Promise<void>;
};

export function ExecutionModelSettings({
  initialFocus,
  executionTab,
  scanState = 'idle',
  providers,
  connections,
  candidates,
  approvedDirectories,
  activeConnectionId,
  validationErrors = {},
  executionTabLabel,
  onExecutionTabChange,
  onRequestRescan,
  onRequestCancelScan,
  onAddApprovedDirectory,
  onRemoveApprovedDirectory,
  onActivateCandidate,
  onActivateManualPath,
  onActivateByok,
  onTestConnection,
  onDeleteConnection,
  onSetActiveConnection,
}: ExecutionModelSettingsProps) {
  const localProviders = providers.filter((provider) => provider.type === 'local-agent');
  const apiProviders = providers.filter((provider) => provider.type === 'api-provider');

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
          initialFocus={initialFocus}
          connections={connections}
          candidates={candidates}
          approvedDirectories={approvedDirectories}
          activeConnectionId={activeConnectionId}
          scanState={scanState}
          scanError={validationErrors.scan}
          onRequestRescan={onRequestRescan}
          onRequestCancelScan={onRequestCancelScan}
          onAddApprovedDirectory={onAddApprovedDirectory}
          onRemoveApprovedDirectory={onRemoveApprovedDirectory}
          onActivateCandidate={onActivateCandidate}
          onActivateManualPath={onActivateManualPath}
        />
      ) : (
        <ByokPanel
          initialFocus={initialFocus}
          providers={apiProviders}
          connections={connections}
          activeConnectionId={activeConnectionId}
          onActivateByok={onActivateByok}
          onTestConnection={onTestConnection}
          onDeleteConnection={onDeleteConnection}
          onSetActiveConnection={onSetActiveConnection}
        />
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

type LocalCliPanelProps = {
  initialFocus?: SettingsModalState['initialFocus'];
  connections: AgentConnectionSettingsConnection[];
  candidates: LocalAgentCandidate[];
  approvedDirectories: ScanDirectory[];
  activeConnectionId?: string;
  scanState: SettingsModalState['scanState'];
  scanError?: string;
  onRequestRescan?: () => void;
  onRequestCancelScan?: () => void;
  onAddApprovedDirectory: (path: string) => void;
  onRemoveApprovedDirectory: (id: string) => void;
  onActivateCandidate: (candidateId: string) => void;
  onActivateManualPath: (manualPath: ManualAgentPath) => void;
};

function LocalCliPanel({
  initialFocus,
  connections,
  candidates,
  approvedDirectories,
  activeConnectionId,
  scanState,
  scanError,
  onRequestRescan,
  onRequestCancelScan,
  onAddApprovedDirectory,
  onRemoveApprovedDirectory,
  onActivateCandidate,
  onActivateManualPath,
}: LocalCliPanelProps) {
  const configuredCount = connections.filter(
    (connection) => connection.type !== 'api-key-provider',
  ).length;

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
          {scanState === 'scanning' ? (
            <button
              type="button"
              onClick={onRequestCancelScan}
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-destructive/20 bg-destructive/5 px-3 text-[12.5px] font-medium text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <X className="size-3.5" aria-hidden />
              Cancel Scan
            </button>
          ) : (
            <button
              type="button"
              data-agent-settings-focus="auto-scan"
              onClick={onRequestRescan}
              className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/35"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Rescan
            </button>
          )}
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

      {scanState === 'scanning' && (
        <div className="flex items-center gap-2.5 rounded-[8px] border border-hairline bg-muted/20 px-3 py-3 text-[12.5px] text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-brand" />
          Scanning for local agent installations...
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {candidates.map((candidate) => {
          // Check if candidate matches any connection. We match by comparing command/aliases or id prefixes.
          const isSelected = connections.some(
            (c) => c.id === activeConnectionId && c.agentCommandAlias === candidate.command,
          );

          return (
            <LocalAgentCard
              key={candidate.id}
              candidate={candidate}
              selected={isSelected}
              onClick={() => onActivateCandidate(candidate.id)}
            />
          );
        })}
      </div>

      {candidates.length === 0 && scanState !== 'scanning' && (
        <div className="text-center py-6 border border-dashed border-hairline rounded-[8px] text-[12.5px] text-muted-foreground">
          No agent candidates detected yet. Click Rescan to discover local agents.
        </div>
      )}

      {/* Approved Scan Directories */}
      <div className="rounded-[8px] border border-hairline bg-muted/25 p-3 grid gap-3">
        <div>
          <h4 className="text-[12.5px] font-semibold text-foreground">Approved Scan Directories</h4>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Awesome Slide will search these custom folders during rescan. Bounded scan only.
          </p>
        </div>

        {approvedDirectories.length > 0 && (
          <ul className="grid gap-1.5">
            {approvedDirectories.map((dir) => (
              <li
                key={dir.id}
                className="flex items-center justify-between gap-3 rounded-[6px] border border-hairline bg-background px-2.5 py-1.5 text-[12px]"
              >
                <span className="truncate font-mono text-foreground">{dir.pathLabel}</span>
                <button
                  type="button"
                  onClick={() => onRemoveApprovedDirectory(dir.id)}
                  className="text-destructive hover:underline font-semibold"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            id="add-directory-input"
            placeholder="e.g. C:\Users\Name\my-agents"
            className="h-8 flex-1 rounded-[6px] border border-hairline bg-background px-2.5 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.currentTarget;
                if (target.value.trim()) {
                  onAddApprovedDirectory(target.value.trim());
                  target.value = '';
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('add-directory-input') as HTMLInputElement;
              if (input?.value.trim()) {
                onAddApprovedDirectory(input.value.trim());
                input.value = '';
              }
            }}
            className="inline-flex h-8 items-center justify-center rounded-[6px] border border-hairline bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
          >
            Add
          </button>
        </div>
      </div>

      {/* Manual Path Form */}
      <ManualAgentPathForm
        initialFocus={initialFocus === 'manual-path'}
        onActivate={onActivateManualPath}
      />

      <div className="rounded-[8px] border border-hairline bg-muted/35 px-3 py-2 text-[12px] text-muted-foreground">
        Configured local connections: {configuredCount}
      </div>
    </section>
  );
}

function ByokPanel({
  initialFocus,
  providers,
  connections,
  activeConnectionId,
  onActivateByok,
  onTestConnection,
  onDeleteConnection,
  onSetActiveConnection,
}: {
  initialFocus?: SettingsModalState['initialFocus'];
  providers: ProviderRegistryEntry[];
  connections: AgentConnectionSettingsConnection[];
  activeConnectionId?: string;
  onActivateByok: (request: {
    provider: string;
    modelId: string;
    apiKey?: string;
    envVarName?: string;
    displayName: string;
  }) => Promise<void>;
  onTestConnection: (id: string) => Promise<void>;
  onDeleteConnection: (id: string, deleteCredential?: boolean) => Promise<void>;
  onSetActiveConnection: (id: string) => Promise<void>;
}) {
  const byokConnections = connections.filter((c) => c.type === 'api-key-provider');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteCredential, setDeleteCredential] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const deletingConnection = byokConnections.find((connection) => connection.id === deletingId);

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteConnection(deletingId, deleteCredential);
      setDeletingId(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    await onTestConnection(id);
    setTestingId(null);
  };

  return (
    <section aria-labelledby="byok-heading" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="byok-heading" className="text-[13px] font-semibold text-foreground">
            BYOK (Bring Your Own Key)
          </h3>
          <p className="mt-1 max-w-[38rem] text-[12.5px] leading-relaxed text-muted-foreground">
            API keys stay outside project files. Stored by reference in your user profile.
          </p>
        </div>
      </div>

      {/* Configured Connections List */}
      {byokConnections.length > 0 && (
        <div className="grid gap-2">
          <h4 className="text-[12.5px] font-semibold text-foreground font-medium">
            Configured Connections
          </h4>
          <div className="grid gap-2">
            {byokConnections.map((conn) => {
              const isActive = conn.id === activeConnectionId;
              const isTesting = testingId === conn.id;

              return (
                <div
                  key={conn.id}
                  className={cn(
                    'grid min-h-[66px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[8px] border bg-background px-3 py-2.5 transition-all duration-200',
                    isActive ? 'border-brand/70 bg-muted/10 shadow-edge' : 'border-hairline',
                  )}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-muted">
                    <ProviderIcon providerId={conn.provider} className="size-4" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-semibold text-foreground">
                        {conn.displayName}
                      </span>
                      {isActive && (
                        <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="capitalize">{conn.provider}</span>
                      <span>•</span>
                      <span>{conn.modelId}</span>
                      {conn.lastTestedAt && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            Tested {new Date(conn.lastTestedAt).toLocaleTimeString()}
                          </span>
                        </>
                      )}
                    </div>
                    {conn.status.state !== 'ready' && (
                      <div className="mt-1 flex items-start gap-1 text-[11px] text-destructive">
                        <span className="font-medium">Error:</span>
                        <span>{conn.status.message || 'Verification failed.'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onSetActiveConnection(conn.id)}
                        className="inline-flex h-8 items-center justify-center rounded-[6px] border border-hairline bg-background px-2.5 text-[11px] font-medium text-foreground hover:bg-muted"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isTesting}
                      onClick={() => handleTest(conn.id)}
                      className="inline-flex h-8 items-center justify-center rounded-[6px] border border-hairline bg-background px-2.5 text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="size-3 animate-spin" /> : 'Test'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(conn.id)}
                      className="inline-flex h-8 items-center justify-center rounded-[6px] border border-destructive/20 bg-destructive/5 px-2.5 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal/Overlay inline */}
      {deletingId && (
        <div className="rounded-[8px] border border-destructive/20 bg-destructive/5 p-3 grid gap-3">
          <div>
            <h4 className="text-[12.5px] font-semibold text-destructive">
              Confirm Connection Deletion
            </h4>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              Remove {deletingConnection?.displayName ?? 'this connection'}?
              {deletingConnection?.credential
                ? ` Credential: ${deletingConnection.provider} (${deletingConnection.credential.displayHint}).`
                : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={deleteCredential}
              onChange={(e) => setDeleteCredential(e.target.checked)}
              className="rounded border-hairline text-brand outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
            <span>Also delete the stored API key/credential from local storage</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="inline-flex h-8 items-center justify-center rounded-[6px] border border-hairline bg-background px-3 text-[11.5px] font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="inline-flex h-8 items-center justify-center rounded-[6px] bg-destructive px-3 text-[11.5px] font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Connection
            </button>
          </div>
        </div>
      )}

      {/* BYOK Provider Form */}
      <ByokProviderForm
        initialFocus={initialFocus === 'byok-provider'}
        providers={providers}
        onActivate={onActivateByok}
      />

      <div className="rounded-[8px] border border-hairline bg-muted/35 px-3 py-2 text-[12px] text-muted-foreground">
        Configured API connections: {byokConnections.length}
      </div>
    </section>
  );
}
