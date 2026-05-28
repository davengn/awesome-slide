import type { Plugin } from 'vite';
import { registerAgentChatRoutes } from '../http/agent-chat-api.ts';
import { registerManagementRoutes } from '../http/management-api.ts';
import { registerAssetRoutes } from './routes/assets.ts';
import { registerCommentRoutes } from './routes/comments.ts';
import { type ApiPluginOptions, makeContext } from './routes/context.ts';
import { registerEditRoutes } from './routes/edit.ts';
import { registerFolderRoutes } from './routes/folders.ts';
import { registerSlideRoutes } from './routes/slides.ts';
import { registerSvglRoutes } from './routes/svgl.ts';
import { registerWatchers } from './routes/watchers.ts';

export type { ApiPluginOptions };

// All Awesome Slide dev-server endpoints in one plugin. To see the routes
// owned by a group, open the matching file under `routes/` — each file
// leads with a comment-block manifest of its endpoints.
export function apiPlugin(opts: ApiPluginOptions): Plugin {
  return {
    name: 'awesome-slide:api',
    apply: 'serve',
    configureServer(server) {
      const ctx = makeContext(opts);
      registerWatchers(server, ctx);
      registerEditRoutes(server, ctx);
      registerCommentRoutes(server, ctx);
      registerSlideRoutes(server, ctx);
      registerAssetRoutes(server, ctx);
      registerSvglRoutes(server);
      registerFolderRoutes(server, ctx);
      registerManagementRoutes(server, ctx);
      registerAgentChatRoutes(server, ctx);
    },
  };
}
