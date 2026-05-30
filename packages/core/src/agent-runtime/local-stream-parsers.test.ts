import { describe, expect, it } from 'vitest';
import { normalizeLocalAgentExit, parseLocalAgentStdoutChunk } from './local-stream-parsers.ts';

describe('local agent stream parsers', () => {
  it('parses plain stdout as text deltas', () => {
    expect(parseLocalAgentStdoutChunk('Hello\nworld')).toEqual([
      { type: 'text_delta', payload: { text: 'Hello' }, source: 'local-agent' },
      { type: 'text_delta', payload: { text: 'world' }, source: 'local-agent' },
    ]);
  });

  it('parses JSON frames and token aliases', () => {
    const events = parseLocalAgentStdoutChunk(
      [
        JSON.stringify({ type: 'progress', payload: 'Thinking' }),
        JSON.stringify({ type: 'token', text: 'Hello' }),
        JSON.stringify({ type: 'tool_call', payload: { id: 'tool_1' } }),
      ].join('\n'),
    );

    expect(events.map((event) => event.type)).toEqual(['progress', 'text_delta', 'tool_call']);
    expect(events[1]?.payload).toEqual({ text: 'Hello' });
  });

  it('turns malformed JSON frames into parser errors', () => {
    const events = parseLocalAgentStdoutChunk('{"type":"progress"');

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('error');
    expect(JSON.stringify(events[0]?.payload)).toContain('parser-error');
  });

  it('redacts stderr diagnostics and completes non-empty output', () => {
    const events = normalizeLocalAgentExit({
      exitCode: 0,
      stdoutText: 'ok',
      stderrText: 'token=secretvalue123 /Users/ducduy/.agent',
    });

    expect(events.map((event) => event.type)).toEqual(['diagnostic', 'completed']);
    expect(JSON.stringify(events)).not.toContain('secretvalue123');
    expect(JSON.stringify(events)).not.toContain('/Users/ducduy');
  });

  it('classifies empty output and nonzero exits', () => {
    const empty = normalizeLocalAgentExit({ exitCode: 0, stdoutText: '', stderrText: '' });
    const nonzero = normalizeLocalAgentExit({
      exitCode: 2,
      stdoutText: 'bad output',
      stderrText: '',
    });

    expect(empty[0]?.type).toBe('failed');
    expect(JSON.stringify(empty[0]?.payload)).toContain('model-empty-output');
    expect(nonzero[0]?.type).toBe('failed');
    expect(JSON.stringify(nonzero[0]?.payload)).toContain('incompatible-protocol');
  });

  it('maps aborted processes to cancellation', () => {
    expect(
      normalizeLocalAgentExit({
        exitCode: null,
        stdoutText: '',
        stderrText: '',
        aborted: true,
      })[0]?.type,
    ).toBe('cancelled');
  });
});
