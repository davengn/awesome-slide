import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { loadConfigFromFile, type Plugin, type ViteDevServer } from 'vite';
import {
  AWESOME_SLIDE_CONFIG_FILE,
  AWESOME_SLIDE_PROTOCOL_PREFIX,
  AWESOME_SLIDE_VIRTUAL_PREFIX,
  OPEN_SLIDE_CONFIG_FILE,
  OPEN_SLIDE_PROTOCOL_PREFIX,
  OPEN_SLIDE_VIRTUAL_PREFIX,
} from '../brand.ts';
import type { AwesomeSlideConfig, OpenSlideConfig } from '../config.ts';
import { readMetaFromFile } from '../editing/meta-source.ts';

export type { AwesomeSlideConfig, OpenSlideConfig };

export type OpenSlidePluginOptions = {
  userCwd: string;
  config: AwesomeSlideConfig;
};

const SLIDES_VMOD = `${AWESOME_SLIDE_VIRTUAL_PREFIX}/slides`;
const CONFIG_VMOD = `${AWESOME_SLIDE_VIRTUAL_PREFIX}/config`;
const FOLDERS_VMOD = `${AWESOME_SLIDE_VIRTUAL_PREFIX}/folders`;
const LEGACY_SLIDES_VMOD = `${OPEN_SLIDE_VIRTUAL_PREFIX}/slides`;
const LEGACY_CONFIG_VMOD = `${OPEN_SLIDE_VIRTUAL_PREFIX}/config`;
const LEGACY_FOLDERS_VMOD = `${OPEN_SLIDE_VIRTUAL_PREFIX}/folders`;
const SLIDES_VMODS = [SLIDES_VMOD, LEGACY_SLIDES_VMOD] as const;
const CONFIG_VMODS = [CONFIG_VMOD, LEGACY_CONFIG_VMOD] as const;
const FOLDERS_VMODS = [FOLDERS_VMOD, LEGACY_FOLDERS_VMOD] as const;
const SLIDE_CHANGED_EVENTS = [
  `${AWESOME_SLIDE_PROTOCOL_PREFIX}:slide-changed`,
  `${OPEN_SLIDE_PROTOCOL_PREFIX}:slide-changed`,
] as const;

type FoldersManifest = {
  folders: unknown[];
  assignments: Record<string, string>;
  decks: unknown[];
  manualOrder: Record<string, string[]>;
};

async function readFoldersManifest(file: string): Promise<FoldersManifest> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FoldersManifest>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      assignments:
        parsed.assignments && typeof parsed.assignments === 'object'
          ? (parsed.assignments as Record<string, string>)
          : {},
      decks: Array.isArray(parsed.decks) ? parsed.decks : [],
      manualOrder:
        parsed.manualOrder && typeof parsed.manualOrder === 'object'
          ? (parsed.manualOrder as Record<string, string[]>)
          : {},
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { folders: [], assignments: {}, decks: [], manualOrder: {} };
    }
    throw err;
  }
}

function resolved(id: string): string {
  return `\0${id}`;
}

function matchesVirtual(id: string, ids: readonly string[]): boolean {
  return ids.some((virtualId) => id === virtualId || id === resolved(virtualId));
}

async function findSlides(userCwd: string, slidesDir: string): Promise<string[]> {
  const abs = path.resolve(userCwd, slidesDir);
  if (!existsSync(abs)) return [];
  const hits = await fg('*/index.{tsx,jsx,ts,js}', {
    cwd: abs,
    absolute: true,
    onlyFiles: true,
  });
  return hits.sort();
}

function toId(absFile: string, slidesRoot: string): string {
  const rel = path.relative(slidesRoot, absFile);
  return rel.split(path.sep)[0];
}

type ExtractedMeta = {
  title: string | null;
  description: string | null;
  tags: string[];
  theme: string | null;
  status: 'draft' | 'ready' | 'archived' | null;
  createdAt: string | null;
  updatedAt: number | null;
  sourceState: 'supported' | 'readable-unsupported' | 'parse-error' | 'missing';
};

async function readSlideMeta(abs: string): Promise<ExtractedMeta> {
  const metaResult = await readMetaFromFile(abs);
  let updatedAt: number | null = null;
  try {
    updatedAt = (await fs.stat(abs)).mtimeMs;
  } catch {
    updatedAt = null;
  }
  const meta = metaResult.meta;
  return {
    title: typeof meta.title === 'string' ? meta.title : null,
    description: typeof meta.description === 'string' ? meta.description : null,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    theme: typeof meta.theme === 'string' ? meta.theme : null,
    status:
      meta.status === 'draft' || meta.status === 'ready' || meta.status === 'archived'
        ? meta.status
        : null,
    createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : null,
    updatedAt,
    sourceState: metaResult.state,
  };
}

function parseCreatedAtMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

async function generateSlidesModule(
  files: string[],
  slidesRoot: string,
  isDev: boolean,
): Promise<string> {
  const entries = await Promise.all(
    files.map(async (abs) => {
      const id = toId(abs, slidesRoot);
      const importPath = isDev ? `/@fs/${abs.replace(/^\/+/, '')}` : abs;
      const meta = await readSlideMeta(abs);
      return { id, importPath, meta, createdAt: parseCreatedAtMs(meta.createdAt) };
    }),
  );

  const ids = JSON.stringify(entries.map((e) => e.id).sort());
  const themesMap: Record<string, string> = {};
  const createdAtMap: Record<string, number> = {};
  const titlesMap: Record<string, string> = {};
  const descriptionsMap: Record<string, string> = {};
  const tagsMap: Record<string, string[]> = {};
  const statusMap: Record<string, 'draft' | 'ready' | 'archived'> = {};
  const updatedAtMap: Record<string, number> = {};
  const sourceStateMap: Record<string, ExtractedMeta['sourceState']> = {};
  for (const e of entries) {
    if (e.meta.title) titlesMap[e.id] = e.meta.title;
    if (e.meta.description) descriptionsMap[e.id] = e.meta.description;
    if (e.meta.tags.length > 0) tagsMap[e.id] = e.meta.tags;
    if (e.meta.theme) themesMap[e.id] = e.meta.theme;
    if (e.meta.status) statusMap[e.id] = e.meta.status;
    if (e.createdAt !== null) createdAtMap[e.id] = e.createdAt;
    if (e.meta.updatedAt !== null) updatedAtMap[e.id] = e.meta.updatedAt;
    sourceStateMap[e.id] = e.meta.sourceState;
  }
  const titlesJson = JSON.stringify(titlesMap);
  const descriptionsJson = JSON.stringify(descriptionsMap);
  const tagsJson = JSON.stringify(tagsMap);
  const themesJson = JSON.stringify(themesMap);
  const statusJson = JSON.stringify(statusMap);
  const createdAtJson = JSON.stringify(createdAtMap);
  const updatedAtJson = JSON.stringify(updatedAtMap);
  const sourceStateJson = JSON.stringify(sourceStateMap);
  const importTokens = JSON.stringify(Object.fromEntries(entries.map((e) => [e.id, 0])));
  const devRuntime = isDev
    ? `
const slideImportTokens = ${importTokens};
if (import.meta.hot) {
  for (const eventName of ${JSON.stringify(SLIDE_CHANGED_EVENTS)}) {
    import.meta.hot.on(eventName, (data) => {
      const ids = Array.isArray(data?.slideIds) ? data.slideIds : data?.slideId ? [data.slideId] : [];
      const token = Date.now();
      for (const id of ids) {
        if (Object.prototype.hasOwnProperty.call(slideImportTokens, id)) slideImportTokens[id] = token;
      }
    });
  }
}
`
    : '';
  const cases = entries
    .map((e) => {
      const importExpr = isDev
        ? `import(/* @vite-ignore */ ${JSON.stringify(`${e.importPath}?t=`)} + slideImportTokens[${JSON.stringify(e.id)}])`
        : `import(${JSON.stringify(e.importPath)})`;
      return `    case ${JSON.stringify(e.id)}: return ${importExpr};`;
    })
    .join('\n');

  return `// ${SLIDES_VMOD} - generated
export const slideIds = ${ids};
export const slideTitles = ${titlesJson};
export const slideDescriptions = ${descriptionsJson};
export const slideTags = ${tagsJson};
export const slideThemes = ${themesJson};
export const slideStatus = ${statusJson};
export const slideCreatedAt = ${createdAtJson};
export const slideUpdatedAt = ${updatedAtJson};
export const slideSourceState = ${sourceStateJson};
${devRuntime}

export async function loadSlide(id) {
  switch (id) {
${cases}
    default: throw new Error('Slide not found: ' + id);
  }
}
`;
}

export function openSlidePlugin(opts: OpenSlidePluginOptions): Plugin {
  const { userCwd, config } = opts;
  const slidesDir = config.slidesDir ?? 'slides';
  const slidesRoot = path.resolve(userCwd, slidesDir);
  const foldersManifestPath = path.join(slidesRoot, '.folders.json');

  let isDev = false;
  const slideIdForEntry = (p: string): string | null => {
    const rel = path.relative(slidesRoot, p);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    const parts = rel.split(path.sep);
    if (parts.length !== 2) return null;
    if (!/^index\.(tsx|jsx|ts|js)$/.test(parts[1])) return null;
    return parts[0];
  };
  let slideChangeTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingSlideChanges = new Set<string>();
  const queueSlideChanged = (server: ViteDevServer, id: string) => {
    pendingSlideChanges.add(id);
    if (slideChangeTimer) clearTimeout(slideChangeTimer);
    slideChangeTimer = setTimeout(() => {
      slideChangeTimer = null;
      for (const virtualId of SLIDES_VMODS) {
        const mod = server.moduleGraph.getModuleById(resolved(virtualId));
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
      const slideIds = Array.from(pendingSlideChanges);
      pendingSlideChanges.clear();
      for (const event of SLIDE_CHANGED_EVENTS) {
        server.ws.send({
          type: 'custom',
          event,
          data: { slideIds },
        });
      }
    }, 100);
  };

  return {
    name: 'awesome-slide',
    config(_c, env) {
      isDev = env.command === 'serve';
      return {
        server: { fs: { allow: [userCwd] } },
      };
    },
    resolveId(id) {
      if (SLIDES_VMODS.includes(id as (typeof SLIDES_VMODS)[number])) return resolved(id);
      if (CONFIG_VMODS.includes(id as (typeof CONFIG_VMODS)[number])) return resolved(id);
      if (FOLDERS_VMODS.includes(id as (typeof FOLDERS_VMODS)[number])) return resolved(id);
      return null;
    },
    async load(id) {
      if (matchesVirtual(id, SLIDES_VMODS)) {
        const files = await findSlides(userCwd, slidesDir);
        return await generateSlidesModule(files, slidesRoot, isDev);
      }
      if (matchesVirtual(id, CONFIG_VMODS)) {
        const userBuild = config.build ?? {};
        const buildResolved = isDev
          ? { showSlideBrowser: true, showSlideUi: true, allowHtmlDownload: true }
          : {
              showSlideBrowser: userBuild.showSlideBrowser ?? true,
              showSlideUi: userBuild.showSlideUi ?? true,
              allowHtmlDownload: userBuild.allowHtmlDownload ?? true,
            };
        const resolvedConfig = { ...config, build: buildResolved };
        return `export default ${JSON.stringify(resolvedConfig)};\n`;
      }
      if (matchesVirtual(id, FOLDERS_VMODS)) {
        const manifest = await readFoldersManifest(foldersManifestPath);
        return `export default ${JSON.stringify(manifest)};\n`;
      }
      return null;
    },
    handleHotUpdate(ctx) {
      const slideId = slideIdForEntry(ctx.file);
      if (!slideId) return;
      queueSlideChanged(ctx.server, slideId);
      return [];
    },
    configureServer(server) {
      const isSlideEntry = (p: string) => slideIdForEntry(p) !== null;

      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          reloadTimer = null;
          for (const virtualId of SLIDES_VMODS) {
            const mod = server.moduleGraph.getModuleById(resolved(virtualId));
            if (mod) server.moduleGraph.invalidateModule(mod);
          }
          server.ws.send({ type: 'full-reload' });
        }, 150);
      };
      // Vite's `root` is the core app dir, so chokidar doesn't watch the
      // user's slides folder by default. Add it explicitly — and pass the
      // directory itself, since Vite sets `disableGlobbing: true` and would
      // otherwise treat a glob pattern as a literal path.
      if (existsSync(slidesRoot)) server.watcher.add(slidesRoot);
      server.watcher.on('add', (p) => {
        if (isSlideEntry(p)) reload();
      });
      server.watcher.on('unlink', (p) => {
        if (isSlideEntry(p)) reload();
      });

      let foldersTimer: ReturnType<typeof setTimeout> | null = null;
      const invalidateFolders = () => {
        if (foldersTimer) clearTimeout(foldersTimer);
        foldersTimer = setTimeout(() => {
          foldersTimer = null;
          for (const virtualId of FOLDERS_VMODS) {
            const mod = server.moduleGraph.getModuleById(resolved(virtualId));
            if (mod) server.moduleGraph.invalidateModule(mod);
          }
        }, 100);
      };
      server.watcher.add(foldersManifestPath);
      server.watcher.on('change', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
      server.watcher.on('add', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
      server.watcher.on('unlink', (p) => {
        if (p === foldersManifestPath) invalidateFolders();
      });
    },
  };
}

export async function loadUserConfig(userCwd: string): Promise<AwesomeSlideConfig> {
  const canonicalFile = path.join(userCwd, AWESOME_SLIDE_CONFIG_FILE);
  const legacyFile = path.join(userCwd, OPEN_SLIDE_CONFIG_FILE);
  const canonicalExists = existsSync(canonicalFile);
  const legacyExists = existsSync(legacyFile);
  if (!canonicalExists && !legacyExists) return {};
  const file = canonicalExists ? canonicalFile : legacyFile;
  if (canonicalExists && legacyExists) {
    console.warn(
      `[awesome-slide] Both ${AWESOME_SLIDE_CONFIG_FILE} and ${OPEN_SLIDE_CONFIG_FILE} exist. Using ${AWESOME_SLIDE_CONFIG_FILE}.`,
    );
  }
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    file,
    userCwd,
    'silent',
  );
  return (loaded?.config ?? {}) as AwesomeSlideConfig;
}
