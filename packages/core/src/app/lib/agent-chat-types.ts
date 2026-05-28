import type { DeckId, FolderId, SlideId } from './sdk.ts';

export type RuntimeMode = 'interactive' | 'read-only';

export interface AgentConnectionRef {
  connectionId: string;
  displayName: string;
  type: 'local-agent' | 'manual-agent' | 'api-provider';
  modelOrAgent: string;
  status: 'ready' | 'needs-setup' | 'testing' | 'degraded' | 'failed' | 'offline';
}

export interface ContextPreference {
  id: string;
  kind:
    | 'current-slide'
    | 'selected-elements'
    | 'deck'
    | 'folder'
    | 'theme'
    | 'speaker-notes'
    | 'source-excerpt'
    | 'rendered-snapshot';
  enabled: boolean;
  required: boolean;
  label: string;
  budgetBytes?: number;
}

export interface SourceExcerpt {
  filePath: string;
  content: string;
  language?: string;
  startLine?: number;
  endLine?: number;
}

export interface SelectedElementDescriptor {
  slideId: SlideId;
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

export interface AgentChatContext {
  project: { name?: string; rootLabel?: string };
  slide?: { id: SlideId; title?: string; pageIndex?: number; pageCount?: number; status?: string };
  selection?: SelectedElementDescriptor[];
  collection?: { folderId?: FolderId; deckId?: DeckId; slideIds?: SlideId[] };
  theme?: { activeThemeId?: string; availableThemeIds: string[]; summaries: ThemeSummary[] };
  notes?: { included: boolean; currentPage?: string; deckSummary?: string };
  source?: { excerpts: SourceExcerpt[]; totalBytes: number; truncated: boolean };
  limits: { maxBytes: number; generatedAt: string };
}

export type SuggestedActionId =
  | 'improve-copy'
  | 'shorten-content'
  | 'redesign-layout'
  | 'apply-theme'
  | 'generate-speaker-notes'
  | 'fix-alignment'
  | 'create-related-slide';

export interface SuggestedAction {
  id: SuggestedActionId;
  label: string;
  promptTemplate: string;
  defaultContextKinds: ContextPreference['kind'][];
  scope: 'selection' | 'slide' | 'deck';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AgentChatError {
  category:
    | 'connection-unavailable'
    | 'authentication-failed'
    | 'model-failed'
    | 'timeout'
    | 'invalid-agent-output'
    | 'patch-conflict'
    | 'validation-failure'
    | 'write-failure'
    | 'cancelled';
  message: string;
  recoveryActions: Array<
    'retry' | 'edit-prompt' | 'change-connection' | 'copy-diagnostics' | 'reject' | 'refresh'
  >;
  diagnostics?: string;
}

export type MessagePartType = 'text' | 'progress' | 'proposal-summary' | 'diagnostic';

export interface MessagePart {
  type: MessagePartType;
  text?: string;
  data?: unknown;
}

export type MessageRole = 'user' | 'assistant' | 'status';

export type MessageState =
  | 'draft'
  | 'queued'
  | 'loading'
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'needs-review';

export interface AgentChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: MessagePart[];
  runId?: string;
  proposalId?: string;
  state: MessageState;
  error?: AgentChatError;
  createdAt: string;
  completedAt?: string;
}

export interface AgentChatSession {
  id: string;
  projectKey: string;
  origin: 'slide-workspace' | 'slide-management';
  activeSlideId?: SlideId;
  activeDeckId?: DeckId;
  messages: AgentChatMessage[];
  contextPreferences: ContextPreference[];
  currentRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RunState =
  | 'queued'
  | 'loading'
  | 'streaming'
  | 'needs-review'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface AgentChatRun {
  id: string;
  sessionId: string;
  prompt: string;
  actionId?: SuggestedActionId;
  context: AgentChatContext;
  connection: AgentConnectionRef;
  state: RunState;
  events: AgentChatEvent[];
  proposalId?: string;
  startedAt: string;
  finishedAt?: string;
}

export type EventType =
  | 'queued'
  | 'token'
  | 'progress'
  | 'proposal'
  | 'diagnostic'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface AgentChatEvent {
  sequence: number;
  runId: string;
  type: EventType;
  payload: unknown;
  createdAt: string;
}

export type ProposalState =
  | 'pending-review'
  | 'applied'
  | 'partially-applied'
  | 'rejected'
  | 'expired'
  | 'conflict';

export interface AgentEditProposal {
  id: string;
  runId: string;
  summary: string;
  scope: 'selection' | 'slide' | 'deck' | 'project';
  riskLevel: 'low' | 'medium' | 'high';
  operations: AgentOperation[];
  previewArtifacts: PreviewArtifact[];
  validation: ProposalValidation;
  state: ProposalState;
  createdAt: string;
}

export type OperationKind =
  | 'patch-slide-source'
  | 'patch-slide-metadata'
  | 'update-speaker-notes'
  | 'create-slide'
  | 'reorder-pages'
  | 'apply-theme'
  | 'update-deck'
  | 'raw-patch';

export interface AgentOperation {
  id: string;
  kind: OperationKind;
  target: string;
  description: string;
  payload: unknown;
  requiresConfirmation: boolean;
  validationState: 'pending' | 'valid' | 'invalid' | 'conflict';
  reversible: boolean;
}

export interface PreviewArtifact {
  id: string;
  kind: 'operation-list' | 'source-diff' | 'rendered-before-after' | 'diagnostics';
  operationIds: string[];
  summary: string;
  contentRef?: string;
  inlineContent?: string;
  truncated: boolean;
}

export interface ProposalValidation {
  status: 'pending' | 'valid' | 'invalid' | 'conflict';
  checks: ValidationCheck[];
  validatedAt?: string;
}

export interface ValidationCheck {
  id: string;
  kind:
    | 'tsx-parse'
    | 'metadata-schema'
    | 'theme-exists'
    | 'deck-exists'
    | 'source-conflict'
    | 'mutation-guard'
    | 'typecheck';
  status: 'pass' | 'warn' | 'fail' | 'skipped';
  message: string;
}

export interface ApplyTransaction {
  id: string;
  proposalId: string;
  selectedOperationIds: string[];
  state: 'applying' | 'applied' | 'failed' | 'rolled-back';
  writtenFiles: string[];
  auditEntryId?: string;
  startedAt: string;
  finishedAt?: string;
  error?: AgentChatError;
}

export interface AgentAuditEntry {
  id: string;
  timestamp: string;
  prompt: string;
  contextSummary: string;
  proposalSummary: string;
  appliedFiles: string[];
  operationKinds: OperationKind[];
  connection: AgentConnectionRef;
  validationSummary: string;
}
