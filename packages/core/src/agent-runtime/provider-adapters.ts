import type { ApiProviderId } from '../app/lib/agent-connection-types.ts';
import type { RuntimeError } from './contracts.ts';
import type { RuntimeEventInput } from './events.ts';
import { redactText } from './redaction.ts';

export interface ProviderAdapterRequest {
  runId: string;
  provider: ApiProviderId;
  apiKey: string;
  prompt: string;
  systemInstructions?: string;
  modelId?: string;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface ProviderHttpRequest {
  url: string;
  init: RequestInit;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-latest',
  google: 'gemini-2.0-flash',
  openrouter: 'openai/gpt-4o',
  deepseek: 'deepseek-chat',
};

function runtimeError(
  category: RuntimeError['category'],
  message: string,
  diagnostics?: string,
): RuntimeError {
  return {
    category,
    message,
    diagnostics: diagnostics ? redactText(diagnostics) : undefined,
    recoveryActions:
      category === 'authentication-failed'
        ? ['change-connection', 'open-settings']
        : ['retry', 'change-connection', 'copy-diagnostics'],
  };
}

export function defaultProviderModel(provider: string): string {
  return DEFAULT_MODELS[provider] ?? 'default';
}

export function classifyProviderError(error: unknown): RuntimeError {
  if (error instanceof Response) {
    if (error.status === 401 || error.status === 403) {
      return runtimeError('authentication-failed', 'Provider authentication failed.');
    }
    if (error.status === 404) {
      return runtimeError('unsupported-model', 'Provider model was not found.');
    }
    if (error.status === 429) {
      return runtimeError('quota-rate-limit', 'Provider quota or rate limit was reached.');
    }
    if (error.status >= 500) {
      return runtimeError('provider-offline', 'Provider service is unavailable.');
    }
    return runtimeError('unknown', `Provider request failed with status ${error.status}.`);
  }

  if (error instanceof Error && error.name === 'TimeoutError') {
    return runtimeError('timeout', 'Provider request timed out.', error.message);
  }

  const message = error instanceof Error ? error.message : String(error);
  return runtimeError('provider-offline', 'Provider request failed.', message);
}

export function buildProviderRequest(request: ProviderAdapterRequest): ProviderHttpRequest {
  const model = request.modelId ?? defaultProviderModel(request.provider);
  const userMessage = { role: 'user', content: request.prompt };
  const systemMessage = request.systemInstructions
    ? [{ role: 'system', content: request.systemInstructions }]
    : [];

  if (request.provider === 'openai' || request.provider === 'openrouter') {
    return {
      url:
        request.provider === 'openai'
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [...systemMessage, userMessage],
          stream: true,
        }),
        signal: request.signal,
      },
    };
  }

  if (request.provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': request.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: request.systemInstructions,
          messages: [userMessage],
          max_tokens: 4096,
          stream: true,
        }),
        signal: request.signal,
      },
    };
  }

  if (request.provider === 'google') {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${request.apiKey}`,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: request.prompt }] }],
          systemInstruction: request.systemInstructions
            ? { parts: [{ text: request.systemInstructions }] }
            : undefined,
        }),
        signal: request.signal,
      },
    };
  }

  if (request.provider === 'deepseek') {
    return {
      url: 'https://api.deepseek.com/chat/completions',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [...systemMessage, userMessage],
          stream: true,
        }),
        signal: request.signal,
      },
    };
  }

  throw new Error(`Unsupported API provider: ${request.provider}`);
}

function extractTextDelta(provider: ApiProviderId, frame: Record<string, unknown>): string {
  if (provider === 'anthropic') {
    const delta = frame.delta as { text?: string } | undefined;
    return delta?.text ?? '';
  }
  if (provider === 'google') {
    const candidates = frame.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    return candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  }

  const choices = frame.choices as Array<{
    delta?: { content?: string };
    message?: { content?: string };
  }>;
  return choices?.[0]?.delta?.content ?? choices?.[0]?.message?.content ?? '';
}

async function readResponseText(response: Response): Promise<string> {
  if (!response.body) {
    return await response.text();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

export async function* parseProviderStream(
  provider: ApiProviderId,
  runId: string,
  response: Response,
): AsyncIterable<RuntimeEventInput> {
  const text = await readResponseText(response);
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('event:')) {
      continue;
    }
    const payloadText = trimmed.startsWith('data:')
      ? trimmed.slice('data:'.length).trim()
      : trimmed;
    if (!payloadText || payloadText === '[DONE]') {
      continue;
    }
    try {
      const frame = JSON.parse(payloadText) as Record<string, unknown>;
      const textDelta = extractTextDelta(provider, frame);
      if (textDelta) {
        yield {
          runId,
          type: 'text_delta',
          payload: { text: textDelta },
          source: 'provider',
        };
      }
    } catch (error) {
      yield {
        runId,
        type: 'error',
        payload: runtimeError(
          'parser-error',
          'Provider stream frame could not be parsed.',
          String(error),
        ),
        source: 'provider',
      };
    }
  }
}

export async function* runProviderAdapter(
  request: ProviderAdapterRequest,
): AsyncIterable<RuntimeEventInput> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const httpRequest = buildProviderRequest(request);

  try {
    const response = await fetchImpl(httpRequest.url, httpRequest.init);
    if (!response.ok) {
      yield {
        runId: request.runId,
        type: 'failed',
        payload: classifyProviderError(response),
        source: 'provider',
      };
      return;
    }

    let emittedText = false;
    for await (const event of parseProviderStream(request.provider, request.runId, response)) {
      if (event.type === 'text_delta') {
        emittedText = true;
      }
      yield event;
    }

    if (!emittedText) {
      yield {
        runId: request.runId,
        type: 'failed',
        payload: runtimeError('model-empty-output', 'Provider returned empty output.'),
        source: 'provider',
      };
      return;
    }

    yield { runId: request.runId, type: 'completed', payload: null, source: 'provider' };
  } catch (error) {
    if (request.signal.aborted) {
      yield { runId: request.runId, type: 'cancelled', payload: null, source: 'provider' };
      return;
    }
    yield {
      runId: request.runId,
      type: 'failed',
      payload: classifyProviderError(error),
      source: 'provider',
    };
  }
}
