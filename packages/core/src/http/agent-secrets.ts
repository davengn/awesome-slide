import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

export function createUserHomeCredentialStorageAdapter(
  opts: { secretsDir?: string } = {},
): CredentialStorageAdapter {
  const secretsDir = opts.secretsDir ?? path.join(os.homedir(), '.awesome-slide');
  const secretsPath = path.join(secretsDir, 'credentials.v1.json');

  if (process.platform !== 'win32') {
    return createUnavailableCredentialStorageAdapter();
  }

  return {
    kind: 'os-credential-store',
    isAvailable: async () => {
      try {
        await fs.mkdir(secretsDir, { recursive: true });
        await protectWindowsSecret('availability-check');
        return true;
      } catch {
        return false;
      }
    },
    setSecret: async (ref, secret) => {
      const data = await readProtectedSecrets(secretsPath);
      data[ref] = `dpapi:${await protectWindowsSecret(secret)}`;
      await fs.mkdir(secretsDir, { recursive: true });
      await fs.writeFile(secretsPath, JSON.stringify(data, null, 2), {
        encoding: 'utf8',
        mode: 0o600,
      });
    },
    getSecret: async (ref) => {
      const data = await readProtectedSecrets(secretsPath);
      const blob = data[ref];
      if (!blob?.startsWith('dpapi:')) return null;
      return await unprotectWindowsSecret(blob.slice('dpapi:'.length));
    },
    deleteSecret: async (ref) => {
      try {
        const data = await readProtectedSecrets(secretsPath);
        delete data[ref];
        await fs.writeFile(secretsPath, JSON.stringify(data, null, 2), {
          encoding: 'utf8',
          mode: 0o600,
        });
      } catch {}
    },
  };
}

function createUnavailableCredentialStorageAdapter(): CredentialStorageAdapter {
  return {
    kind: 'os-credential-store',
    isAvailable: () => false,
    setSecret: async () => {
      throw new Error('Secure credential storage is unavailable.');
    },
    getSecret: () => null,
    deleteSecret: () => {},
  };
}

async function readProtectedSecrets(secretsPath: string): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(secretsPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        return typeof entry[0] === 'string' && typeof entry[1] === 'string';
      }),
    );
  } catch {
    return {};
  }
}

const WINDOWS_DPAPI_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Security.Cryptography.ProtectedData -ErrorAction Stop
} catch {
  try { Add-Type -AssemblyName System.Security -ErrorAction Stop } catch {}
}
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($payload.mode -eq 'protect') {
  $bytes = [Text.Encoding]::UTF8.GetBytes([string]$payload.value)
  $protected = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Convert]::ToBase64String($protected))
} elseif ($payload.mode -eq 'unprotect') {
  $bytes = [Convert]::FromBase64String([string]$payload.value)
  $plain = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  [Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))
} else {
  throw 'Unknown DPAPI mode.'
}
`;

async function protectWindowsSecret(secret: string): Promise<string> {
  return await runWindowsPowerShellDpapi('protect', secret);
}

async function unprotectWindowsSecret(secret: string): Promise<string> {
  return await runWindowsPowerShellDpapi('unprotect', secret);
}

async function runWindowsPowerShellDpapi(
  mode: 'protect' | 'unprotect',
  value: string,
): Promise<string> {
  const input = JSON.stringify({ mode, value });
  const stdout = await runProcess(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      WINDOWS_DPAPI_SCRIPT,
    ],
    input,
  );
  return stdout.trim();
}

async function runProcess(file: string, args: string[], input: string): Promise<string> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timeout = windowlessTimeout(() => {
      child.kill();
      reject(new Error('Secure credential storage timed out.'));
    }, 5000);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `Secure credential storage exited with ${code}.`));
    });
    child.stdin.end(input);
  });
}

function windowlessTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
  return setTimeout(callback, ms);
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
