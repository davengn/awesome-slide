import fs from 'node:fs/promises';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import {
  createDefaultAgentConnectionSettings,
  dismissFirstRunSetup,
  normalizeAgentConnectionSettings,
} from '../app/lib/agent-connection-storage.ts';
import type {
  AgentConnectionsBootstrapResponse,
  AgentConnectionsSettingsResponse,
  DismissFirstRunRequest,
} from '../app/lib/agent-connection-types.ts';
import { createSafeBootstrapSnapshot, getProviderRegistry } from '../app/lib/agent-connections.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { json, readBody } from '../vite/routes/context.ts';
import { redactDiagnostics } from './agent-secrets.ts';
import { validateMutationRequest } from './request-guard.ts';

const CONNECTION_DIR = path.join('.awesome-slide', 'agent-connections');
const SETTINGS_FILE = 'settings.json';

export function resolveAgentConnectionSettingsPath(ctx: ApiContext): string {
  return path.join(ctx.userCwd, CONNECTION_DIR, SETTINGS_FILE);
}

export async function readAgentConnectionSettingsForProject(
  ctx: ApiContext,
): Promise<ReturnType<typeof normalizeAgentConnectionSettings>> {
  const projectId = path.basename(ctx.userCwd) || 'project_default';
  try {
    const raw = await fs.readFile(resolveAgentConnectionSettingsPath(ctx), 'utf8');
    return normalizeAgentConnectionSettings(JSON.parse(raw), projectId);
  } catch {
    return createDefaultAgentConnectionSettings(projectId);
  }
}

export async function writeAgentConnectionSettingsForProject(
  ctx: ApiContext,
  settings: ReturnType<typeof normalizeAgentConnectionSettings>,
): Promise<void> {
  const settingsPath = resolveAgentConnectionSettingsPath(ctx);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const normalized = normalizeAgentConnectionSettings(settings, settings.projectId);
  await fs.writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

function runtimeMode(): 'interactive' | 'read-only' {
  return process.env.AGENT_RUNTIME_MODE === 'read-only' ? 'read-only' : 'interactive';
}

function bootstrapResponse(
  settings: Awaited<ReturnType<typeof readAgentConnectionSettingsForProject>>,
): AgentConnectionsBootstrapResponse {
  return {
    ...createSafeBootstrapSnapshot(settings),
    runtime: {
      mode: runtimeMode(),
      settingsRoute: '/settings/connections',
      settingsModalTarget: 'execution-model',
    },
  };
}

function settingsResponse(
  settings: Awaited<ReturnType<typeof readAgentConnectionSettingsForProject>>,
): AgentConnectionsSettingsResponse {
  return {
    connections: settings.connections,
    activeConnectionId: settings.activeConnectionId,
    projectDefaultConnectionId: settings.projectDefaultConnectionId,
    scanPreference: settings.scanPreference,
    firstRunSetup: settings.firstRunSetup,
    candidates: [],
    providers: getProviderRegistry(),
  };
}

export function registerAgentConnectionRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__agent-connections', async (req, res, next) => {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    try {
      if (req.method === 'GET' && pathname === '/bootstrap') {
        const settings = await readAgentConnectionSettingsForProject(ctx);
        return json(res, 200, bootstrapResponse(settings));
      }

      if (req.method === 'GET' && pathname === '/settings') {
        const settings = await readAgentConnectionSettingsForProject(ctx);
        return json(res, 200, settingsResponse(settings));
      }

      if (req.method === 'POST' && pathname === '/first-run/dismiss') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as DismissFirstRunRequest;
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const nextSettings = dismissFirstRunSetup(settings, body.reason ?? 'do-later');
        await writeAgentConnectionSettingsForProject(ctx, nextSettings);
        return json(res, 200, { ok: true });
      }

      return next();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      return json(res, 500, {
        error: 'Agent connection settings failed.',
        category: 'unknown',
        recoveryActions: ['open-settings', 'copy-diagnostics'],
        diagnostics: redactDiagnostics(raw),
      });
    }
  });
}
