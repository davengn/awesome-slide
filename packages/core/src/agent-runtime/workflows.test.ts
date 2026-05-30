import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadWorkflowRef,
  loadWorkflowRefs,
  selectWorkflowIdsForIntent,
  type WorkflowLoadError,
  workflowContentHash,
} from './workflows.ts';

async function writeSkill(root: string, id: string, content: string): Promise<void> {
  const dir = path.join(root, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), content, 'utf8');
}

describe('agent-runtime workflows', () => {
  let skillsRoot: string;

  beforeEach(async () => {
    skillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-skills-'));
  });

  afterEach(async () => {
    await fs.rm(skillsRoot, { recursive: true, force: true });
  });

  it('loads workflow instructions with a content hash and summary', async () => {
    const content = '---\ndescription: "Edit current slides"\n---\n\n# Current Slide\n';
    await writeSkill(skillsRoot, 'current-slide', content);

    const ref = await loadWorkflowRef('current-slide', { skillsRoot });

    expect(ref.workflowId).toBe('current-slide');
    expect(ref.summary).toBe('Edit current slides');
    expect(ref.contentHash).toBe(workflowContentHash(content));
  });

  it('selects workflow ids from intent and de-duplicates loaded refs', async () => {
    await writeSkill(skillsRoot, 'create-slide', '# Create Slide\n');
    await writeSkill(skillsRoot, 'slide-authoring', '# Slide Authoring\n');

    const refs = await loadWorkflowRefs(['create-slide', 'slide-authoring', 'create-slide'], {
      skillsRoot,
    });

    expect(selectWorkflowIdsForIntent({ prompt: 'Create slide about launch' })).toEqual([
      'create-slide',
      'slide-authoring',
    ]);
    expect(refs.map((ref) => ref.workflowId)).toEqual(['create-slide', 'slide-authoring']);
  });

  it('raises a workflow-specific error for missing required skill files', async () => {
    await expect(loadWorkflowRef('apply-comments', { skillsRoot })).rejects.toMatchObject({
      name: 'WorkflowLoadError',
      workflowId: 'apply-comments',
    } satisfies Partial<WorkflowLoadError>);
  });
});
