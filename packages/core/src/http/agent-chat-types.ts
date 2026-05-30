import type { RefreshPayload } from '../agent-runtime/file-refresh.ts';
import type {
  AgentChatContext,
  AgentChatSession,
  AgentConnectionRef,
  ContextPreference,
  RunState,
  RuntimeMode,
  SuggestedAction,
} from '../app/lib/agent-chat-types.ts';

export interface GetSessionResponse {
  session: AgentChatSession;
  conversation?: {
    conversationId: string;
    activeRunId: string | null;
    activeSlideId?: string;
    messages: AgentChatSession['messages'];
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
  confirmedHighRisk?: boolean;
  confirmation?: {
    acceptedRiskLevel: 'low' | 'medium' | 'high';
  };
}

export interface ApplyProposalResponse {
  ok: boolean;
  transactionId: string;
  proposalId: string;
  state: 'applied' | 'partially-applied';
  writtenFiles: string[];
  refresh: RefreshPayload;
  auditEntryId: string;
}

export interface RejectProposalResponse {
  ok: boolean;
  proposalId: string;
  state: 'rejected';
}
