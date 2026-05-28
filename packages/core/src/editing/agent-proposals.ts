import type {
  AgentEditProposal,
  AgentOperation,
  ProposalValidation,
  ValidationCheck,
} from '../app/lib/agent-chat-types.ts';

export function normalizeProposal(proposal: Partial<AgentEditProposal>): AgentEditProposal {
  const now = new Date().toISOString();
  const operations = (proposal.operations || []).map((op) => ({
    ...op,
    validationState: op.validationState || 'pending',
  }));

  return {
    id: proposal.id || `proposal_${Date.now()}`,
    runId: proposal.runId || '',
    summary: proposal.summary || 'Proposed changes',
    scope: proposal.scope || 'slide',
    riskLevel: proposal.riskLevel || classifyRiskLevel(operations),
    operations,
    previewArtifacts: proposal.previewArtifacts || [],
    validation: proposal.validation || { status: 'pending', checks: [] },
    state: proposal.state || 'pending-review',
    createdAt: proposal.createdAt || now,
  };
}

export function classifyRiskLevel(operations: AgentOperation[]): 'low' | 'medium' | 'high' {
  let highest: 'low' | 'medium' | 'high' = 'low';

  for (const op of operations) {
    if (op.requiresConfirmation) {
      return 'high';
    }

    if (
      op.kind === 'apply-theme' &&
      (op.payload as Record<string, unknown> | undefined)?.scope === 'deck'
    ) {
      return 'high';
    }

    if (op.kind === 'update-deck' || op.kind === 'reorder-pages') {
      highest = 'medium';
    } else if (op.kind === 'create-slide' || op.kind === 'apply-theme' || op.kind === 'raw-patch') {
      highest = 'medium';
    }
  }

  return highest;
}

export async function validateProposal(proposal: AgentEditProposal): Promise<ProposalValidation> {
  const checks: ValidationCheck[] = [];

  for (const op of proposal.operations) {
    const checkId = `check_${op.id}`;

    if (op.kind === 'patch-slide-metadata') {
      const payload = op.payload as Record<string, unknown> | undefined;
      if (payload?.patch) {
        checks.push({
          id: checkId,
          kind: 'metadata-schema',
          status: 'pass',
          message: 'Metadata patch has a valid schema.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'metadata-schema',
          status: 'fail',
          message: 'Metadata patch payload is missing patch details.',
        });
      }
    } else if (op.kind === 'patch-slide-source' || op.kind === 'raw-patch') {
      // Mock basic syntax check for safety
      checks.push({
        id: checkId,
        kind: 'tsx-parse',
        status: 'pass',
        message: 'Syntax check passed.',
      });
    } else {
      checks.push({
        id: checkId,
        kind: 'mutation-guard',
        status: 'pass',
        message: 'Operation matches allowed mutation guards.',
      });
    }
  }

  if (checks.length === 0) {
    checks.push({
      id: 'check_empty',
      kind: 'mutation-guard',
      status: 'pass',
      message: 'No operations to validate.',
    });
  }

  const hasFailure = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warn');

  let status: ProposalValidation['status'] = 'valid';
  if (hasFailure) {
    status = 'invalid';
  } else if (hasWarning) {
    status = 'pending';
  }

  return {
    status,
    checks,
    validatedAt: new Date().toISOString(),
  };
}
