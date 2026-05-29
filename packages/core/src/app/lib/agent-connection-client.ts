import type {
  AgentConnectionsBootstrapResponse,
  AgentConnectionsSettingsResponse,
  AgentScanPreference,
  CreateAgentConnectionRequest,
  CreateAgentConnectionResponse,
  DeleteConnectionRequest,
  DeleteConnectionResponse,
  DismissFirstRunRequest,
  DismissFirstRunResponse,
  ManualPathValidationRequest,
  ManualPathValidationResponse,
  SetActiveConnectionRequest,
  SetActiveConnectionResponse,
  StartScanRequest,
  StartScanResponse,
  TestConnectionResponse,
} from './agent-connection-types.ts';

async function parseJsonResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let message = fallback;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      message = `${fallback}: ${res.statusText}`;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

async function postJson<TResponse>(url: string, body?: unknown): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return parseJsonResponse<TResponse>(res, `Request failed for ${url}`);
}

export async function getAgentConnectionBootstrap(): Promise<AgentConnectionsBootstrapResponse> {
  const res = await fetch('/__agent-connections/bootstrap');
  return parseJsonResponse(res, 'Failed to load agent connection bootstrap');
}

export async function getAgentConnectionSettings(): Promise<AgentConnectionsSettingsResponse> {
  const res = await fetch('/__agent-connections/settings');
  return parseJsonResponse(res, 'Failed to load agent connection settings');
}

export async function dismissFirstRunConnectionSetup(
  reason: DismissFirstRunRequest['reason'] = 'do-later',
): Promise<DismissFirstRunResponse> {
  return postJson('/__agent-connections/first-run/dismiss', { reason });
}

export async function startAgentConnectionScan(
  request: StartScanRequest = {},
): Promise<StartScanResponse> {
  return postJson('/__agent-connections/scan', request);
}

export function streamAgentConnectionScanEvents(
  scanId: string,
  onEvent: (event: MessageEvent) => void,
  onError?: (error: Error) => void,
): { abort: () => void } {
  const eventSource = new EventSource(`/__agent-connections/scan/${scanId}/events`);
  eventSource.onmessage = onEvent;
  eventSource.onerror = () => {
    eventSource.close();
    onError?.(new Error('Agent connection scan event stream failed.'));
  };
  return {
    abort: () => {
      eventSource.close();
    },
  };
}

export async function cancelAgentConnectionScan(
  scanId: string,
): Promise<{ ok: true; scanId: string; state: 'cancelled' }> {
  return postJson(`/__agent-connections/scan/${scanId}/cancel`);
}

export async function addApprovedScanDirectory(
  path: string,
): Promise<{ ok: true; scanPreference: AgentScanPreference }> {
  return postJson('/__agent-connections/scan/directories', { path });
}

export async function removeApprovedScanDirectory(
  id: string,
): Promise<{ ok: true; scanPreference: AgentScanPreference }> {
  const res = await fetch(`/__agent-connections/scan/directories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return parseJsonResponse(res, 'Failed to remove approved directory');
}

export async function validateManualAgentPath(
  request: ManualPathValidationRequest,
): Promise<ManualPathValidationResponse> {
  return postJson('/__agent-connections/manual-path/validate', request);
}

export async function createAgentConnection(
  request: CreateAgentConnectionRequest,
): Promise<CreateAgentConnectionResponse> {
  return postJson('/__agent-connections', request);
}

export async function setActiveAgentConnection(
  request: SetActiveConnectionRequest,
): Promise<SetActiveConnectionResponse> {
  return postJson('/__agent-connections/active', request);
}

export async function testAgentConnection(connectionId: string): Promise<TestConnectionResponse> {
  return postJson(`/__agent-connections/${encodeURIComponent(connectionId)}/test`);
}

export async function deleteAgentConnection(
  connectionId: string,
  request: DeleteConnectionRequest = {},
): Promise<DeleteConnectionResponse> {
  const res = await fetch(`/__agent-connections/${encodeURIComponent(connectionId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return parseJsonResponse(res, 'Failed to delete agent connection');
}
