import { Check, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { testAgentCredentials } from '@/lib/agent-connection-client';
import type { ProviderRegistryEntry } from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';

type ByokProviderFormProps = {
  initialFocus?: boolean;
  providers: ProviderRegistryEntry[];
  onActivate: (request: {
    provider: string;
    modelId: string;
    apiKey?: string;
    envVarName?: string;
    displayName: string;
  }) => Promise<void>;
};

export function ByokProviderForm({ initialFocus, providers, onActivate }: ByokProviderFormProps) {
  const apiProviders = providers.filter((p) => p.type === 'api-provider');

  const [providerId, setProviderId] = useState(apiProviders[0]?.id ?? 'openai');
  const [modelId, setModelId] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState('');
  const [authType, setAuthType] = useState<'key' | 'env'>('key');
  const [apiKey, setApiKey] = useState('');
  const [envVarName, setEnvVarName] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ state: string; message?: string } | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProvider = apiProviders.find((p) => p.id === providerId);

  useEffect(() => {
    if (selectedProvider) {
      const defaultModel = selectedProvider.defaultModels?.[0] ?? '';
      setModelId(defaultModel);
      setIsCustomModel(false);
      setCustomModelId('');
      if (selectedProvider.keyHint) {
        setEnvVarName(selectedProvider.keyHint);
      }
    }
  }, [selectedProvider]);

  const handleTest = async () => {
    setError(null);
    setSuccess(false);
    setTestStatus(null);
    setStorageWarning(null);

    const activeModel = isCustomModel ? customModelId.trim() : modelId;
    if (!activeModel) {
      setError('Model identifier is required.');
      return;
    }

    if (authType === 'key' && !apiKey.trim()) {
      setError('API Key is required.');
      return;
    }

    if (authType === 'env' && !envVarName.trim()) {
      setError('Environment variable name is required.');
      return;
    }

    setTesting(true);

    try {
      const res = await testAgentCredentials({
        provider: providerId,
        apiKey: authType === 'key' ? apiKey.trim() : undefined,
        envVarName: authType === 'env' ? envVarName.trim() : undefined,
        modelId: activeModel,
      });

      setTestStatus(res.status);
      if (res.status.state === 'failed') {
        if (res.status.category === 'secure-storage-unavailable') {
          setStorageWarning(
            'Secure storage is unavailable on this platform/configuration. Raw API keys cannot be saved locally.',
          );
        } else {
          setError(res.status.message || 'Verification failed.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setTestStatus(null);
    setStorageWarning(null);

    const activeModel = isCustomModel ? customModelId.trim() : modelId;
    if (!activeModel) {
      setError('Model identifier is required.');
      return;
    }

    if (authType === 'key' && !apiKey.trim()) {
      setError('API Key is required.');
      return;
    }

    if (authType === 'env' && !envVarName.trim()) {
      setError('Environment variable name is required.');
      return;
    }

    setLoading(true);

    try {
      const displayName = `${selectedProvider?.displayName ?? providerId} (${activeModel})`;
      await onActivate({
        provider: providerId,
        modelId: activeModel,
        apiKey: authType === 'key' ? apiKey.trim() : undefined,
        envVarName: authType === 'env' ? envVarName.trim() : undefined,
        displayName,
      });
      setSuccess(true);
      setApiKey('');
      setError(null);
    } catch (err: any) {
      if (err?.category === 'secure-storage-unavailable') {
        setStorageWarning(
          'Secure storage is unavailable on this platform/configuration. Raw API keys cannot be saved locally.',
        );
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-[8px] border border-hairline bg-background p-4"
    >
      <div>
        <h4 className="text-[13px] font-semibold text-foreground">Add BYOK Provider</h4>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Configure a hosted API provider. Credentials stay outside project files.
        </p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Provider</span>
          <select
            data-agent-settings-focus={initialFocus ? 'byok-provider' : undefined}
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              setError(null);
            }}
            className="h-9 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            {apiProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Model</span>
          <div className="grid gap-2">
            {!isCustomModel ? (
              <div className="flex gap-2">
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="h-9 flex-1 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                >
                  {selectedProvider?.defaultModels?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCustomModel(true)}
                  className="inline-flex h-9 items-center justify-center rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] font-medium text-foreground hover:bg-muted"
                >
                  Custom...
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder="e.g. claude-3-5-sonnet-latest"
                  className="h-9 flex-1 rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomModel(false)}
                  className="inline-flex h-9 items-center justify-center rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] font-medium text-foreground hover:bg-muted"
                >
                  Select Default
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-1.5 text-[12px] font-medium text-foreground">
          <span>Authentication</span>
          <div className="grid grid-cols-2 rounded-[7px] bg-muted p-0.5">
            <button
              type="button"
              onClick={() => {
                setAuthType('key');
                setError(null);
              }}
              className={cn(
                'rounded-[5px] py-1 text-center text-[12px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                authType === 'key'
                  ? 'bg-background text-foreground shadow-edge'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              API Key
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthType('env');
                setError(null);
              }}
              className={cn(
                'rounded-[5px] py-1 text-center text-[12px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
                authType === 'env'
                  ? 'bg-background text-foreground shadow-edge'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Env Variable
            </button>
          </div>
        </div>

        {authType === 'key' && (
          <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
            <span>API Key</span>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Pasted API Key"
                className="h-9 w-full rounded-[7px] border border-hairline bg-background pl-3 pr-10 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Stored securely in your local user profile folder. Never committed to git.
            </span>
          </label>
        )}

        {authType === 'env' && (
          <label className="grid gap-1.5 text-[12px] font-medium text-foreground">
            <span>Environment Variable Name</span>
            <input
              type="text"
              value={envVarName}
              onChange={(e) => setEnvVarName(e.target.value)}
              placeholder="e.g. OPENAI_API_KEY"
              className="h-9 w-full rounded-[7px] border border-hairline bg-background px-3 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            />
            <span className="text-[11px] text-muted-foreground">
              References the environment variable from your dev server runtime shell.
            </span>
          </label>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-[12px] text-destructive" role="alert">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {storageWarning && (
        <div className="flex items-start gap-1.5 text-[12px] text-yellow-600" role="alert">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{storageWarning}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-1.5 text-[12px] text-green-600" role="alert">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          <span>BYOK Connection configured successfully.</span>
        </div>
      )}

      {testStatus && testStatus.state === 'ready' && (
        <div
          className="flex flex-col gap-1.5 rounded-[7px] border border-green-200 bg-green-50/20 p-3 text-[12.5px] text-green-700"
          role="alert"
        >
          <div className="flex items-start gap-1.5 font-medium">
            <Check className="mt-0.5 size-3.5 shrink-0" />
            <span>Connection verified successfully.</span>
          </div>
          {testStatus.message && (
            <pre className="mt-1 max-h-32 overflow-y-auto rounded-[5px] border border-green-200 bg-green-50/50 p-2 font-mono text-[11px] whitespace-pre-wrap text-green-800">
              {testStatus.message}
            </pre>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={loading || testing}
          onClick={handleTest}
          className="inline-flex h-9 items-center justify-center rounded-[7px] border border-hairline bg-background px-4 text-[12.5px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {testing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Test Connection
        </button>
        <button
          type="submit"
          disabled={loading || testing}
          className="inline-flex h-9 items-center justify-center rounded-[7px] bg-brand px-4 text-[12.5px] font-semibold text-brand-foreground shadow-edge outline-none hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring/35 disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Save Connection
        </button>
      </div>
    </form>
  );
}
