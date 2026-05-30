import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkflowId, WorkflowRef } from './contracts.ts';

export const WORKFLOW_IDS: WorkflowId[] = [
  'current-slide',
  'slide-authoring',
  'create-slide',
  'apply-comments',
  'create-theme',
];

export class WorkflowLoadError extends Error {
  constructor(
    message: string,
    readonly workflowId: WorkflowId,
  ) {
    super(message);
    this.name = 'WorkflowLoadError';
  }
}

export function defaultSkillsRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');
}

export function workflowContentHash(instructions: string): string {
  return crypto.createHash('sha256').update(instructions).digest('hex').slice(0, 16);
}

function workflowSummary(instructions: string): string {
  const description = instructions.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
  if (description) return description.trim();
  const heading = instructions.match(/^#\s+(.+)$/m)?.[1];
  if (heading) return heading.trim();
  return (
    instructions
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? 'Workflow instructions'
  );
}

export async function loadWorkflowRef(
  workflowId: WorkflowId,
  opts: { skillsRoot?: string } = {},
): Promise<WorkflowRef> {
  const sourcePath = path.join(opts.skillsRoot ?? defaultSkillsRoot(), workflowId, 'SKILL.md');
  let instructions: string;
  try {
    instructions = await fs.readFile(sourcePath, 'utf8');
  } catch {
    throw new WorkflowLoadError(`Unable to load workflow ${workflowId}.`, workflowId);
  }

  return {
    workflowId,
    sourcePath,
    contentHash: workflowContentHash(instructions),
    summary: workflowSummary(instructions),
    instructions,
  };
}

export async function loadWorkflowRefs(
  workflowIds: WorkflowId[],
  opts: { skillsRoot?: string } = {},
): Promise<WorkflowRef[]> {
  const uniqueWorkflowIds = [...new Set(workflowIds)];
  return await Promise.all(
    uniqueWorkflowIds.map((workflowId) => loadWorkflowRef(workflowId, opts)),
  );
}

export function selectWorkflowIdsForIntent(input: {
  actionId?: string;
  prompt?: string;
}): WorkflowId[] {
  const prompt = input.prompt?.toLowerCase() ?? '';
  const actionId = input.actionId ?? '';

  if (actionId.includes('comment') || prompt.includes('comment')) {
    return ['apply-comments', 'slide-authoring'];
  }
  if (
    actionId.includes('create') ||
    prompt.includes('new slide') ||
    prompt.includes('create slide') ||
    prompt.includes('deck')
  ) {
    return ['create-slide', 'slide-authoring'];
  }
  if (actionId.includes('theme') || prompt.includes('theme')) {
    return ['slide-authoring', 'create-theme'];
  }
  return ['current-slide', 'slide-authoring'];
}
