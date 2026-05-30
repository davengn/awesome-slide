import { isRuntimeFixtureEnabled } from './connections.ts';
import type { RuntimeEventInput } from './events.ts';

export interface RuntimeFixtureRequest {
  runId: string;
  prompt: string;
  signal: AbortSignal;
  env?: NodeJS.ProcessEnv;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });
}

export async function* runRuntimeFixture(
  request: RuntimeFixtureRequest,
): AsyncIterable<RuntimeEventInput> {
  if (!isRuntimeFixtureEnabled(request.env)) {
    throw new Error('The deterministic fixture is only available during E2E runs.');
  }

  yield {
    runId: request.runId,
    type: 'progress',
    payload: 'Preparing deterministic agent response.',
    source: 'fixture',
  };
  await wait(25, request.signal);

  if (request.prompt.toLowerCase().includes('fail')) {
    yield {
      runId: request.runId,
      type: 'failed',
      payload: {
        category: 'model-failed',
        message: 'Deterministic fixture failure.',
        recoveryActions: ['retry', 'edit-prompt'],
      },
      source: 'fixture',
    };
    return;
  }

  yield {
    runId: request.runId,
    type: 'text_delta',
    payload: { text: 'Here is a deterministic Awesome Slide response.' },
    source: 'fixture',
  };

  if (request.prompt.toLowerCase().includes('proposal')) {
    yield {
      runId: request.runId,
      type: 'proposal',
      payload: {
        proposalId: `prop_${request.runId}`,
        runId: request.runId,
        summary: 'Deterministic fixture proposal',
        scope: 'slide',
        riskLevel: 'low',
        operations: [],
        previewArtifacts: [],
        validation: { status: 'valid', checks: [] },
        state: 'pending-review',
        createdAt: new Date().toISOString(),
      },
      source: 'fixture',
    };
    return;
  }

  yield { runId: request.runId, type: 'completed', payload: null, source: 'fixture' };
}
