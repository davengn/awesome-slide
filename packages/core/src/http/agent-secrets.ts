import type {
  ApiProviderCredential,
  ApiProviderId,
  ConnectionStatus,
} from '../app/lib/agent-connection-types.ts';
import { createConnectionStatus } from '../app/lib/agent-connections.ts';

export interface CredentialStorageAdapter {
  kind: 'os-credential-store';
  isAvailable: () => Promise<boolean> | boolean;
  setSecret: (ref: string, secret: string) => Promise<void> | void;
  getSecret: (ref: string) => Promise<string | null> | string | null;
  deleteSecret: (ref: string) => Promise<void> | void;
}

export type CredentialReferenceResult =
  | { ok: true; credential: ApiProviderCredential }
  | { ok: false; status: ConnectionStatus };

export function createMemoryCredentialStorageAdapter(
  opts: { available?: boolean } = {},
): CredentialStorageAdapter {
  const secrets = new Map<string, string>();
  const available = opts.available ?? true;
  return {
    kind: 'os-credential-store',
    isAvailable: () => available,
    setSecret: (ref, secret) => {
      secrets.set(ref, secret);
    },
    getSecret: (ref) => secrets.get(ref) ?? null,
    deleteSecret: (ref) => {
      secrets.delete(ref);
    },
  };
}

function safeDisplayHint(secret: string): string {
  if (secret.length <= 8) return 'saved key';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

function credentialRef(provider: ApiProviderId): string {
  return `cred_${provider}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCredentialReference(
  input: {
    provider: ApiProviderId;
    apiKey?: string;
    envVarName?: string;
    displayHint?: string;
  },
  adapter?: CredentialStorageAdapter,
): Promise<CredentialReferenceResult> {
  const createdAt = new Date().toISOString();
  const envVarName = input.envVarName?.trim();
  if (envVarName) {
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(envVarName)) {
      return {
        ok: false,
        status: createConnectionStatus('failed', {
          category: 'secure-storage-unavailable',
          message: 'Environment variable names must be valid identifiers.',
        }),
      };
    }
    return {
      ok: true,
      credential: {
        ref: `env:${envVarName}`,
        provider: input.provider,
        storage: 'environment-variable',
        displayHint: `$${envVarName}`,
        createdAt,
      },
    };
  }

  const apiKey = input.apiKey?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: createConnectionStatus('failed', {
        category: 'authentication-failed',
        message: 'An API key or environment variable reference is required.',
      }),
    };
  }

  if (!adapter || !(await adapter.isAvailable())) {
    return {
      ok: false,
      status: createConnectionStatus('failed', {
        category: 'secure-storage-unavailable',
        message: 'Secure credential storage is unavailable.',
      }),
    };
  }

  const ref = credentialRef(input.provider);
  await adapter.setSecret(ref, apiKey);
  return {
    ok: true,
    credential: {
      ref,
      provider: input.provider,
      storage: 'os-credential-store',
      displayHint: input.displayHint ?? safeDisplayHint(apiKey),
      createdAt,
    },
  };
}

export async function resolveCredentialSecret(
  credential: ApiProviderCredential,
  adapter?: CredentialStorageAdapter,
): Promise<string | null> {
  if (credential.storage === 'environment-variable') {
    const envName = credential.ref.replace(/^env:/, '');
    return process.env[envName] ?? null;
  }
  if (!adapter || !(await adapter.isAvailable())) return null;
  return await adapter.getSecret(credential.ref);
}

export async function deleteCredentialReference(
  credential: ApiProviderCredential,
  adapter?: CredentialStorageAdapter,
): Promise<boolean> {
  if (credential.storage === 'environment-variable') return true;
  if (!adapter || !(await adapter.isAvailable())) return false;
  await adapter.deleteSecret(credential.ref);
  return true;
}

export function redactDiagnostics(input: string): string {
  let redacted = input;
  redacted = redacted.replace(/\/Users\/[a-zA-Z0-9_.-]+/g, '/Users/<user>');
  redacted = redacted.replace(/C:\\Users\\[a-zA-Z0-9_.-]+/gi, 'C:\\Users\\<user>');
  redacted = redacted.replace(/(^|[\s=:"'])\.[^\\/\s]+/g, '$1.<hidden>');
  redacted = redacted.replace(/\bBearer\s+[a-zA-Z0-9_\-./~+\\*=]{8,}/gi, 'Bearer <redacted>');
  redacted = redacted.replace(
    /(api[-_]?key|token|auth|password|secret|key)\s*[:=]\s*["']?[a-zA-Z0-9_\-./~+\\*=]{8,}["']?/gi,
    '$1=<redacted>',
  );
  redacted = redacted.replace(
    /\b[A-Z][A-Z0-9_]{2,}\s*=\s*[a-zA-Z0-9_\-./~+\\*=]{8,}/g,
    '<env>=<redacted>',
  );
  return redacted;
}
