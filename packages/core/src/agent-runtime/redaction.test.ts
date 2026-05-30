import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { redactDiagnostics, redactJsonValue, redactRuntimeEvent, redactText } from './redaction.ts';
import { createTestEvent } from './test-helpers.ts';

describe('agent-runtime redaction', () => {
  it('redacts credentials and bearer tokens from diagnostics', () => {
    const redacted = redactText(
      'apiKey=sk-secret123456 Bearer abcdefghijklmnopqrstuvwxyz OPENAI_API_KEY=live-secret',
    );

    expect(redacted).not.toContain('sk-secret123456');
    expect(redacted).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(redacted).not.toContain('live-secret');
    expect(redacted).toContain('apiKey=<redacted>');
    expect(redacted).toContain('Bearer <redacted>');
  });

  it('redacts user home paths and hidden file segments', () => {
    const home = os.homedir();
    const redacted = redactText(`${home}/deck/.env.local and /Users/ducduy/.ssh/config`);

    expect(redacted).not.toContain(home);
    expect(redacted).not.toContain('.env.local');
    expect(redacted).not.toContain('.ssh');
    expect(redacted).toContain('<home>');
    expect(redacted).toContain('<hidden>');
  });

  it('redacts nested secret values by key', () => {
    const redacted = redactJsonValue({
      credentialRef: 'cred_openai_live',
      diagnostics: { stderr: 'token=abc123456789' },
    });

    expect(redacted).toEqual({
      credentialRef: '<redacted>',
      diagnostics: { stderr: 'token=<redacted>' },
    });
  });

  it('redacts runtime event payloads before persistence or SSE output', () => {
    const event = redactRuntimeEvent(
      createTestEvent({
        type: 'diagnostic',
        payload: { message: 'failed in /Users/ducduy/.config with password=supersecret' },
      }),
    );

    expect(JSON.stringify(event.payload)).not.toContain('/Users/ducduy');
    expect(JSON.stringify(event.payload)).not.toContain('supersecret');
  });

  it('handles arbitrary diagnostic payloads', () => {
    expect(
      redactDiagnostics(['secret=abcdefghijkl', { path: '/home/alice/.aws/credentials' }]),
    ).toMatchInlineSnapshot(`
        [
          "secret=<redacted>",
          {
            "path": "/home/<user>/<hidden>/credentials",
          },
        ]
      `);
  });
});
