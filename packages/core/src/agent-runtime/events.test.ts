import { describe, expect, it } from 'vitest';
import {
  createRuntimeEventSequencer,
  eventsAfter,
  isTerminalRuntimeEventType,
  parseReplayCursor,
  runtimeStateForEventType,
  serializeSseEvent,
} from './events.ts';

describe('agent-runtime events', () => {
  it('assigns monotonic sequence numbers and replays after a cursor', () => {
    const nextEvent = createRuntimeEventSequencer();
    const events = [
      nextEvent({ runId: 'run_1', type: 'queued' }),
      nextEvent({ runId: 'run_1', type: 'progress', payload: { message: 'Thinking' } }),
      nextEvent({ runId: 'run_1', type: 'completed' }),
    ];

    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(eventsAfter(events, 1).map((event) => event.type)).toEqual(['progress', 'completed']);
  });

  it('detects terminal semantics and state mapping', () => {
    expect(isTerminalRuntimeEventType('completed')).toBe(true);
    expect(isTerminalRuntimeEventType('cancelled')).toBe(true);
    expect(isTerminalRuntimeEventType('failed')).toBe(true);
    expect(isTerminalRuntimeEventType('progress')).toBe(false);
    expect(runtimeStateForEventType('proposal')).toBe('needs-review');
    expect(runtimeStateForEventType('text_delta')).toBe('running');
  });

  it('parses replay cursors from query or Last-Event-ID', () => {
    expect(parseReplayCursor({ after: '12', lastEventId: '4' })).toBe(12);
    expect(parseReplayCursor({ after: null, lastEventId: '4' })).toBe(4);
    expect(parseReplayCursor({ after: '-1', lastEventId: 'bad' })).toBe(0);
  });

  it('serializes redacted SSE frames', () => {
    const nextEvent = createRuntimeEventSequencer();
    const frame = serializeSseEvent(
      nextEvent({
        runId: 'run_1',
        type: 'diagnostic',
        payload: { stderr: 'Bearer secretvalue12345 in /Users/ducduy/.config' },
      }),
    );

    expect(frame).toContain('id: 1');
    expect(frame).toContain('event: message');
    expect(frame).not.toContain('secretvalue12345');
    expect(frame).not.toContain('/Users/ducduy');
    expect(frame).toContain('<hidden>');
  });
});
