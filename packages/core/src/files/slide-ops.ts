import fs from 'node:fs/promises';
import path from 'node:path';
import type { MetaSourcePatch } from '../editing/meta-source.ts';
import { patchMetaInSource, readMetaFromFile, writeMetaPatch } from '../editing/meta-source.ts';
import { SLIDE_ID_RE } from '../editing/slide-ops.ts';

type FileOpResult = { ok: true } | { ok: false; status: number; error: string };

type DuplicateSlideOptions = {
  newId?: string;
  title?: string;
};

export function createBlankSlideSource(title: string, createdAt: string): string {
  return `import type { Page, SlideMeta } from '@awesome-slide/core';

export const meta: SlideMeta = {
  title: '${escapeSingleQuoted(title)}',
  status: 'draft',
  createdAt: '${createdAt}',
};

const Page1: Page = () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1a1a1a' }}>${escapeSingleQuoted(title)}</h1>
  </div>
);

export default [Page1] satisfies Page[];
`;
}

export async function createBlankSlide(
  slidesRoot: string,
  slideId: string,
  title: string,
): Promise<FileOpResult> {
  const valid = validateSlideWrite(slidesRoot, slideId, title);
  if (!valid.ok) return valid;

  const createdAt = new Date().toISOString();
  const source = createBlankSlideSource(title.trim(), createdAt);
  return writeNewSlide(valid.dir, source);
}

export async function createSlideFromTemplate(
  slidesRoot: string,
  slideId: string,
  title: string,
  templateSource: string,
  patch: MetaSourcePatch = {},
): Promise<FileOpResult> {
  const valid = validateSlideWrite(slidesRoot, slideId, title);
  if (!valid.ok) return valid;

  const createdAt = new Date().toISOString();
  const result = patchMetaInSource(templateSource, {
    ...patch,
    title: title.trim(),
    status: 'draft',
    createdAt,
  });
  if (result === null) {
    return { ok: false, status: 422, error: 'template source cannot be safely patched' };
  }

  return writeNewSlide(valid.dir, result);
}

export async function duplicateSlideDirectory(
  slidesRoot: string,
  sourceSlideId: string,
  options: DuplicateSlideOptions = {},
): Promise<{ ok: true; slideId: string } | { ok: false; status: number; error: string }> {
  if (!SLIDE_ID_RE.test(sourceSlideId)) {
    return { ok: false, status: 400, error: 'invalid slideId' };
  }
  const root = path.resolve(slidesRoot);
  const sourceDir = path.resolve(root, sourceSlideId);
  if (!isInsideRoot(root, sourceDir)) return { ok: false, status: 400, error: 'invalid slideId' };

  const sourceEntry = path.join(sourceDir, 'index.tsx');
  try {
    await fs.access(sourceEntry);
  } catch {
    return { ok: false, status: 404, error: 'slide not found' };
  }

  const newId = options.newId ?? (await nextCopyId(root, sourceSlideId));
  if (!SLIDE_ID_RE.test(newId)) return { ok: false, status: 400, error: 'invalid newId' };
  const targetDir = path.resolve(root, newId);
  if (!isInsideRoot(root, targetDir)) return { ok: false, status: 400, error: 'invalid newId' };
  try {
    await fs.access(targetDir);
    return { ok: false, status: 409, error: 'slide already exists' };
  } catch {}

  const sourceMeta = await readMetaFromFile(sourceEntry);
  if (sourceMeta.state !== 'supported' && sourceMeta.state !== 'missing') {
    return { ok: false, status: 422, error: 'copied source cannot be safely updated' };
  }

  const defaultTitle = `${sourceMeta.meta.title ?? sourceSlideId} (copy)`;
  const title = options.title?.trim() || defaultTitle;
  if (title.length > 80) return { ok: false, status: 400, error: 'invalid title' };

  try {
    await fs.cp(sourceDir, targetDir, { recursive: true, errorOnExist: true, force: false });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      return { ok: false, status: 409, error: 'slide already exists' };
    }
    return { ok: false, status: 500, error: String((err as Error).message ?? err) };
  }

  const patched = await writeMetaPatch(path.join(targetDir, 'index.tsx'), {
    title,
    createdAt: new Date().toISOString(),
    status: 'draft',
  });
  if (!patched.ok) {
    await fs.rm(targetDir, { recursive: true, force: true });
    return patched;
  }

  return { ok: true, slideId: newId };
}

export async function deleteSlideDirectory(
  slidesRoot: string,
  slideId: string,
): Promise<FileOpResult> {
  if (!SLIDE_ID_RE.test(slideId)) return { ok: false, status: 400, error: 'invalid slideId' };
  const root = path.resolve(slidesRoot);
  const dir = path.resolve(root, slideId);
  if (!isInsideRoot(root, dir)) return { ok: false, status: 400, error: 'invalid slideId' };

  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) return { ok: false, status: 404, error: 'slide not found' };
  } catch {
    return { ok: false, status: 404, error: 'slide not found' };
  }

  try {
    await fs.rm(dir, { recursive: true, force: false });
    return { ok: true };
  } catch (err) {
    return { ok: false, status: 500, error: String((err as Error).message ?? err) };
  }
}

function validateSlideWrite(
  slidesRoot: string,
  slideId: string,
  title: string,
): { ok: true; dir: string } | { ok: false; status: number; error: string } {
  if (!SLIDE_ID_RE.test(slideId)) return { ok: false, status: 400, error: 'invalid slideId' };
  if (!title.trim() || title.trim().length > 80) {
    return { ok: false, status: 400, error: 'invalid title' };
  }
  const root = path.resolve(slidesRoot);
  const dir = path.resolve(root, slideId);
  if (!isInsideRoot(root, dir)) return { ok: false, status: 400, error: 'invalid slideId' };
  return { ok: true, dir };
}

async function writeNewSlide(dir: string, source: string): Promise<FileOpResult> {
  try {
    await fs.access(dir);
    return { ok: false, status: 409, error: 'slide already exists' };
  } catch {}

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.tsx'), source, 'utf8');
    return { ok: true };
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    return { ok: false, status: 500, error: String((err as Error).message ?? err) };
  }
}

async function nextCopyId(root: string, slideId: string): Promise<string> {
  let suffix = 1;
  while (true) {
    const candidate = suffix === 1 ? `${slideId}-copy` : `${slideId}-copy-${suffix}`;
    try {
      await fs.access(path.resolve(root, candidate));
      suffix++;
    } catch {
      return candidate;
    }
  }
}

function isInsideRoot(root: string, target: string): boolean {
  return target.startsWith(root + path.sep);
}

function escapeSingleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
