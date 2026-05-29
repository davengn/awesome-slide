import { Check, Loader2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { validateManualAgentPath } from '@/lib/agent-connection-client';
import type { ManualAgentPath, ValidationResult } from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';

type ManualAgentPathFormProps = {
  initialFocus?: boolean;
  onActivate: (manualPath: ManualAgentPath) => void;
};

export function ManualAgentPathForm({ initialFocus, onActivate }: ManualAgentPathFormProps) {
  const [input, setInput] = useState('');
  const [kind, setKind] = useState<ManualAgentPath['kind']>('command');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [manualPath, setManualPath] = useState<ManualAgentPath | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!input.trim()) {
      setError('Path or command is required.');
      return;
    }
    setError(null);
    setLoading(true);
    setValidation(null);
    setManualPath(null);

    try {
      const res = await validateManualAgentPath({ input, kind });
      setValidation(res.validation);
      if (res.manualPath) {
        setManualPath(res.manualPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (manualPath) {
      onActivate(manualPath);
    }
  };

  const isSaveable = validation && (validation.status === 'pass' || validation.status === 'warn');

  return (
    <div className="grid gap-4 rounded-[8px] border border-hairline bg-background p-4">
      <div>
        <h4 className="text-[13px] font-semibold text-foreground">Specify agent path</h4>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Point to a custom agent binary, command or project folder.
        </p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ManualAgentPath['kind']);
              setValidation(null);
              setManualPath(null);
            }}
            className="h-9 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <option value="command">Runnable command (in PATH)</option>
            <option value="executable">Executable file path</option>
            <option value="project-path">Project directory path</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Path or Command</span>
          <div className="flex gap-2">
            <input
              type="text"
              data-agent-settings-focus={initialFocus ? 'manual-path' : undefined}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setValidation(null);
                setManualPath(null);
                setError(null);
              }}
              placeholder={
                kind === 'command'
                  ? 'e.g. claude or codex'
                  : kind === 'executable'
                    ? 'e.g. C:\\Users\\Name\\bin\\agent.exe'
                    : 'e.g. D:\\Projects\\my-agent-folder'
              }
              className="h-9 flex-1 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/35"
            />
            <button
              type="button"
              onClick={handleValidate}
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-[7px] border border-hairline bg-background px-4 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Validate
            </button>
          </div>
        </label>
      </div>

      {error && (
        <p className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      )}

      {validation && (
        <div
          className={cn(
            'grid gap-2 rounded-[6px] border px-3 py-2.5 text-[12.5px]',
            validation.status === 'pass' && 'border-green-600/20 bg-green-600/5 text-green-700',
            validation.status === 'warn' && 'border-yellow-600/25 bg-yellow-600/5 text-yellow-700',
            validation.status === 'fail' &&
              'border-destructive/20 bg-destructive/5 text-destructive',
          )}
          role="alert"
        >
          <div className="flex items-start gap-2">
            {validation.status === 'pass' ? (
              <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
            ) : (
              <ShieldAlert
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  validation.status === 'warn' ? 'text-yellow-600' : 'text-destructive',
                )}
              />
            )}
            <div className="min-w-0">
              <span className="font-semibold block capitalize">Validation {validation.status}</span>
              <span className="block mt-0.5 leading-relaxed">{validation.message}</span>
              {validation.version && (
                <span className="block mt-0.5 font-mono text-[11px] opacity-80">
                  Version: {validation.version}
                </span>
              )}
            </div>
          </div>

          {validation.diagnostics && (
            <pre className="mt-2 max-h-[120px] overflow-y-auto rounded border border-hairline bg-muted/30 p-2 font-mono text-[11px] leading-normal text-muted-foreground">
              {validation.diagnostics}
            </pre>
          )}
        </div>
      )}

      {isSaveable && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-9 items-center justify-center rounded-[7px] bg-brand px-4 text-[12.5px] font-semibold text-brand-foreground shadow-edge outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            Activate Connection
          </button>
        </div>
      )}
    </div>
  );
}
