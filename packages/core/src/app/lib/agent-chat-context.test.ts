import { describe, expect, it } from 'vitest';
import {
  buildAgentChatContext,
  isSecretContent,
  isSecretFile,
  redactSecrets,
} from './agent-chat-context.ts';

describe('Agent Chat Context Redaction & Filtering', () => {
  it('detects secret files correctly', () => {
    expect(isSecretFile('.env')).toBe(true);
    expect(isSecretFile('.env.local')).toBe(true);
    expect(isSecretFile('id_rsa')).toBe(true);
    expect(isSecretFile('key.pem')).toBe(true);
    expect(isSecretFile('slides/intro/index.tsx')).toBe(false);
  });

  it('detects secret content correctly', () => {
    expect(isSecretContent('const api_key = "abc";')).toBe(true);
    expect(isSecretContent('password=1234')).toBe(true);
    expect(isSecretContent('const title = "Welcome";')).toBe(false);
  });

  it('redacts secrets from content', () => {
    const content = 'const API_KEY = "super-secret-token";\nconst port = 3000;';
    const redacted = redactSecrets(content);
    expect(redacted).toContain('API_KEY = "<redacted>"');
    expect(redacted).toContain('port = 3000');
  });

  it('builds chat context and honors limits', async () => {
    const context = await buildAgentChatContext({
      project: { name: 'Demo Project' },
      slide: { id: 'intro', title: 'Intro Slide', pageIndex: 0, pageCount: 5 },
      source: {
        excerpts: [
          { filePath: 'slides/intro/index.tsx', content: 'export default () => <div>Hello</div>' },
          { filePath: '.env', content: 'SECRET=123' }, // should be ignored
        ],
      },
    });

    expect(context.project.name).toBe('Demo Project');
    expect(context.slide?.id).toBe('intro');
    expect(context.source?.excerpts).toHaveLength(1);
    expect(context.source?.excerpts[0].filePath).toBe('slides/intro/index.tsx');
  });
});
