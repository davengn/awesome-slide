import { describe, expect, it, vi } from 'vitest';
import { createRuntimeRunService } from './runs.ts';
import {
  createTestConnectionSnapshot,
  createTestPromptPackage,
  createTestRun,
  TEST_NOW,
} from './test-helpers.ts';

describe('agent-runtime run service', () => {
  it('creates queued runs, emits replayable events, and enforces one active run', () => {
    const service = createRuntimeRunService({
      now: () => TEST_NOW,
      runId: () => 'run_created',
    });
    const created = service.createRun({
      conversationId: 'conv_test',
      prompt: 'Improve this slide',
      promptPackage: createTestPromptPackage(),
      connectionSnapshot: createTestConnectionSnapshot(),
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.run.state).toBe('queued');
    expect(created.queuedEvent.type).toBe('queued');
    expect(service.listRunEvents('run_created')).toHaveLength(1);

    const locked = service.createRun({
      conversationId: 'conv_test',
      prompt: 'Second prompt',
      promptPackage: createTestPromptPackage(),
      connectionSnapshot: createTestConnectionSnapshot(),
    });
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.status).toBe(409);
      expect(locked.activeRun.runId).toBe('run_created');
    }
  });

  it('replays events after a cursor and streams live terminal events once', () => {
    const service = createRuntimeRunService();
    service.registerRun(createTestRun({ runId: 'run_stream' }));
    service.emitEvent({ runId: 'run_stream', type: 'queued', payload: null });
    service.emitEvent({
      runId: 'run_stream',
      type: 'text_delta',
      payload: { text: 'Hello' },
      source: 'local-agent',
    });

    const received = service.listRunEvents('run_stream', 1);
    expect(received.map((event) => event.type)).toEqual(['text_delta']);

    const live = vi.fn();
    const unsubscribe = service.subscribe('run_stream', live, { afterSequence: 2 });
    service.emitEvent({ runId: 'run_stream', type: 'completed', payload: null });
    unsubscribe?.();

    expect(live).toHaveBeenCalledTimes(1);
    expect(live.mock.calls[0]?.[0].type).toBe('completed');
    expect(service.getRun('run_stream')?.state).toBe('completed');
    expect(service.getActiveRun('conv_test')).toBeUndefined();
  });

  it('cancels idempotently and preserves the terminal event', () => {
    const service = createRuntimeRunService();
    service.registerRun(createTestRun({ runId: 'run_cancel' }));

    const first = service.cancelRun('run_cancel');
    const second = service.cancelRun('run_cancel');

    expect(first?.type).toBe('cancelled');
    expect(second?.type).toBe('cancelled');
    expect(
      service.listRunEvents('run_cancel').filter((event) => event.type === 'cancelled'),
    ).toHaveLength(1);
  });

  it('emits watchdog failures for accepted runs without terminal events', () => {
    vi.useFakeTimers();
    try {
      const service = createRuntimeRunService();
      service.registerRun(createTestRun({ runId: 'run_watchdog' }), new AbortController(), {
        watchdogTimeoutMs: 50,
      });

      vi.advanceTimersByTime(51);

      const events = service.listRunEvents('run_watchdog');
      expect(events.at(-1)?.type).toBe('failed');
      expect(service.getRun('run_watchdog')?.state).toBe('failed');
    } finally {
      vi.useRealTimers();
    }
  });
});
