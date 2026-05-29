import type {
  AgentChatContext,
  AgentConnectionRef,
  ContextPreference,
  RunState,
  RuntimeMode,
  SuggestedAction,
} from '../app/lib/agent-chat-types.ts';

export interface GetSessionResponse {
  session: {
    id: string;
    origin: 'slide-workspace' | 'slide-management';
    activeSlideId?: string;
  };
  activeConnection: AgentConnectionRef;
  runtime: {
    mode: RuntimeMode;
    settingsRoute: string;
  };
  suggestedActions: SuggestedAction[];
}

export interface CreateRunRequest {
  sessionId: string;
  prompt: string;
  actionId?: string;
  contextPreferences: ContextPreference[];
  context?: AgentChatContext;
}

export interface CreateRunResponse {
  runId: string;
  state: RunState;
  eventUrl: string;
}

export interface CancelRunResponse {
  ok: boolean;
  runId: string;
  state: 'cancelled';
}

export interface RetryRunResponse {
  runId: string;
  state: 'queued';
  eventUrl: string;
}

export interface ApplyProposalRequest {
  operationIds?: string[];
  confirmation?: {
    acceptedRiskLevel: 'low' | 'medium' | 'high';
  };
}

export interface ApplyProposalResponse {
  ok: boolean;
  transactionId: string;
  writtenFiles: string[];
  auditEntryId: string;
}

export interface RejectProposalResponse {
  ok: boolean;
  proposalId: string;
  state: 'rejected';
}
