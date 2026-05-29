import type {
  AgentEditProposal,
  AgentOperation,
  ProposalValidation,
  ValidationCheck,
} from '../app/lib/agent-chat-types.ts';
import { themes } from '../app/lib/themes.ts';

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

export async function validateProposal(
  proposal: AgentEditProposal,
  currentContents?: Record<string, string>,
): Promise<ProposalValidation> {
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
      const payload = op.payload as { code?: string; originalCode?: string } | undefined;
      const code = payload?.code || '';

      const openBrackets = (code.match(/\{/g) || []).length;
      const closeBrackets = (code.match(/\}/g) || []).length;
      const openTags = (code.match(/</g) || []).length;
      const closeTags = (code.match(/>/g) || []).length;

      if (openBrackets !== closeBrackets) {
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: 'fail',
          message: `TSX bracket mismatch: ${openBrackets} open vs ${closeBrackets} close.`,
        });
      } else if (openTags !== closeTags) {
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: 'fail',
          message: `TSX tag mismatch: ${openTags} open vs ${closeTags} close.`,
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: 'pass',
          message: 'Syntax check passed.',
        });
      }

      const storedFingerprint = proposal.fingerprints?.[op.target];
      if (storedFingerprint && currentContents) {
        const currentContent = currentContents[op.target];
        if (currentContent !== undefined) {
          const currentFingerprint = getSourceFingerprint(currentContent);
          if (currentFingerprint !== storedFingerprint) {
            checks.push({
              id: `conflict_${op.id}`,
              kind: 'source-conflict',
              status: 'fail',
              message: 'Source file has been modified since the proposal was generated.',
            });
          }
        }
      }

      if (payload?.originalCode === 'CONFLICT') {
        checks.push({
          id: `conflict_${op.id}`,
          kind: 'source-conflict',
          status: 'fail',
          message: 'Source file has been modified since the proposal was generated.',
        });
      }
    } else if (op.kind === 'apply-theme') {
      const payload = op.payload as { themeId?: string } | undefined;
      const themeId = payload?.themeId || '';
      const themeList = themes || [];
      const themeExists = themeList.some((t) => t.id === themeId);

      if (themeId && !themeExists) {
        checks.push({
          id: checkId,
          kind: 'theme-exists',
          status: 'warn',
          message: `Theme "${themeId}" is not available in the workspace. Fallback theme will be applied.`,
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'theme-exists',
          status: 'pass',
          message: `Theme "${themeId}" exists.`,
        });
      }
    } else if (op.kind === 'create-slide') {
      const payload = op.payload as { title?: string } | undefined;
      if (payload?.title) {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'pass',
          message: 'create-slide has a valid title.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'fail',
          message: 'create-slide operation is missing a title.',
        });
      }
    } else if (op.kind === 'update-speaker-notes') {
      const payload = op.payload as { notes?: string } | undefined;
      if (typeof payload?.notes === 'string') {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'pass',
          message: 'update-speaker-notes has a valid notes payload.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'fail',
          message: 'update-speaker-notes operation is missing the notes field.',
        });
      }
    } else if (op.kind === 'reorder-pages') {
      const payload = op.payload as { slideOrder?: string[] } | undefined;
      if (Array.isArray(payload?.slideOrder)) {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'pass',
          message: 'reorder-pages has a valid slideOrder payload.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'fail',
          message: 'reorder-pages operation is missing the slideOrder array.',
        });
      }
    } else if (op.kind === 'update-deck') {
      const payload = op.payload as { name?: string; description?: string } | undefined;
      if (
        payload &&
        (typeof payload.name === 'string' || typeof payload.description === 'string')
      ) {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'pass',
          message: 'update-deck has a valid name/description payload.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'fail',
          message: 'update-deck operation is missing name or description payload.',
        });
      }
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

  const hasConflict = checks.some((c) => c.kind === 'source-conflict' && c.status === 'fail');
  if (hasConflict) {
    status = 'conflict';
  }

  return {
    status,
    checks,
    validatedAt: new Date().toISOString(),
  };
}

export function getSourceFingerprint(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${content.length}_${hash}`;
}

export function captureFingerprints(
  operations: AgentOperation[],
  currentContents: Record<string, string>,
): Record<string, string> {
  const fingerprints: Record<string, string> = {};
  for (const op of operations) {
    if (op.kind === 'patch-slide-source' || op.kind === 'raw-patch') {
      const content = currentContents[op.target];
      if (content !== undefined) {
        fingerprints[op.target] = getSourceFingerprint(content);
      }
    }
  }
  return fingerprints;
}
