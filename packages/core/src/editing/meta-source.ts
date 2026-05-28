import fs from 'node:fs/promises';
import { parse as babelParse } from '@babel/parser';
import type { SlideMeta } from '../app/lib/sdk.ts';

export type MetaSourcePatch = {
  [K in keyof SlideMeta]?: SlideMeta[K] | null;
};

export type SourceStateResult =
  | { state: 'supported'; meta: Partial<SlideMeta> }
  | { state: 'readable-unsupported'; meta: Partial<SlideMeta> }
  | { state: 'parse-error'; meta: Partial<SlideMeta> }
  | { state: 'missing'; meta: Partial<SlideMeta> };

type MetaProperty = {
  key: string;
  value: string | string[] | null;
  valueType: 'string' | 'string[]' | 'other';
  propertyStart: number;
  propertyEnd: number;
  valueStart: number;
  valueEnd: number;
};

type MetaObjectInfo = {
  objectStart: number;
  objectEnd: number;
  unsupported: boolean;
  properties: MetaProperty[];
};

const META_KEYS = new Set([
  'title',
  'description',
  'tags',
  'theme',
  'status',
  'notes',
  'createdAt',
]);

function parseModule(source: string): Record<string, unknown> | null {
  try {
    const ast = babelParse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    }) as unknown as Record<string, unknown>;
    const errors = ast.errors;
    if (Array.isArray(errors) && errors.length > 0) return null;
    return ast;
  } catch {
    return null;
  }
}

function unwrapExpression(
  node: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' || current.type === 'TSSatisfiesExpression')
  ) {
    current = current.expression as Record<string, unknown> | undefined;
  }
  return current;
}

function staticKeyName(node: Record<string, unknown> | undefined): string | null {
  if (node?.type === 'Identifier' && typeof node.name === 'string') return node.name;
  if (node?.type === 'StringLiteral' && typeof node.value === 'string') return node.value;
  return null;
}

function literalTemplateValue(node: Record<string, unknown>): string | null {
  const expressions = (node.expressions as unknown[] | undefined) ?? [];
  if (expressions.length > 0) return null;
  const quasis = (node.quasis as Array<Record<string, unknown>> | undefined) ?? [];
  const firstValue = quasis[0]?.value as Record<string, unknown> | undefined;
  const cooked = firstValue?.cooked;
  const raw = firstValue?.raw;
  return typeof (cooked ?? raw) === 'string' ? ((cooked ?? raw) as string) : null;
}

function readPropertyValue(
  value: Record<string, unknown> | undefined,
): Pick<MetaProperty, 'value' | 'valueType'> {
  if (value?.type === 'StringLiteral' && typeof value.value === 'string') {
    return { value: value.value, valueType: 'string' };
  }
  if (value?.type === 'TemplateLiteral') {
    const literal = literalTemplateValue(value);
    return literal === null
      ? { value: null, valueType: 'other' }
      : { value: literal, valueType: 'string' };
  }
  if (value?.type === 'ArrayExpression') {
    const elements = (value.elements as Array<Record<string, unknown> | null> | undefined) ?? [];
    const items: string[] = [];
    for (const el of elements) {
      if (!el) continue;
      if (el.type !== 'StringLiteral' || typeof el.value !== 'string') {
        return { value: null, valueType: 'other' };
      }
      items.push(el.value);
    }
    return { value: items, valueType: 'string[]' };
  }
  return { value: null, valueType: 'other' };
}

function findMetaObjectInfo(
  source: string,
): MetaObjectInfo | 'parse-error' | 'missing' | 'unsupported' {
  const ast = parseModule(source);
  if (!ast) return 'parse-error';

  const body = (ast as { program?: { body?: Array<Record<string, unknown>> } }).program?.body ?? [];
  for (const stmt of body) {
    if (stmt.type !== 'ExportNamedDeclaration') continue;
    const decl = stmt.declaration as Record<string, unknown> | undefined;
    if (!decl || decl.type !== 'VariableDeclaration') continue;
    const declarations = (decl.declarations as Array<Record<string, unknown>> | undefined) ?? [];
    for (const d of declarations) {
      const id = d.id as Record<string, unknown> | undefined;
      if (id?.type !== 'Identifier' || id.name !== 'meta') continue;
      const init = unwrapExpression(d.init as Record<string, unknown> | undefined);
      if (!init || init.type !== 'ObjectExpression') return 'unsupported';
      if (typeof init.start !== 'number' || typeof init.end !== 'number') return 'unsupported';

      const properties: MetaProperty[] = [];
      let unsupported = false;
      const rawProperties =
        (init.properties as Array<Record<string, unknown> | undefined> | undefined) ?? [];
      for (const property of rawProperties) {
        if (!property || property.type !== 'ObjectProperty' || property.computed) {
          unsupported = true;
          continue;
        }
        const key = staticKeyName(property.key as Record<string, unknown> | undefined);
        const value = property.value as Record<string, unknown> | undefined;
        if (
          key === null ||
          typeof property.start !== 'number' ||
          typeof property.end !== 'number' ||
          typeof value?.start !== 'number' ||
          typeof value.end !== 'number'
        ) {
          unsupported = true;
          continue;
        }
        properties.push({
          key,
          propertyStart: property.start,
          propertyEnd: property.end,
          valueStart: value.start,
          valueEnd: value.end,
          ...readPropertyValue(value),
        });
      }
      return { objectStart: init.start, objectEnd: init.end, unsupported, properties };
    }
  }

  return 'missing';
}

function propertiesToMeta(props: MetaProperty[]): Partial<SlideMeta> {
  const meta: Record<string, unknown> = {};
  for (const prop of props) {
    if (!META_KEYS.has(prop.key)) continue;
    if (prop.valueType === 'string' || prop.valueType === 'string[]') meta[prop.key] = prop.value;
  }
  return meta as Partial<SlideMeta>;
}

export function detectSourceState(source: string): SourceStateResult {
  const info = findMetaObjectInfo(source);
  if (info === 'parse-error') return { state: 'parse-error', meta: {} };
  if (info === 'missing') return { state: 'missing', meta: {} };
  if (info === 'unsupported') return { state: 'readable-unsupported', meta: {} };
  const meta = propertiesToMeta(info.properties);
  return info.unsupported ? { state: 'readable-unsupported', meta } : { state: 'supported', meta };
}

export async function readMetaFromFile(filePath: string): Promise<SourceStateResult> {
  try {
    const source = await fs.readFile(filePath, 'utf8');
    return detectSourceState(source);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { state: 'missing', meta: {} };
    return { state: 'parse-error', meta: {} };
  }
}

function escapeSingleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatMetaValue(
  value: Exclude<MetaSourcePatch[keyof SlideMeta], null | undefined>,
): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  return `'${escapeSingleQuoted(String(value))}'`;
}

function buildInsertedMeta(patch: MetaSourcePatch): string | null {
  const entries = Object.entries(patch)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `  ${key}: ${formatMetaValue(value as string | string[])}`);
  if (entries.length === 0) return null;
  return `export const meta = {\n${entries.join(',\n')}\n};\n\n`;
}

function insertionText(source: string, info: MetaObjectInfo, fields: [string, string][]): string {
  const body = source.slice(info.objectStart + 1, info.objectEnd);
  const indent = body.match(/\n([ \t]+)\S/)?.[1] ?? '  ';
  const separator = body.trim().length > 0 ? ',' : '';
  return `\n${fields.map(([field, value]) => `${indent}${field}: ${value}`).join(',\n')}${separator}`;
}

function removalRange(source: string, info: MetaObjectInfo, prop: MetaProperty) {
  let start = prop.propertyStart;
  while (start > info.objectStart + 1 && /[ \t]/.test(source[start - 1] ?? '')) start--;
  if (source[start - 1] === '\n') start--;
  if (source[start - 1] === '\r') start--;

  let end = prop.propertyEnd;
  while (end < info.objectEnd && /[ \t]/.test(source[end] ?? '')) end++;
  if (source[end] === ',') end++;
  while (end < info.objectEnd && /[ \t]/.test(source[end] ?? '')) end++;
  if (source[end] === '\r') end++;
  if (source[end] === '\n') end++;

  return { start, end };
}

export function patchMetaInSource(source: string, patch: MetaSourcePatch): string | null {
  const info = findMetaObjectInfo(source);
  if (info === 'parse-error' || info === 'unsupported') return null;
  if (info === 'missing') {
    const insertion = buildInsertedMeta(patch);
    if (!insertion) return source;
    const exportDefaultIdx = source.search(/export\s+default\b/);
    if (exportDefaultIdx === -1) return null;
    return source.slice(0, exportDefaultIdx) + insertion + source.slice(exportDefaultIdx);
  }
  if (info.unsupported) return null;

  const propertyByKey = new Map(info.properties.map((prop) => [prop.key, prop]));
  const replacements: { start: number; end: number; text: string }[] = [];
  const inserts: [string, string][] = [];

  for (const [field, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const prop = propertyByKey.get(field);
    if (value === null) {
      if (prop) replacements.push({ ...removalRange(source, info, prop), text: '' });
      continue;
    }
    const text = formatMetaValue(value as string | string[]);
    if (prop) {
      replacements.push({ start: prop.valueStart, end: prop.valueEnd, text });
    } else {
      inserts.push([field, text]);
    }
  }

  if (inserts.length > 0) {
    replacements.push({
      start: info.objectEnd - 1,
      end: info.objectEnd - 1,
      text: insertionText(source, info, inserts),
    });
  }

  let updated = source;
  replacements.sort((a, b) => b.start - a.start);
  for (const replacement of replacements) {
    updated =
      updated.slice(0, replacement.start) + replacement.text + updated.slice(replacement.end);
  }
  return updated;
}

export async function writeMetaPatch(
  filePath: string,
  patch: MetaSourcePatch,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  let source: string;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch {
    return { ok: false, status: 404, error: 'slide not found' };
  }

  const state = detectSourceState(source);
  if (state.state !== 'supported' && state.state !== 'missing') {
    return { ok: false, status: 422, error: 'unsupported source shape for metadata write' };
  }

  const updated = patchMetaInSource(source, patch);
  if (updated === null) {
    return { ok: false, status: 422, error: 'could not patch metadata in source' };
  }

  if (updated !== source) {
    await fs.writeFile(filePath, updated, 'utf8');
  }
  return { ok: true };
}
