import type {
  ApplyProposalRequest,
  ApplyProposalResponse,
  CancelRunResponse,
  CreateRunRequest,
  CreateRunResponse,
  GetSessionResponse,
  RejectProposalResponse,
  RetryRunResponse,
} from '../../http/agent-chat-types.ts';
import type { AgentChatContext, AgentChatEvent, ContextPreference } from './agent-chat-types.ts';

export class AgentChatRouteError extends Error {
  readonly status: number;
  readonly category?: string;
  readonly recoveryActions?: string[];
  readonly diagnostics?: string;

  constructor(
    message: string,
    opts: {
      status: number;
      category?: string;
      recoveryActions?: string[];
      diagnostics?: string;
    },
  ) {
    super(message);
    this.name = 'AgentChatRouteError';
    this.status = opts.status;
    this.category = opts.category;
    this.recoveryActions = opts.recoveryActions;
    this.diagnostics = opts.diagnostics;
  }
}

async function parseRouteResponse<T>(res: Response, fallback: string): Promise<T> {
  if (res.ok) {
    return res.json();
  }

  let body: {
    error?: string;
    category?: string;
    recoveryActions?: string[];
    diagnostics?: string;
  } = {};
  try {
    body = await res.json();
  } catch {}

  throw new AgentChatRouteError(body.error ?? fallback, {
    status: res.status,
    category: body.category,
    recoveryActions: body.recoveryActions,
    diagnostics: body.diagnostics,
  });
}

export async function getSession(options: { slideId?: string } = {}): Promise<GetSessionResponse> {
  const params = new URLSearchParams();
  if (options.slideId) {
    params.set('slideId', options.slideId);
  }
  const query = params.toString();
  const res = await fetch(query ? `/__agent-chat/session?${query}` : '/__agent-chat/session');
  return parseRouteResponse(res, `Failed to get session: ${res.statusText}`);
}

export async function startRun(
  sessionId: string,
  prompt: string,
  actionId?: string,
  contextPreferences: ContextPreference[] = [],
  context?: AgentChatContext,
): Promise<CreateRunResponse> {
  const body: CreateRunRequest = {
    sessionId,
    prompt,
    actionId,
    contextPreferences,
    context,
  };
  const res = await fetch('/__agent-chat/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseRouteResponse(res, `Failed to start run: ${res.statusText}`);
}

export async function cancelRun(runId: string): Promise<CancelRunResponse> {
  const res = await fetch(`/__agent-chat/runs/${runId}/cancel`, {
    method: 'POST',
  });
  return parseRouteResponse(res, `Failed to cancel run: ${res.statusText}`);
}

export async function retryRun(
  runId: string,
  context?: AgentChatContext,
): Promise<RetryRunResponse> {
  const res = await fetch(`/__agent-chat/runs/${runId}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  return parseRouteResponse(res, `Failed to retry run: ${res.statusText}`);
}

export async function listRuns(conversationId?: string): Promise<{
  runs: Array<{
    runId: string;
    conversationId: string;
    state: string;
    lastSequence: number;
    startedAt: string;
    finishedAt?: string;
  }>;
}> {
  const params = new URLSearchParams();
  if (conversationId) {
    params.set('conversationId', conversationId);
  }
  const query = params.toString();
  const res = await fetch(query ? `/__agent-chat/runs?${query}` : '/__agent-chat/runs');
  return parseRouteResponse(res, `Failed to list runs: ${res.statusText}`);
}

export async function applyProposal(
  proposalId: string,
  operationIds?: string[],
  confirmation?: { acceptedRiskLevel: 'low' | 'medium' | 'high' },
): Promise<ApplyProposalResponse> {
  const body: ApplyProposalRequest = {
    operationIds,
    confirmation,
  };
  const res = await fetch(`/__agent-chat/proposals/${proposalId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseRouteResponse(res, `Failed to apply proposal: ${res.statusText}`);
}

export async function rejectProposal(proposalId: string): Promise<RejectProposalResponse> {
  const res = await fetch(`/__agent-chat/proposals/${proposalId}/reject`, {
    method: 'POST',
  });
  return parseRouteResponse(res, `Failed to reject proposal: ${res.statusText}`);
}

export function streamRunEvents(
  runId: string,
  onEvent: (event: AgentChatEvent) => void,
  onError?: (err: Error) => void,
  opts: { afterSequence?: number } = {},
): { abort: () => void } {
  const params = new URLSearchParams();
  if (opts.afterSequence && opts.afterSequence > 0) {
    params.set('after', String(opts.afterSequence));
  }
  const query = params.toString();
  const eventSource = new EventSource(
    query ? `/__agent-chat/runs/${runId}/events?${query}` : `/__agent-chat/runs/${runId}/events`,
  );
  let closedIntentionally = false;

  eventSource.onmessage = (event) => {
    try {
      const chatEvent = JSON.parse(event.data) as AgentChatEvent;
      onEvent(chatEvent);

      // Close on terminal events
      if (['completed', 'cancelled', 'failed'].includes(chatEvent.type)) {
        closedIntentionally = true;
        eventSource.close();
      }
    } catch (err) {
      if (onError) {
        onError(err as Error);
      }
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    if (!closedIntentionally && onError) {
      onError(new Error('EventSource failed connection.'));
    }
  };

  return {
    abort: () => {
      closedIntentionally = true;
      eventSource.close();
    },
  };
}
