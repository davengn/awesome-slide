import path from 'node:path';
import type { ContextSnapshot, SourceExcerpt } from './contracts.ts';
import { redactText } from './redaction.ts';

export interface CaptureRuntimeContextInput {
  project: { name?: string; rootPath: string; rootLabel?: string };
  slide?: ContextSnapshot['slide'];
  selection?: ContextSnapshot['selection'];
  collection?: ContextSnapshot['collection'];
  theme?: ContextSnapshot['theme'];
  notes?: ContextSnapshot['notes'];
  sourceExcerpts?: SourceExcerpt[];
  maxBytes?: number;
  now?: string;
  contextSnapshotId?: string;
}

const DEFAULT_MAX_CONTEXT_BYTES = 128 * 1024;

function normalizePathLabel(filePath: string, rootPath: string): string {
  const relative = path.relative(rootPath, filePath);
  const label =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      ? relative
      : path.basename(filePath);
  return label.replaceAll(path.sep, '/');
}

function isHiddenOrSensitivePath(filePath: string): boolean {
  return filePath
    .split(/[\\/]+/)
    .some((part) => part.startsWith('.') || part === 'node_modules' || part === 'dist');
}

function truncateContent(
  content: string,
  maxBytes: number,
): { content: string; truncated: boolean } {
  const buffer = Buffer.from(content, 'utf8');
  if (buffer.byteLength <= maxBytes) {
    return { content, truncated: false };
  }
  return {
    content: buffer.subarray(0, Math.max(0, maxBytes)).toString('utf8'),
    truncated: true,
  };
}

export function captureRuntimeContext(input: CaptureRuntimeContextInput): ContextSnapshot {
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_CONTEXT_BYTES;
  let remainingBytes = maxBytes;
  let totalBytes = 0;
  let truncated = false;
  const excerpts: SourceExcerpt[] = [];
  const redactionSummary = new Set<string>();

  for (const excerpt of input.sourceExcerpts ?? []) {
    if (isHiddenOrSensitivePath(excerpt.filePath)) {
      redactionSummary.add('hidden-file-excluded');
      continue;
    }
    const label = normalizePathLabel(excerpt.filePath, input.project.rootPath);
    const redactedContent = redactText(excerpt.content);
    if (redactedContent !== excerpt.content) {
      redactionSummary.add('source-redacted');
    }
    const budget = Math.max(0, remainingBytes);
    const limited = truncateContent(redactedContent, budget);
    if (limited.truncated || budget === 0) {
      truncated = true;
    }
    if (limited.content) {
      const byteLength = Buffer.byteLength(limited.content, 'utf8');
      excerpts.push({
        ...excerpt,
        filePath: label,
        content: limited.content,
      });
      totalBytes += byteLength;
      remainingBytes -= byteLength;
    }
  }

  return {
    contextSnapshotId: input.contextSnapshotId ?? `ctx_${Date.now().toString(36)}`,
    project: {
      name: input.project.name,
      rootLabel: input.project.rootLabel ?? path.basename(input.project.rootPath),
    },
    slide: input.slide,
    selection: input.selection,
    collection: input.collection,
    theme: input.theme,
    notes: input.notes,
    source: { excerpts, totalBytes, truncated },
    limits: {
      maxBytes,
      generatedAt: input.now ?? new Date().toISOString(),
    },
    redactionSummary: [...redactionSummary],
  };
}
