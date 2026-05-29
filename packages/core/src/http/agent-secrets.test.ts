import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCredentialReference,
  createMemoryCredentialStorageAdapter,
  createUserHomeCredentialStorageAdapter,
  deleteCredentialReference,
  redactDiagnostics,
  resolveCredentialSecret,
} from './agent-secrets.ts';

describe('agent secrets', () => {
  it('stores raw API keys only in an available credential adapter', async () => {
    const adapter = createMemoryCredentialStorageAdapter();
    const result = await createCredentialReference(
      { provider: 'openai', apiKey: 'sk-super-secret-value' },
      adapter,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credential.storage).toBe('os-credential-store');
    expect(JSON.stringify(result.credential)).not.toContain('sk-super-secret-value');
    expect(await resolveCredentialSecret(result.credential, adapter)).toBe('sk-super-secret-value');
  });

  it('supports environment variable references without storing raw values', async () => {
    process.env.AWESOME_SLIDE_TEST_KEY = 'env-secret-value';
    const result = await createCredentialReference({
      provider: 'openai',
      envVarName: 'AWESOME_SLIDE_TEST_KEY',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.credential.ref).toBe('env:AWESOME_SLIDE_TEST_KEY');
    expect(result.credential.displayHint).toBe('$AWESOME_SLIDE_TEST_KEY');
    expect(JSON.stringify(result.credential)).not.toContain('env-secret-value');
    expect(await resolveCredentialSecret(result.credential)).toBe('env-secret-value');
    delete process.env.AWESOME_SLIDE_TEST_KEY;
  });

  it('reports secure-storage-unavailable when no safe storage path exists', async () => {
    const adapter = createMemoryCredentialStorageAdapter({ available: false });
    const result = await createCredentialReference(
      { provider: 'openai', apiKey: 'sk-super-secret-value' },
      adapter,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status.category).toBe('secure-storage-unavailable');
  });

  it('deletes credential references from available storage', async () => {
    const adapter = createMemoryCredentialStorageAdapter();
    const result = await createCredentialReference(
      { provider: 'openai', apiKey: 'sk-super-secret-value' },
      adapter,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await deleteCredentialReference(result.credential, adapter);
    expect(await resolveCredentialSecret(result.credential, adapter)).toBeNull();
  });

  it('user home storage adapter stores, retrieves and deletes credentials without plaintext files', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-test-secrets-'));
    const adapter = createUserHomeCredentialStorageAdapter({ secretsDir: tempDir });

    if (!(await adapter.isAvailable())) {
      await fs.rm(tempDir, { recursive: true, force: true });
      return;
    }

    const ref = 'test_ref_key';
    const secret = 'sk-test-secret-value';

    await adapter.setSecret(ref, secret);
    expect(await adapter.getSecret(ref)).toBe(secret);

    const raw = await fs.readFile(path.join(tempDir, 'credentials.v1.json'), 'utf8');
    expect(raw).not.toContain(secret);
    expect(raw).toContain('dpapi:');

    await adapter.deleteSecret(ref);
    expect(await adapter.getSecret(ref)).toBeNull();

    await fs.rm(tempDir, { recursive: true, force: true });
  }, 15_000);

  it('redacts diagnostics containing secrets and user paths', () => {
    const redacted = redactDiagnostics(
      'key=supersecret123 path=C:\\Users\\Admin\\project token:abcd123456789 OPENAI_API_KEY=abcdef123456',
    );

    expect(redacted).not.toContain('supersecret123');
    expect(redacted).not.toContain('Admin');
    expect(redacted).not.toContain('abcd123456789');
    expect(redacted).not.toContain('abcdef123456');
    expect(redacted).toContain('<redacted>');
    expect(redacted).toContain('<user>');
  });
});
