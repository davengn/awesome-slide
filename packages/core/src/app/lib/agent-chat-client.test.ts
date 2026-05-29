import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streamRunEvents } from './agent-chat-client.ts';
import type { AgentChatEvent } from './agent-chat-types.ts';

describe('Agent Chat Client - streamRunEvents', () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock EventSource
  let mockEventSourceInstance: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock EventSource
  let originalEventSource: any;

  beforeEach(() => {
    mockEventSourceInstance = {
      close: vi.fn(),
      onmessage: null,
      onerror: null,
    };

    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    originalEventSource = (global as any).EventSource;
    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    (global as any).EventSource = vi.fn().mockImplementation(() => mockEventSourceInstance);
  });

  afterEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: mock global EventSource
    (global as any).EventSource = originalEventSource;
  });

  it('subscribes to EventSource and triggers onEvent (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    const { abort } = streamRunEvents('run_test_1', onEvent, onError);

    expect(global.EventSource).toHaveBeenCalledWith('/__agent-chat/runs/run_test_1/events');

    // Simulate event
    const eventData: AgentChatEvent = {
      sequence: 1,
      runId: 'run_test_1',
      type: 'token',
      payload: 'hello',
      createdAt: new Date().toISOString(),
    };

    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventData) });

    expect(onEvent).toHaveBeenCalledWith(eventData);
    expect(mockEventSourceInstance.close).not.toHaveBeenCalled();

    abort();
    expect(mockEventSourceInstance.close).toHaveBeenCalled();
  });

  it('closes EventSource automatically on terminal completed event (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    streamRunEvents('run_test_1', onEvent, onError);

    const eventData: AgentChatEvent = {
      sequence: 1,
      runId: 'run_test_1',
      type: 'completed',
      payload: null,
      createdAt: new Date().toISOString(),
    };

    mockEventSourceInstance.onmessage({ data: JSON.stringify(eventData) });

    expect(onEvent).toHaveBeenCalledWith(eventData);
    expect(mockEventSourceInstance.close).toHaveBeenCalled();
  });

  it('triggers onError and closes EventSource on error (T083)', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();

    streamRunEvents('run_test_1', onEvent, onError);

    mockEventSourceInstance.onerror();

    expect(mockEventSourceInstance.close).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
