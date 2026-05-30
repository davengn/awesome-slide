import path from 'node:path';
import type { ViteDevServer } from 'vite';
import type { RefreshPayload } from '../../agent-runtime/file-refresh.ts';
import { SLIDE_ID_RE } from '../../editing/slide-ops.ts';
import { GLOBAL_SCOPE } from '../../files/assets.ts';
import type { ApiContext } from './context.ts';

const FILES_CHANGED_EVENTS = ['awesome-slide:files-changed', 'open-slide:files-changed'] as const;
const ASSETS_CHANGED_EVENTS = [
  'awesome-slide:assets-changed',
  'open-slide:assets-changed',
] as const;
const SLIDE_CHANGED_EVENTS = ['awesome-slide:slide-changed', 'open-slide:slide-changed'] as const;

export function notifyAgentRefreshTargets(server: ViteDevServer, refresh: RefreshPayload): void {
  if (refresh.slides.length > 0) {
    for (const event of SLIDE_CHANGED_EVENTS) {
      server.ws?.send({ type: 'custom', event, data: { slideIds: refresh.slides } });
    }
  }

  if (refresh.managementIndex || refresh.decks.length > 0 || refresh.themes.length > 0) {
    for (const event of FILES_CHANGED_EVENTS) {
      server.ws?.send({ type: 'custom', event, data: { refresh } });
    }
  }

  const assetSlideIds = new Set(
    refresh.targets.flatMap((target) =>
      target.refreshKind === 'asset' && target.slideId ? [target.slideId] : [],
    ),
  );
  if (refresh.assets.some((asset) => asset.startsWith('assets/'))) {
    assetSlideIds.add(GLOBAL_SCOPE);
  }
  for (const slideId of assetSlideIds) {
    for (const event of ASSETS_CHANGED_EVENTS) {
      server.ws?.send({ type: 'custom', event, data: { slideId } });
    }
  }
}

// Surface folder-manifest and asset-tree mutations as HMR pings so the
// editor's panels can refresh without a full reload.
export function registerWatchers(server: ViteDevServer, ctx: ApiContext): void {
  server.watcher.add(ctx.manifestPath);
  server.watcher.on('change', (p) => {
    if (p === ctx.manifestPath) {
      for (const event of FILES_CHANGED_EVENTS) server.ws.send({ type: 'custom', event });
    }
  });

  server.watcher.add(ctx.globalAssetsRoot);
  const onAssetChange = (p: string) => {
    if (p.startsWith(ctx.globalAssetsRoot + path.sep) || p === ctx.globalAssetsRoot) {
      for (const event of ASSETS_CHANGED_EVENTS) {
        server.ws.send({
          type: 'custom',
          event,
          data: { slideId: GLOBAL_SCOPE },
        });
      }
      return;
    }
    if (!p.startsWith(ctx.slidesRoot + path.sep)) return;
    const rel = p.slice(ctx.slidesRoot.length + 1);
    const parts = rel.split(path.sep);
    if (parts.length < 3 || parts[1] !== 'assets') return;
    const slideId = parts[0];
    if (!SLIDE_ID_RE.test(slideId)) return;
    for (const event of ASSETS_CHANGED_EVENTS) {
      server.ws.send({
        type: 'custom',
        event,
        data: { slideId },
      });
    }
  };
  server.watcher.on('add', onAssetChange);
  server.watcher.on('change', onAssetChange);
  server.watcher.on('unlink', onAssetChange);
}
