import type {
  ConnectionCapabilities,
  ConnectionStatus,
  ConnectionStatusState,
} from '../app/lib/agent-connection-types.ts';

export type RuntimeMode = 'interactive' | 'read-only';

export type RuntimeConnectionType = 'local-agent' | 'manual-agent' | 'api-provider' | 'fixture';

export type RuntimeRunState =
  | 'queued'
  | 'running'
  | 'needs-review'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type RuntimeEventType =
  | 'queued'
  | 'started'
  | 'progress'
  | 'text_delta'
  | 'thinking_delta'
  | 'tool_call'
  | 'tool_result'
  | 'proposal'
  | 'file_summary'
  | 'diagnostic'
  | 'error'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type RuntimeEventSource =
  | 'runtime'
  | 'provider'
  | 'local-agent'
  | 'proposal'
  | 'tool'
  | 'fixture';

export type RuntimeErrorCategory =
  | 'connection-unavailable'
  | 'authentication-failed'
  | 'quota-rate-limit'
  | 'unsupported-model'
  | 'provider-offline'
  | 'missing-executable'
  | 'invalid-path'
  | 'incompatible-protocol'
  | 'timeout'
  | 'parser-error'
  | 'model-empty-output'
  | 'invalid-agent-output'
  | 'patch-conflict'
  | 'validation-failure'
  | 'write-failure'
  | 'cancelled'
  | 'unknown';

export type RuntimeRecoveryAction =
  | 'retry'
  | 'edit-prompt'
  | 'change-connection'
  | 'copy-diagnostics'
  | 'reject'
  | 'refresh'
  | 'open-settings'
  | 'auto-scan'
  | 'edit-path'
  | 'choose-model'
  | 'test-again'
  | 'rescan'
  | 'use-byok'
  | 'delete-credential';

export interface RuntimeError {
  category: RuntimeErrorCategory;
  message: string;
  recoveryActions: RuntimeRecoveryAction[];
  diagnostics?: string;
}

export interface RuntimeConnectionSnapshot {
  connectionId: string;
  displayName: string;
  type: RuntimeConnectionType;
  provider: string;
  modelOrAgent: string;
  modelId?: string;
  reasoningEffort?: string;
  capabilities: ConnectionCapabilities;
  status: ConnectionStatusState;
  statusDetails?: ConnectionStatus;
  settingsTarget: 'execution-model';
  isProjectDefault?: boolean;
}

export interface RuntimeProject {
  projectId: string;
  rootPath: string;
  rootLabel: string;
  slidesRoot?: string;
  themesRoot?: string;
  assetsRoot?: string;
  runtimeMode: RuntimeMode;
  storageRoot: string;
}

export interface RuntimeConversation {
  conversationId: string;
  projectId: string;
  origin: 'slide-workspace' | 'slide-management';
  activeSlideId?: string;
  activeDeckId?: string;
  messageIds: string[];
  activeRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RuntimeMessageRole = 'user' | 'assistant' | 'status';

export interface RuntimeMessagePart {
  type: 'text' | 'progress' | 'proposal-summary' | 'diagnostic' | 'file-summary';
  text?: string;
  data?: unknown;
}

export interface RuntimeChatMessage {
  messageId: string;
  conversationId: string;
  role: RuntimeMessageRole;
  parts: RuntimeMessagePart[];
  state: RuntimeRunState | 'draft';
  runId?: string;
  proposalId?: string;
  error?: RuntimeError;
  createdAt: string;
  completedAt?: string;
}

export interface RuntimeEvent {
  sequence: number;
  runId: string;
  type: RuntimeEventType;
  payload: unknown;
  createdAt: string;
  source: RuntimeEventSource;
}

export interface RuntimeRun {
  runId: string;
  conversationId: string;
  prompt: string;
  actionId?: string;
  promptPackageId: string;
  connectionSnapshot: RuntimeConnectionSnapshot;
  contextSnapshotId: string;
  state: RuntimeRunState;
  eventCursor: number;
  startedAt: string;
  finishedAt?: string;
  terminalReason?: RuntimeErrorCategory | 'completed' | 'needs-review';
  retryOfRunId?: string;
  proposalIds: string[];
}

export interface SourceExcerpt {
  filePath: string;
  content: string;
  language?: string;
  startLine?: number;
  endLine?: number;
}

export interface SelectedElementDescriptor {
  slideId: string;
  pageIndex: number;
  tagName?: string;
  textPreview?: string;
  sourceLocation?: { line: number; column?: number };
  bounds?: { x: number; y: number; width: number; height: number };
  editableProperties: string[];
}

export interface ThemeSummary {
  themeId: string;
  name: string;
  colors: Record<string, string>;
}

export interface ContextSnapshot {
  contextSnapshotId: string;
  project: { name?: string; rootLabel?: string };
  slide?: {
    id: string;
    title?: string;
    pageIndex?: number;
    pageCount?: number;
    status?: string;
    sourceState?: string;
  };
  selection?: SelectedElementDescriptor[];
  collection?: { folderId?: string; deckId?: string; slideIds?: string[] };
  theme?: { activeThemeId?: string; availableThemeIds: string[]; summaries?: ThemeSummary[] };
  notes?: { included: boolean; currentPage?: string; deckSummary?: string };
  source?: { excerpts: SourceExcerpt[]; totalBytes: number; truncated: boolean };
  limits: { maxBytes: number; generatedAt: string };
  redactionSummary?: string[];
}

export type WorkflowId =
  | 'current-slide'
  | 'slide-authoring'
  | 'create-slide'
  | 'apply-comments'
  | 'create-theme';

export interface WorkflowRef {
  workflowId: WorkflowId;
  sourcePath: string;
  contentHash: string;
  summary: string;
  instructions: string;
}

export interface MessageTranscriptItem {
  role: 'user' | 'assistant' | 'status';
  text: string;
  runId?: string;
  createdAt?: string;
}

export interface OutputContract {
  kind: 'text-only' | 'awesome-slide-proposal';
  writeAccess: boolean;
  requiresStructuredEnvelope: boolean;
  validationChecks: string[];
}

export interface PromptPackage {
  promptPackageId: string;
  userPrompt: string;
  systemInstructions: string;
  workflowRefs: WorkflowRef[];
  context: ContextSnapshot;
  transcript: MessageTranscriptItem[];
  capabilityInstructions: string;
  outputContract: OutputContract;
  createdAt: string;
}

export type RuntimeOperationKind =
  | 'patch-slide-source'
  | 'patch-slide-metadata'
  | 'update-speaker-notes'
  | 'create-slide'
  | 'reorder-pages'
  | 'apply-theme'
  | 'update-deck'
  | 'raw-patch';

export interface RuntimeProposalOperation {
  id: string;
  kind: RuntimeOperationKind;
  target: string;
  description: string;
  payload: unknown;
  requiresConfirmation: boolean;
  validationState: 'pending' | 'valid' | 'invalid' | 'conflict';
  reversible: boolean;
}

export interface RuntimePreviewArtifact {
  id: string;
  kind:
    | 'operation-list'
    | 'source-diff'
    | 'rendered-before-after'
    | 'diagnostics'
    | 'generated-file-summary';
  operationIds: string[];
  summary: string;
  contentRef?: string;
  inlineContent?: string;
  truncated: boolean;
}

export interface RuntimeProposalValidation {
  status: 'pending' | 'valid' | 'invalid' | 'conflict';
  checks: Array<{
    id: string;
    kind: string;
    status: 'pass' | 'warn' | 'fail' | 'skipped';
    message: string;
  }>;
  validatedAt?: string;
}

export interface RuntimeEditProposal {
  proposalId: string;
  runId: string;
  summary: string;
  scope: 'selection' | 'slide' | 'deck' | 'project';
  riskLevel: 'low' | 'medium' | 'high';
  operations: RuntimeProposalOperation[];
  previewArtifacts: RuntimePreviewArtifact[];
  validation: RuntimeProposalValidation;
  state: 'pending-review' | 'applied' | 'partially-applied' | 'rejected' | 'expired' | 'conflict';
  createdAt: string;
  fingerprints?: Record<string, string>;
}

export interface RuntimeAuditSummary {
  auditEntryId: string;
  timestamp: string;
  prompt: string;
  contextSummary: string;
  proposalSummary: string;
  appliedFiles: string[];
  operationKinds: RuntimeOperationKind[];
  connection: RuntimeConnectionSnapshot;
  validationSummary: string;
}
