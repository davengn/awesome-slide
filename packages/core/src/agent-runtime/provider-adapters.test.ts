import { describe, expect, it, vi } from 'vitest';
import {
  buildProviderRequest,
  classifyProviderError,
  parseProviderStream,
  runProviderAdapter,
} from './provider-adapters.ts';

function streamResponse(text: string, status = 200): Response {
  return new Response(text, { status });
}

describe('provider adapters', () => {
  it('builds streaming requests without serializing secrets into bodies', () => {
    const controller = new AbortController();
    const request = buildProviderRequest({
      runId: 'run_provider',
      provider: 'openai',
      apiKey: 'sk-secret-value',
      prompt: 'Hello',
      modelId: 'gpt-5',
      signal: controller.signal,
    });

    expect(request.url).toContain('/chat/completions');
    expect(JSON.parse(String(request.init.body)).stream).toBe(true);
    expect(String(request.init.body)).not.toContain('sk-secret-value');
    expect((request.init.headers as Record<string, string>).Authorization).toContain('Bearer ');
  });

  it('normalizes OpenAI-compatible stream frames', async () => {
    const events = [];
    const response = streamResponse(
      [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: [DONE]',
      ].join('\n'),
    );

    for await (const event of parseProviderStream('openai', 'run_1', response)) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(['text_delta', 'text_delta']);
    expect(events.map((event) => (event.payload as { text: string }).text).join('')).toBe(
      'Hello world',
    );
  });

  it('normalizes Anthropic, Google, OpenRouter, and DeepSeek stream frames', async () => {
    const frames = {
      anthropic: 'data: {"delta":{"text":"A"}}',
      google: 'data: {"candidates":[{"content":{"parts":[{"text":"G"}]}}]}',
      openrouter: 'data: {"choices":[{"delta":{"content":"O"}}]}',
      deepseek: 'data: {"choices":[{"delta":{"content":"D"}}]}',
    } as const;

    for (const [provider, frame] of Object.entries(frames)) {
      const events = [];
      for await (const event of parseProviderStream(
        provider as keyof typeof frames,
        'run_provider',
        streamResponse(frame),
      )) {
        events.push(event);
      }
      expect(events[0]?.type).toBe('text_delta');
    }
  });

  it('classifies HTTP errors for recovery actions', () => {
    expect(classifyProviderError(new Response('', { status: 401 })).category).toBe(
      'authentication-failed',
    );
    expect(classifyProviderError(new Response('', { status: 429 })).category).toBe(
      'quota-rate-limit',
    );
    expect(classifyProviderError(new Response('', { status: 404 })).category).toBe(
      'unsupported-model',
    );
    expect(classifyProviderError(new Response('', { status: 503 })).category).toBe(
      'provider-offline',
    );
  });

  it('emits provider failures and redacts thrown diagnostics', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 401 }));
    const events = [];

    for await (const event of runProviderAdapter({
      runId: 'run_provider',
      provider: 'openai',
      apiKey: 'sk-secret-value',
      prompt: 'Hello',
      signal: new AbortController().signal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })) {
      events.push(event);
    }

    expect(events[0]?.type).toBe('failed');
    expect(JSON.stringify(events)).not.toContain('sk-secret-value');
  });
});
