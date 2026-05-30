import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import type {
  AgentEditProposal,
  AgentOperation,
  OperationKind,
  ProposalValidation,
  ValidationCheck,
} from '../app/lib/agent-chat-types.ts';
import { readManifest, writeManifest } from '../files/folders.ts';
import { addSlideToDeck, updateDeck } from '../files/slide-management.ts';
import { createBlankSlide, createBlankSlideSource } from '../files/slide-ops.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { resolveSlideEntryPath } from '../vite/routes/context.ts';
import { patchMetaInSource, writeMetaPatch } from './meta-source.ts';

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
    fingerprints: proposal.fingerprints,
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

      const syntax = validateTsxSource(code);
      if (syntax.ok) {
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: 'pass',
          message: 'Syntax check passed.',
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: 'fail',
          message: syntax.message,
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
      if (themeId) {
        let themesList: { id: string }[] = [];
        try {
          // Dynamic import prevents static bundling crashes on the server side
          const themeModule = await import('virtual:awesome-slide/themes');
          themesList = themeModule.themes || [];
        } catch {
          // Fallback if virtual module is not resolvable in current environment
        }

        const themeExists = themesList.some((t) => t.id === themeId);
        if (themesList.length > 0 && !themeExists) {
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
            message: `Theme "${themeId}" will be applied.`,
          });
        }
      } else {
        checks.push({
          id: checkId,
          kind: 'theme-exists',
          status: 'fail',
          message: 'apply-theme operation is missing a themeId.',
        });
      }
    } else if (op.kind === 'create-slide') {
      const payload = op.payload as { title?: string; code?: string } | undefined;
      if (!payload?.title) {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'fail',
          message: 'create-slide operation is missing a title.',
        });
      } else if (payload.code) {
        const syntax = validateTsxSource(payload.code);
        checks.push({
          id: checkId,
          kind: 'tsx-parse',
          status: syntax.ok ? 'pass' : 'fail',
          message: syntax.ok ? 'create-slide source syntax check passed.' : syntax.message,
        });
      } else {
        checks.push({
          id: checkId,
          kind: 'mutation-guard',
          status: 'pass',
          message: 'create-slide has a valid title.',
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

export type AgentProposalApplyErrorCategory =
  | 'patch-conflict'
  | 'validation-failure'
  | 'write-failure';

export type AgentProposalApplyResult =
  | {
      ok: true;
      transactionId: string;
      proposal: AgentEditProposal;
      state: 'applied' | 'partially-applied';
      writtenFiles: string[];
      selectedOperationIds: string[];
    }
  | {
      ok: false;
      status: number;
      category: AgentProposalApplyErrorCategory;
      message: string;
      diagnostics?: string;
      proposal: AgentEditProposal;
    };

type FileBackup = { existed: true; content: string } | { existed: false };

function validateTsxSource(code: string): { ok: true } | { ok: false; message: string } {
  if (!code.trim()) {
    return { ok: false, message: 'TSX source is empty.' };
  }

  try {
    parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false,
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `TSX parse failed: ${message}` };
  }
}

function transactionId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function selectedOperations(
  proposal: AgentEditProposal,
  operationIds: readonly string[] = [],
): AgentOperation[] {
  if (operationIds.length === 0) {
    return proposal.operations;
  }
  const selected = new Set(operationIds);
  return proposal.operations.filter((operation) => selected.has(operation.id));
}

function operationNeedsRiskConfirmation(operation: AgentOperation): boolean {
  return operation.requiresConfirmation || operation.kind === 'raw-patch';
}

function applyError(
  status: number,
  category: AgentProposalApplyErrorCategory,
  message: string,
  proposal: AgentEditProposal,
  diagnostics?: string,
): AgentProposalApplyResult {
  return { ok: false, status, category, message, proposal, diagnostics };
}

async function backupFile(filePath: string, backups: Map<string, FileBackup>): Promise<void> {
  if (backups.has(filePath)) return;
  try {
    backups.set(filePath, { existed: true, content: await fs.readFile(filePath, 'utf8') });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      backups.set(filePath, { existed: false });
      return;
    }
    throw error;
  }
}

async function rollbackFiles(backups: Map<string, FileBackup>, createdDirs: Set<string>) {
  for (const [filePath, backup] of backups) {
    if (backup.existed) {
      await fs.writeFile(filePath, backup.content, 'utf8').catch(() => {});
    } else {
      await fs.rm(filePath, { force: true }).catch(() => {});
    }
  }
  for (const dir of createdDirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function writtenRelative(ctx: ApiContext, filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    return filePath.split(path.sep).join('/');
  }
  const relative = path.relative(ctx.userCwd, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.basename(filePath);
  }
  return relative.split(path.sep).join('/');
}

function codePayload(operation: AgentOperation): string {
  const payload = operation.payload as { code?: unknown } | undefined;
  return typeof payload?.code === 'string' ? payload.code : '';
}

function titlePayload(operation: AgentOperation): string {
  const payload = operation.payload as { title?: unknown } | undefined;
  return typeof payload?.title === 'string' ? payload.title.trim() : '';
}

function slideIdPayload(operation: AgentOperation): string {
  const payload = operation.payload as { slideId?: unknown; id?: unknown } | undefined;
  if (typeof payload?.slideId === 'string') return payload.slideId;
  if (typeof payload?.id === 'string') return payload.id;
  return operation.target;
}

async function applySlideSourceOperation(
  ctx: ApiContext,
  operation: AgentOperation,
  backups: Map<string, FileBackup>,
): Promise<string> {
  const filePath = resolveSlideEntryPath(ctx, operation.target);
  if (!filePath) {
    throw new Error(`Invalid slide target: ${operation.target}`);
  }
  const code = codePayload(operation);
  await backupFile(filePath, backups);
  await fs.writeFile(filePath, code, 'utf8');
  return writtenRelative(ctx, filePath);
}

async function applySlideMetadataOperation(
  ctx: ApiContext,
  operation: AgentOperation,
  backups: Map<string, FileBackup>,
): Promise<string> {
  const payload = operation.payload as { patch?: Record<string, unknown> } | undefined;
  const patch = payload?.patch || {};
  const filePath = resolveSlideEntryPath(ctx, operation.target);
  if (!filePath) {
    throw new Error(`Invalid slide target: ${operation.target}`);
  }
  await backupFile(filePath, backups);
  const result = await writeMetaPatch(filePath, patch);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return writtenRelative(ctx, filePath);
}

async function applyThemeOrNotesOperation(
  ctx: ApiContext,
  operation: AgentOperation,
  backups: Map<string, FileBackup>,
): Promise<string> {
  const payload = operation.payload as { themeId?: unknown; notes?: unknown } | undefined;
  const filePath = resolveSlideEntryPath(ctx, operation.target);
  if (!filePath) {
    throw new Error(`Invalid slide target: ${operation.target}`);
  }
  await backupFile(filePath, backups);
  const source = await fs.readFile(filePath, 'utf8');
  const patch =
    operation.kind === 'apply-theme'
      ? { theme: typeof payload?.themeId === 'string' ? payload.themeId : undefined }
      : { notes: typeof payload?.notes === 'string' ? payload.notes : undefined };
  const updated = patchMetaInSource(source, patch);
  if (!updated) {
    throw new Error(`Failed to patch ${operation.kind} in slide source`);
  }
  await fs.writeFile(filePath, updated, 'utf8');
  return writtenRelative(ctx, filePath);
}

async function applyCreateSlideOperation(
  ctx: ApiContext,
  operation: AgentOperation,
  backups: Map<string, FileBackup>,
  createdDirs: Set<string>,
): Promise<string[]> {
  const slideId = slideIdPayload(operation);
  const title = titlePayload(operation);
  const dir = path.resolve(ctx.slidesRoot, slideId);
  const filePath = path.join(dir, 'index.tsx');
  await backupFile(filePath, backups);
  const result = await createBlankSlide(ctx.slidesRoot, slideId, title);
  if (!result.ok) {
    throw new Error(result.error);
  }
  createdDirs.add(dir);

  const code = codePayload(operation);
  if (code) {
    await fs.writeFile(filePath, code, 'utf8');
  } else {
    await fs.writeFile(filePath, createBlankSlideSource(title, new Date().toISOString()), 'utf8');
  }

  const payload = operation.payload as { deckId?: unknown; folderId?: unknown } | undefined;
  const manifest = await readManifest(ctx.manifestPath);
  let nextManifest = manifest;
  if (typeof payload?.folderId === 'string') {
    nextManifest = {
      ...nextManifest,
      assignments: { ...nextManifest.assignments, [slideId]: payload.folderId },
    };
  }
  if (typeof payload?.deckId === 'string') {
    const updated = addSlideToDeck(nextManifest, payload.deckId, slideId);
    if (!updated) {
      throw new Error(`Deck not found: ${payload.deckId}`);
    }
    nextManifest = updated;
  }
  await writeManifest(ctx.manifestPath, nextManifest);
  return [writtenRelative(ctx, filePath), writtenRelative(ctx, ctx.manifestPath)];
}

async function applyDeckOperation(ctx: ApiContext, operation: AgentOperation): Promise<string[]> {
  const manifest = await readManifest(ctx.manifestPath);
  const payload = operation.payload as {
    name?: unknown;
    description?: unknown;
    theme?: unknown;
    deckId?: unknown;
    slideOrder?: unknown;
  };
  const deckId =
    typeof payload?.deckId === 'string' && payload.deckId ? payload.deckId : operation.target;

  let nextManifest = manifest;
  if (operation.kind === 'update-deck') {
    const updated = updateDeck(nextManifest, deckId, {
      name: typeof payload?.name === 'string' ? payload.name : undefined,
      description: typeof payload?.description === 'string' ? payload.description : undefined,
      theme: typeof payload?.theme === 'string' ? payload.theme : undefined,
    });
    if (!updated) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    nextManifest = updated;
  } else {
    if (!Array.isArray(payload?.slideOrder)) {
      throw new Error('reorder-pages requires slideOrder.');
    }
    const slideOrder = payload.slideOrder.filter((slideId): slideId is string => {
      return typeof slideId === 'string';
    });
    const updated = updateDeck(nextManifest, deckId, { slideOrder });
    if (!updated) {
      throw new Error(`Deck not found: ${deckId}`);
    }
    nextManifest = updated;
  }
  await writeManifest(ctx.manifestPath, nextManifest);
  return [
    writtenRelative(ctx, ctx.manifestPath),
    operation.kind === 'reorder-pages' ? `decks/${deckId}/order` : `decks/${deckId}`,
  ];
}

export async function applyAgentProposalTransaction(
  ctx: ApiContext,
  proposal: AgentEditProposal,
  opts: {
    operationIds?: readonly string[];
    confirmedHighRisk?: boolean;
    currentContents?: Record<string, string>;
  } = {},
): Promise<AgentProposalApplyResult> {
  if (proposal.validation.status === 'conflict') {
    return applyError(
      409,
      'patch-conflict',
      'Source file changed after proposal creation.',
      proposal,
    );
  }
  if (proposal.validation.status === 'invalid') {
    return applyError(422, 'validation-failure', 'Proposal validation failed.', proposal);
  }

  const operations = selectedOperations(proposal, opts.operationIds);
  if (operations.length === 0) {
    return applyError(
      400,
      'validation-failure',
      'No valid operations selected to apply.',
      proposal,
    );
  }
  if (proposal.state === 'rejected' || proposal.state === 'applied') {
    return applyError(
      422,
      'validation-failure',
      `Proposal is already ${proposal.state}.`,
      proposal,
    );
  }
  if (
    (proposal.riskLevel === 'high' || operations.some(operationNeedsRiskConfirmation)) &&
    !opts.confirmedHighRisk
  ) {
    proposal.validation = {
      status: 'pending',
      checks: [
        ...(proposal.validation?.checks ?? []),
        {
          id: 'check_high_risk_confirmation',
          kind: 'risk-confirmation',
          status: 'fail',
          message: 'High-risk proposal apply requires explicit confirmation.',
        },
      ],
      validatedAt: new Date().toISOString(),
    };
    return applyError(
      428,
      'validation-failure',
      'High-risk changes require confirmation.',
      proposal,
    );
  }

  const validation = await validateProposal({ ...proposal, operations }, opts.currentContents);
  proposal.validation = validation;
  const selectedIds = new Set(operations.map((operation) => operation.id));
  for (const operation of proposal.operations) {
    if (!selectedIds.has(operation.id)) {
      continue;
    }
    const check = validation.checks.find(
      (candidate) =>
        candidate.id === `check_${operation.id}` || candidate.id === `conflict_${operation.id}`,
    );
    operation.validationState =
      check?.status === 'fail'
        ? check.kind === 'source-conflict'
          ? 'conflict'
          : 'invalid'
        : 'valid';
  }

  if (validation.status === 'conflict') {
    proposal.state = 'conflict';
    return applyError(
      409,
      'patch-conflict',
      'Source file changed after proposal creation.',
      proposal,
    );
  }
  if (validation.status === 'invalid') {
    return applyError(422, 'validation-failure', 'Proposal validation failed.', proposal);
  }

  const backups = new Map<string, FileBackup>();
  const createdDirs = new Set<string>();
  await backupFile(ctx.manifestPath, backups);

  const writtenFiles: string[] = [];
  try {
    for (const operation of operations) {
      let written: string | string[] | null = null;
      if (operation.kind === 'patch-slide-source' || operation.kind === 'raw-patch') {
        written = await applySlideSourceOperation(ctx, operation, backups);
      } else if (operation.kind === 'patch-slide-metadata') {
        written = await applySlideMetadataOperation(ctx, operation, backups);
      } else if (operation.kind === 'apply-theme' || operation.kind === 'update-speaker-notes') {
        written = await applyThemeOrNotesOperation(ctx, operation, backups);
      } else if (operation.kind === 'create-slide') {
        written = await applyCreateSlideOperation(ctx, operation, backups, createdDirs);
      } else if (operation.kind === 'update-deck' || operation.kind === 'reorder-pages') {
        written = await applyDeckOperation(ctx, operation);
      } else {
        const unreachable: OperationKind = operation.kind;
        throw new Error(`Unsupported operation: ${unreachable}`);
      }

      if (Array.isArray(written)) {
        writtenFiles.push(...written);
      } else if (written) {
        writtenFiles.push(written);
      }
    }
  } catch (error) {
    await rollbackFiles(backups, createdDirs);
    const diagnostics = error instanceof Error ? error.message : String(error);
    proposal.state = 'pending-review';
    return applyError(
      500,
      'write-failure',
      'Proposal apply failed and was rolled back.',
      proposal,
      diagnostics,
    );
  }

  const uniqueWrittenFiles = Array.from(new Set(writtenFiles));
  const state = operations.length === proposal.operations.length ? 'applied' : 'partially-applied';
  proposal.state = state;

  return {
    ok: true,
    transactionId: transactionId(),
    proposal,
    state,
    writtenFiles: uniqueWrittenFiles,
    selectedOperationIds: operations.map((operation) => operation.id),
  };
}
