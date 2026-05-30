import type {
  AgentEditProposal,
  AgentOperation,
  GeneratedFileSummary,
  OperationKind,
  PreviewArtifact,
} from '../app/lib/agent-chat-types.ts';
import { classifyRiskLevel, normalizeProposal } from '../editing/agent-proposals.ts';
import type { RuntimeError } from './contracts.ts';
import { redactText } from './redaction.ts';

const PROPOSAL_KIND = 'awesome-slide-proposal';

const SUPPORTED_OPERATION_KINDS = new Set<OperationKind>([
  'patch-slide-source',
  'patch-slide-metadata',
  'update-speaker-notes',
  'create-slide',
  'reorder-pages',
  'apply-theme',
  'update-deck',
  'raw-patch',
]);

const VALID_SCOPES = new Set<AgentEditProposal['scope']>(['selection', 'slide', 'deck', 'project']);

const VALID_RISK_LEVELS = new Set<AgentEditProposal['riskLevel']>(['low', 'medium', 'high']);

export type ProposalOutputParseResult =
  | {
      ok: true;
      proposal: AgentEditProposal;
      fileSummary: GeneratedFileSummary;
    }
  | {
      ok: false;
      error: RuntimeError;
    };

function proposalError(message: string, diagnostics?: string): ProposalOutputParseResult {
  return {
    ok: false,
    error: {
      category: 'invalid-agent-output',
      message,
      diagnostics: diagnostics ? redactText(diagnostics) : undefined,
      recoveryActions: ['retry', 'edit-prompt', 'copy-diagnostics'],
    },
  };
}

function parserError(message: string, diagnostics?: string): ProposalOutputParseResult {
  return {
    ok: false,
    error: {
      category: 'parser-error',
      message,
      diagnostics: diagnostics ? redactText(diagnostics) : undefined,
      recoveryActions: ['retry', 'edit-prompt', 'copy-diagnostics'],
    },
  };
}

export function containsProposalEnvelope(input: string): boolean {
  return input.includes(PROPOSAL_KIND) || input.includes('"operations"');
}

function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function extractJsonCandidate(input: string): string | null {
  const stripped = stripCodeFence(input);
  if (stripped.startsWith('{') && stripped.endsWith('}')) {
    return stripped;
  }

  const marker = stripped.indexOf(PROPOSAL_KIND);
  if (marker === -1) {
    return null;
  }

  const start = stripped.lastIndexOf('{', marker);
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }
  return stripped.slice(start, end + 1);
}

function parseEnvelope(input: unknown):
  | { ok: true; envelope: Record<string, unknown> }
  | {
      ok: false;
      error: ProposalOutputParseResult;
    } {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return { ok: true, envelope: input as Record<string, unknown> };
  }

  if (typeof input !== 'string') {
    return { ok: false, error: proposalError('Agent output must be a proposal object or JSON.') };
  }

  const candidate = extractJsonCandidate(input);
  if (!candidate) {
    return { ok: false, error: proposalError('Agent output did not include a proposal envelope.') };
  }

  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: proposalError('Proposal envelope must be a JSON object.') };
    }
    return { ok: true, envelope: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: parserError(
        'Proposal envelope could not be parsed as JSON.',
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeScope(value: unknown): AgentEditProposal['scope'] {
  return VALID_SCOPES.has(value as AgentEditProposal['scope'])
    ? (value as AgentEditProposal['scope'])
    : 'slide';
}

function normalizeRisk(
  value: unknown,
  operations: AgentOperation[],
): AgentEditProposal['riskLevel'] {
  return VALID_RISK_LEVELS.has(value as AgentEditProposal['riskLevel'])
    ? (value as AgentEditProposal['riskLevel'])
    : classifyRiskLevel(operations);
}

function generatedPathForOperation(operation: AgentOperation): string {
  const payload = operation.payload as Record<string, unknown> | undefined;
  if (operation.kind === 'create-slide') {
    const slideId = stringValue(payload?.slideId) ?? stringValue(payload?.id) ?? operation.target;
    return `slides/${slideId}/index.tsx`;
  }
  if (
    operation.kind === 'patch-slide-source' ||
    operation.kind === 'raw-patch' ||
    operation.kind === 'patch-slide-metadata' ||
    operation.kind === 'update-speaker-notes' ||
    operation.kind === 'apply-theme'
  ) {
    return operation.target.includes('/')
      ? operation.target
      : `slides/${operation.target}/index.tsx`;
  }
  if (operation.kind === 'update-deck' || operation.kind === 'reorder-pages') {
    return `decks/${operation.target}`;
  }
  return operation.target;
}

function normalizeOperation(raw: unknown, index: number): AgentOperation | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const input = raw as Record<string, unknown>;
  const kind = input.kind as OperationKind;
  if (!SUPPORTED_OPERATION_KINDS.has(kind)) {
    return null;
  }
  const target = stringValue(input.target);
  if (!target) {
    return null;
  }

  const payload = input.payload && typeof input.payload === 'object' ? input.payload : {};
  const requiresConfirmation =
    typeof input.requiresConfirmation === 'boolean'
      ? input.requiresConfirmation
      : kind === 'apply-theme' || kind === 'raw-patch';

  return {
    id: stringValue(input.id) ?? stringValue(input.operationId) ?? `op_${index + 1}`,
    kind,
    target,
    description: stringValue(input.description) ?? `${kind} ${target}`,
    payload,
    requiresConfirmation,
    validationState: 'pending',
    reversible: typeof input.reversible === 'boolean' ? input.reversible : kind !== 'raw-patch',
  };
}

function buildSourceDiffArtifact(operation: AgentOperation): PreviewArtifact | null {
  if (operation.kind !== 'patch-slide-source' && operation.kind !== 'raw-patch') {
    return null;
  }
  const payload = operation.payload as { code?: unknown } | undefined;
  if (typeof payload?.code !== 'string' || !payload.code.trim()) {
    return null;
  }
  const lines = payload.code
    .split('\n')
    .slice(0, 120)
    .map((line) => `+ ${line}`)
    .join('\n');
  return {
    id: `artifact_diff_${operation.id}`,
    kind: 'source-diff',
    operationIds: [operation.id],
    summary: operation.target,
    inlineContent: lines,
    truncated: payload.code.split('\n').length > 120,
  };
}

function buildPreviewArtifacts(operations: AgentOperation[]): PreviewArtifact[] {
  const artifacts: PreviewArtifact[] = [
    {
      id: 'artifact_operations',
      kind: 'operation-list',
      operationIds: operations.map((operation) => operation.id),
      summary: `${operations.length} proposed operation${operations.length === 1 ? '' : 's'}`,
      truncated: false,
    },
    {
      id: 'artifact_generated_files',
      kind: 'generated-file-summary',
      operationIds: operations.map((operation) => operation.id),
      summary: 'Generated source files from this proposal',
      truncated: false,
    },
  ];

  for (const operation of operations) {
    const diff = buildSourceDiffArtifact(operation);
    if (diff) artifacts.push(diff);
  }

  return artifacts;
}

function buildGeneratedFileSummary(operations: AgentOperation[]): GeneratedFileSummary {
  return {
    files: operations.map((operation) => ({
      operationId: operation.id,
      operationKind: operation.kind,
      path: generatedPathForOperation(operation),
      target: operation.target,
      summary: operation.description,
    })),
    truncated: false,
  };
}

export function parseProposalOutput(
  input: unknown,
  options: { runId: string; proposalId?: string; now?: () => string },
): ProposalOutputParseResult {
  const parsed = parseEnvelope(input);
  if (!parsed.ok) {
    return parsed.error;
  }

  const envelope = parsed.envelope;
  if (envelope.kind !== PROPOSAL_KIND) {
    return proposalError('Proposal envelope kind is unsupported.');
  }
  if (!Array.isArray(envelope.operations) || envelope.operations.length === 0) {
    return proposalError('Proposal envelope must include at least one operation.');
  }

  const operations: AgentOperation[] = [];
  for (let index = 0; index < envelope.operations.length; index += 1) {
    const operation = normalizeOperation(envelope.operations[index], index);
    if (!operation) {
      return proposalError(`Proposal operation ${index + 1} is unsupported or invalid.`);
    }
    operations.push(operation);
  }

  const now = options.now?.() ?? new Date().toISOString();
  const proposal = normalizeProposal({
    id: options.proposalId ?? stringValue(envelope.proposalId) ?? `prop_${Date.now()}`,
    runId: options.runId,
    summary: stringValue(envelope.summary) ?? 'Proposed slide changes',
    scope: normalizeScope(envelope.scope),
    riskLevel: normalizeRisk(envelope.riskLevel, operations),
    operations,
    previewArtifacts: buildPreviewArtifacts(operations),
    validation: { status: 'pending', checks: [] },
    state: 'pending-review',
    createdAt: now,
  });

  return {
    ok: true,
    proposal,
    fileSummary: buildGeneratedFileSummary(proposal.operations),
  };
}
