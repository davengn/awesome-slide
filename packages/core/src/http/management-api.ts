import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import type {
  CreateSlideRequest,
  Deck,
  DuplicateSlideRequest,
  ManagementCapabilities,
  ManagementMode,
  SlideMetadataPatch,
  SlideRecord,
  UpdateOrderRequest,
} from '../app/lib/sdk.ts';
import type { MetaSourcePatch } from '../editing/meta-source.ts';
import { readMetaFromFile, writeMetaPatch } from '../editing/meta-source.ts';
import { resolveSlideEntry, SLIDE_ID_RE } from '../editing/slide-ops.ts';
import { FOLDER_ID_RE, readManifest, writeManifest } from '../files/folders.ts';
import {
  addSlideToDeck,
  cleanupSlideReferences,
  DECK_ID_RE,
  newDeckId,
  newFolderId,
  removeDeck,
  removeSlideFromAllDecks,
  setManualOrder,
  slideDeckIds,
  updateDeck,
  validateDeckDescription,
  validateDeckName,
} from '../files/slide-management.ts';
import {
  createBlankSlide,
  createSlideFromTemplate,
  deleteSlideDirectory,
  duplicateSlideDirectory,
} from '../files/slide-ops.ts';
import { validateMutationRequest } from '../http/request-guard.ts';
import { type ApiContext, json, readBody } from '../vite/routes/context.ts';

// GET    /__management/slides                        list all slides with metadata
// POST   /__management/slides                        create slide
// PATCH  /__management/slides/:id/metadata           patch slide metadata
// POST   /__management/slides/:id/duplicate          duplicate slide
// DELETE /__management/slides/:id                    delete slide
// PUT    /__management/collections/order             persist manual order
// POST   /__management/folders                       create folder
// PUT    /__management/folders/:id                   update folder
// DELETE /__management/folders/:id                   delete folder
// POST   /__management/decks                         create deck
// PUT    /__management/decks/:id                     update deck
// DELETE /__management/decks/:id                     delete deck

function editableCaps(): ManagementCapabilities {
  return {
    create: true,
    rename: true,
    duplicate: true,
    delete: true,
    move: true,
    editMetadata: true,
    manualOrder: true,
  };
}

async function listSlideIds(slidesRoot: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(slidesRoot, { withFileTypes: true });
    const ids: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && SLIDE_ID_RE.test(entry.name)) {
        try {
          await fs.access(`${slidesRoot}/${entry.name}/index.tsx`);
          ids.push(entry.name);
        } catch {}
      }
    }
    return ids.sort();
  } catch {
    return [];
  }
}

async function buildSlideRecord(
  slidesRoot: string,
  slideId: string,
  manifest: Awaited<ReturnType<typeof readManifest>>,
): Promise<SlideRecord> {
  const entry = resolveSlideEntry(slidesRoot, slideId);
  const metaResult = entry
    ? await readMetaFromFile(entry)
    : { state: 'missing' as const, meta: {} };
  const meta = metaResult.meta;

  let updatedAt: string | undefined;
  if (entry) {
    try {
      const stat = await fs.stat(entry);
      updatedAt = stat.mtime.toISOString();
    } catch {}
  }

  return {
    id: slideId,
    title: meta.title ?? slideId,
    description: meta.description,
    tags: meta.tags ?? [],
    theme: meta.theme,
    status: meta.status ?? 'draft',
    notes: meta.notes,
    createdAt: meta.createdAt,
    updatedAt,
    folderId: manifest.assignments[slideId],
    deckIds: slideDeckIds(manifest, slideId),
    manualOrder: Object.values(manifest.manualOrder)
      .map((ids) => ids.indexOf(slideId))
      .filter((idx) => idx !== -1)
      .sort((a, b) => a - b)[0],
    preview: { kind: 'live' },
    sourceState: metaResult.state,
    readOnly: metaResult.state !== 'supported',
  };
}

async function readTemplateSource(
  themesRoot: string,
  templateId: unknown,
): Promise<{ ok: true; source: string } | { ok: false; status: number; error: string }> {
  if (typeof templateId !== 'string' || !SLIDE_ID_RE.test(templateId)) {
    return { ok: false, status: 400, error: 'invalid templateId' };
  }
  for (const ext of ['tsx', 'jsx', 'ts', 'js']) {
    const candidate = path.resolve(themesRoot, `${templateId}.demo.${ext}`);
    if (!candidate.startsWith(themesRoot + path.sep)) continue;
    try {
      return { ok: true, source: await fs.readFile(candidate, 'utf8') };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        return { ok: false, status: 500, error: String((err as Error).message ?? err) };
      }
    }
  }
  return { ok: false, status: 400, error: 'template not found' };
}

function hasNameConflict(
  items: Array<{ id: string; name: string }>,
  name: string,
  currentId?: string,
): boolean {
  const normalized = name.toLocaleLowerCase();
  return items.some(
    (item) => item.id !== currentId && item.name.toLocaleLowerCase() === normalized,
  );
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const expected = new Set(a);
  return b.every((id) => expected.has(id));
}

export function registerManagementRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__management', async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const method = req.method ?? 'GET';

    try {
      // GET /__management/slides
      if (method === 'GET' && url.pathname === '/slides') {
        const manifest = await readManifest(ctx.manifestPath);
        const slideIds = await listSlideIds(ctx.slidesRoot);
        const slides = await Promise.all(
          slideIds.map((id) => buildSlideRecord(ctx.slidesRoot, id, manifest)),
        );
        return json(res, 200, {
          mode: 'editable' as ManagementMode,
          capabilities: editableCaps(),
          slides,
          folders: manifest.folders,
          decks: manifest.decks,
          manualOrder: manifest.manualOrder,
        });
      }

      // POST /__management/slides
      if (method === 'POST' && url.pathname === '/slides') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as CreateSlideRequest;
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!body.id || !SLIDE_ID_RE.test(body.id)) return json(res, 400, { error: 'invalid id' });
        if (!title || title.length > 80) return json(res, 400, { error: 'invalid title' });
        if (body.kind !== 'blank' && body.kind !== 'template' && body.kind !== 'prompt') {
          return json(res, 400, { error: 'invalid kind' });
        }

        const manifest = await readManifest(ctx.manifestPath);
        if (body.folderId) {
          if (!manifest.folders.some((f) => f.id === body.folderId)) {
            return json(res, 404, { error: 'folder not found' });
          }
        }
        if (body.deckId && !manifest.decks.some((deck) => deck.id === body.deckId)) {
          return json(res, 404, { error: 'deck not found' });
        }

        let created: Awaited<ReturnType<typeof createBlankSlide>>;
        if (body.kind === 'template') {
          const template = await readTemplateSource(ctx.themesRoot, body.templateId);
          if (!template.ok) return json(res, template.status, { error: template.error });
          created = await createSlideFromTemplate(ctx.slidesRoot, body.id, title, template.source, {
            theme: body.theme ?? body.templateId,
          });
        } else {
          created = await createBlankSlide(ctx.slidesRoot, body.id, title);
        }
        if (!created.ok) return json(res, created.status, { error: created.error });

        if (body.kind === 'prompt' && body.prompt) {
          const entry = resolveSlideEntry(ctx.slidesRoot, body.id);
          if (entry) {
            await writeMetaPatch(entry, { notes: body.prompt, status: 'draft' });
          }
        }

        if (body.folderId) {
          manifest.assignments[body.id] = body.folderId;
        }

        if (body.deckId) {
          const updated = addSlideToDeck(manifest, body.deckId, body.id);
          if (!updated) return json(res, 404, { error: 'deck not found' });
          Object.assign(manifest, updated);
        }
        await writeManifest(ctx.manifestPath, manifest);

        if (body.kind === 'prompt' && body.prompt) {
          return json(res, 200, {
            ok: true,
            slideId: body.id,
            next: { type: 'agent-chat', prompt: body.prompt, seedSlideId: body.id },
          });
        }
        return json(res, 200, {
          ok: true,
          slideId: body.id,
          next: { type: 'open-slide', slideId: body.id },
        });
      }

      // PATCH /__management/slides/:id/metadata
      const metadataMatch = url.pathname.match(/^\/slides\/([^/]+)\/metadata$/);
      if (metadataMatch && method === 'PATCH') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const slideId = metadataMatch[1];
        if (!SLIDE_ID_RE.test(slideId)) return json(res, 400, { error: 'invalid slideId' });

        const body = (await readBody(req)) as SlideMetadataPatch;
        const manifest = await readManifest(ctx.manifestPath);
        const entry = resolveSlideEntry(ctx.slidesRoot, slideId);
        if (!entry) return json(res, 404, { error: 'slide not found' });
        try {
          await fs.access(entry);
        } catch {
          return json(res, 404, { error: 'slide not found' });
        }

        const slideOwnedFields = [
          'title',
          'description',
          'tags',
          'theme',
          'status',
          'notes',
        ] as const;
        const hasSlideOwnedEdits = slideOwnedFields.some((f) => f in body);
        if ('folderId' in body) {
          const folderId = body.folderId;
          if (folderId !== null && (typeof folderId !== 'string' || !FOLDER_ID_RE.test(folderId))) {
            return json(res, 400, { error: 'invalid folderId' });
          }
          if (folderId && !manifest.folders.some((f) => f.id === folderId)) {
            return json(res, 404, { error: 'folder not found' });
          }
        }
        if ('deckIds' in body) {
          if (!Array.isArray(body.deckIds)) return json(res, 400, { error: 'invalid deckIds' });
          for (const deckId of body.deckIds) {
            if (!DECK_ID_RE.test(deckId) || !manifest.decks.some((d) => d.id === deckId)) {
              return json(res, 404, { error: 'deck not found' });
            }
          }
        }

        if (hasSlideOwnedEdits) {
          const metaResult = await readMetaFromFile(entry);
          if (metaResult.state !== 'supported') {
            return json(res, 422, {
              error: 'unsupported source shape for metadata write',
              code: 'UNSUPPORTED_SOURCE',
            });
          }

          const patch: MetaSourcePatch = {};
          if ('title' in body) patch.title = body.title;
          if ('description' in body) patch.description = body.description;
          if ('tags' in body) patch.tags = body.tags;
          if ('theme' in body) patch.theme = body.theme;
          if ('status' in body) patch.status = body.status;
          if ('notes' in body) patch.notes = body.notes;
          const result = await writeMetaPatch(entry, patch);
          if (!result.ok) return json(res, result.status, { error: result.error });
        }

        if ('folderId' in body) {
          const folderId = body.folderId;
          if (folderId === null) {
            delete manifest.assignments[slideId];
          } else if (typeof folderId === 'string') {
            manifest.assignments[slideId] = folderId;
          }
        }

        if ('deckIds' in body && Array.isArray(body.deckIds)) {
          let updated = removeSlideFromAllDecks(manifest, slideId);
          for (const deckId of body.deckIds) {
            const after = addSlideToDeck(updated, deckId, slideId);
            if (after) updated = after;
          }
          Object.assign(manifest, updated);
        }

        await writeManifest(ctx.manifestPath, manifest);

        const record = await buildSlideRecord(ctx.slidesRoot, slideId, manifest);
        return json(res, 200, { ok: true, slide: record });
      }

      // POST /__management/slides/:id/duplicate
      const dupMatch = url.pathname.match(/^\/slides\/([^/]+)\/duplicate$/);
      if (dupMatch && method === 'POST') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const slideId = dupMatch[1];
        if (!SLIDE_ID_RE.test(slideId)) return json(res, 400, { error: 'invalid slideId' });

        const body = (await readBody(req)) as DuplicateSlideRequest;
        if (body.newId !== undefined && typeof body.newId !== 'string') {
          return json(res, 400, { error: 'invalid newId' });
        }
        if (body.title !== undefined && typeof body.title !== 'string') {
          return json(res, 400, { error: 'invalid title' });
        }

        const manifest = await readManifest(ctx.manifestPath);
        const folderId =
          body.folderId !== undefined ? body.folderId : manifest.assignments[slideId];
        if (folderId !== undefined && folderId !== null) {
          if (!FOLDER_ID_RE.test(folderId) || !manifest.folders.some((f) => f.id === folderId)) {
            return json(res, 404, { error: 'folder not found' });
          }
        }
        if (body.deckId && !manifest.decks.some((d) => d.id === body.deckId)) {
          return json(res, 404, { error: 'deck not found' });
        }

        const duplicated = await duplicateSlideDirectory(ctx.slidesRoot, slideId, {
          newId: body.newId,
          title: body.title,
        });
        if (!duplicated.ok) return json(res, duplicated.status, { error: duplicated.error });

        if (folderId !== undefined && folderId !== null) {
          manifest.assignments[duplicated.slideId] = folderId;
        } else if (body.folderId === null) {
          delete manifest.assignments[duplicated.slideId];
        }

        if (body.deckId) {
          const updated = addSlideToDeck(manifest, body.deckId, duplicated.slideId);
          if (!updated) return json(res, 404, { error: 'deck not found' });
          Object.assign(manifest, updated);
        }

        await writeManifest(ctx.manifestPath, manifest);
        return json(res, 200, { ok: true, slideId: duplicated.slideId });
      }

      // DELETE /__management/slides/:id
      const deleteMatch = url.pathname.match(/^\/slides\/([^/]+)$/);
      if (deleteMatch && method === 'DELETE') {
        const guard = validateMutationRequest(req);
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const slideId = deleteMatch[1];
        if (!SLIDE_ID_RE.test(slideId)) return json(res, 400, { error: 'invalid slideId' });

        const removed = await deleteSlideDirectory(ctx.slidesRoot, slideId);
        if (!removed.ok) return json(res, removed.status, { error: removed.error });

        const manifest = await readManifest(ctx.manifestPath);
        const cleaned = cleanupSlideReferences(manifest, slideId);
        await writeManifest(ctx.manifestPath, cleaned);

        return json(res, 200, { ok: true });
      }

      // PUT /__management/collections/order
      if (method === 'PUT' && url.pathname === '/collections/order') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as UpdateOrderRequest;
        if (
          !body.collection ||
          !Array.isArray(body.slideIds) ||
          !body.slideIds.every(
            (slideId) => typeof slideId === 'string' && SLIDE_ID_RE.test(slideId),
          )
        ) {
          return json(res, 400, { error: 'invalid request' });
        }

        const manifest = await readManifest(ctx.manifestPath);
        const allSlideIds = await listSlideIds(ctx.slidesRoot);
        const collection = body.collection;

        if (collection.type === 'deck') {
          const deckId = collection.deckId;
          const deck = manifest.decks.find((d) => d.id === deckId);
          if (!deck) return json(res, 404, { error: 'deck not found' });

          const existing = new Set(deck.slideOrder);
          const incoming = new Set(body.slideIds);
          if (existing.size !== incoming.size || ![...existing].every((id) => incoming.has(id))) {
            return json(res, 409, { error: 'order includes stale slide IDs' });
          }
          const updated = updateDeck(manifest, deckId, { slideOrder: body.slideIds });
          if (!updated) return json(res, 404, { error: 'deck not found' });
          await writeManifest(ctx.manifestPath, updated);
          return json(res, 200, {
            ok: true,
            collectionKey: `deck:${deckId}`,
            slideIds: body.slideIds,
          });
        }

        let key: string;
        let expectedSlideIds: string[];
        if (collection.type === 'folder') {
          if (!manifest.folders.some((f) => f.id === collection.folderId)) {
            return json(res, 404, { error: 'folder not found' });
          }
          key = `folder:${collection.folderId}`;
          expectedSlideIds = allSlideIds.filter(
            (slideId) => manifest.assignments[slideId] === collection.folderId,
          );
        } else {
          key = 'draft';
          expectedSlideIds = allSlideIds.filter((slideId) => !manifest.assignments[slideId]);
        }
        if (!sameMembers(expectedSlideIds, body.slideIds)) {
          return json(res, 400, { error: 'invalid order' });
        }

        const updated = setManualOrder(manifest, key, body.slideIds);
        await writeManifest(ctx.manifestPath, updated);
        return json(res, 200, { ok: true, collectionKey: key, slideIds: body.slideIds });
      }

      // POST /__management/folders
      if (method === 'POST' && url.pathname === '/folders') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { name?: unknown; icon?: unknown };
        const name = typeof body.name === 'string' ? body.name.trim() : null;
        if (!name || name.length > 40) return json(res, 400, { error: 'invalid name' });

        const icon = body.icon as
          | { type: 'emoji'; value: string }
          | { type: 'color'; value: string }
          | undefined;
        if (
          !icon ||
          (icon.type !== 'emoji' && icon.type !== 'color') ||
          typeof icon.value !== 'string'
        ) {
          return json(res, 400, { error: 'invalid icon' });
        }

        const manifest = await readManifest(ctx.manifestPath);
        if (hasNameConflict(manifest.folders, name)) {
          return json(res, 409, { error: 'folder name already exists' });
        }
        const folder = { id: newFolderId(), name, icon };
        manifest.folders.push(folder);
        await writeManifest(ctx.manifestPath, manifest);
        return json(res, 200, folder);
      }

      // Folder CRUD by id
      const folderMatch = url.pathname.match(/^\/folders\/([^/]+)$/);
      if (folderMatch) {
        const id = folderMatch[1];
        if (!FOLDER_ID_RE.test(id)) return json(res, 400, { error: 'invalid id' });

        if (method === 'PUT') {
          const guard = validateMutationRequest(req, { requireJsonBody: true });
          if (!guard.ok) return json(res, guard.status, { error: guard.error });

          const body = (await readBody(req)) as { name?: unknown; icon?: unknown };
          const manifest = await readManifest(ctx.manifestPath);
          const folder = manifest.folders.find((f) => f.id === id);
          if (!folder) return json(res, 404, { error: 'folder not found' });

          if (body.name !== undefined) {
            const name = typeof body.name === 'string' ? body.name.trim() : '';
            if (!name || name.length > 40) return json(res, 400, { error: 'invalid name' });
            if (hasNameConflict(manifest.folders, name, id)) {
              return json(res, 409, { error: 'folder name already exists' });
            }
            folder.name = name;
          }
          if (body.icon !== undefined) {
            const icon = body.icon as { type: string; value: string };
            if (
              !icon ||
              (icon.type !== 'emoji' && icon.type !== 'color') ||
              typeof icon.value !== 'string'
            ) {
              return json(res, 400, { error: 'invalid icon' });
            }
            folder.icon = icon as typeof folder.icon;
          }

          await writeManifest(ctx.manifestPath, manifest);
          return json(res, 200, folder);
        }

        if (method === 'DELETE') {
          const guard = validateMutationRequest(req);
          if (!guard.ok) return json(res, guard.status, { error: guard.error });

          const manifest = await readManifest(ctx.manifestPath);
          const before = manifest.folders.length;
          manifest.folders = manifest.folders.filter((f) => f.id !== id);
          if (manifest.folders.length === before)
            return json(res, 404, { error: 'folder not found' });
          for (const [sid, fid] of Object.entries(manifest.assignments)) {
            if (fid === id) delete manifest.assignments[sid];
          }
          await writeManifest(ctx.manifestPath, manifest);
          return json(res, 200, { ok: true });
        }
      }

      // POST /__management/decks
      if (method === 'POST' && url.pathname === '/decks') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          name?: unknown;
          description?: unknown;
          theme?: unknown;
        };
        const name = validateDeckName(body.name);
        if (!name) return json(res, 400, { error: 'invalid name' });
        const description = validateDeckDescription(body.description);
        if (description === null) return json(res, 400, { error: 'invalid description' });

        const manifest = await readManifest(ctx.manifestPath);
        if (hasNameConflict(manifest.decks, name)) {
          return json(res, 409, { error: 'deck name already exists' });
        }
        const deck: Deck = {
          id: newDeckId(),
          name,
          description: description || undefined,
          theme: typeof body.theme === 'string' ? body.theme : undefined,
          slideOrder: [],
        };
        manifest.decks.push(deck);
        await writeManifest(ctx.manifestPath, manifest);
        return json(res, 200, deck);
      }

      // Deck CRUD by id
      const deckMatch = url.pathname.match(/^\/decks\/([^/]+)$/);
      if (deckMatch) {
        const id = deckMatch[1];
        if (!DECK_ID_RE.test(id)) return json(res, 400, { error: 'invalid id' });

        if (method === 'PUT') {
          const guard = validateMutationRequest(req, { requireJsonBody: true });
          if (!guard.ok) return json(res, guard.status, { error: guard.error });

          const body = (await readBody(req)) as {
            name?: unknown;
            description?: unknown;
            theme?: unknown;
          };
          const manifest = await readManifest(ctx.manifestPath);
          const patch: Partial<Deck> = {};
          if (body.name !== undefined) {
            const name = validateDeckName(body.name);
            if (!name) return json(res, 400, { error: 'invalid name' });
            if (hasNameConflict(manifest.decks, name, id)) {
              return json(res, 409, { error: 'deck name already exists' });
            }
            patch.name = name;
          }
          if (body.description !== undefined) {
            const desc = validateDeckDescription(body.description);
            if (desc === null) return json(res, 400, { error: 'invalid description' });
            patch.description = desc || undefined;
          }
          if (body.theme !== undefined) {
            patch.theme = typeof body.theme === 'string' ? body.theme : undefined;
          }

          const updated = updateDeck(manifest, id, patch);
          if (!updated) return json(res, 404, { error: 'deck not found' });
          await writeManifest(ctx.manifestPath, updated);
          return json(
            res,
            200,
            updated.decks.find((d) => d.id === id),
          );
        }

        if (method === 'DELETE') {
          const guard = validateMutationRequest(req);
          if (!guard.ok) return json(res, guard.status, { error: guard.error });

          const manifest = await readManifest(ctx.manifestPath);
          const before = manifest.decks.length;
          const updated = removeDeck(manifest, id);
          if (updated.decks.length === before) return json(res, 404, { error: 'deck not found' });
          await writeManifest(ctx.manifestPath, updated);
          return json(res, 200, { ok: true });
        }
      }

      next();
    } catch (err) {
      json(res, 500, { error: String((err as Error).message ?? err) });
    }
  });
}
