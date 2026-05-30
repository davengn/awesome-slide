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

export async function getSession(options: { slideId?: string } = {}): Promise<GetSessionResponse> {
  const params = new URLSearchParams();
  if (options.slideId) {
    params.set('slideId', options.slideId);
  }
  const query = params.toString();
  const res = await fetch(query ? `/__agent-chat/session?${query}` : '/__agent-chat/session');
  if (!res.ok) {
    throw new Error(`Failed to get session: ${res.statusText}`);
  }
  return res.json();
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
  if (!res.ok) {
    throw new Error(`Failed to start run: ${res.statusText}`);
  }
  return res.json();
}

export async function cancelRun(runId: string): Promise<CancelRunResponse> {
  const res = await fetch(`/__agent-chat/runs/${runId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel run: ${res.statusText}`);
  }
  return res.json();
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
  if (!res.ok) {
    throw new Error(`Failed to retry run: ${res.statusText}`);
  }
  return res.json();
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
  if (!res.ok) {
    throw new Error(`Failed to apply proposal: ${res.statusText}`);
  }
  return res.json();
}

export async function rejectProposal(proposalId: string): Promise<RejectProposalResponse> {
  const res = await fetch(`/__agent-chat/proposals/${proposalId}/reject`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to reject proposal: ${res.statusText}`);
  }
  return res.json();
}

export function streamRunEvents(
  runId: string,
  onEvent: (event: AgentChatEvent) => void,
  onError?: (err: Error) => void,
): { abort: () => void } {
  const eventSource = new EventSource(`/__agent-chat/runs/${runId}/events`);
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
