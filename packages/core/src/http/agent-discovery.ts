import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  LocalAgentCandidate,
  LocalAgentProviderId,
  ManualAgentPath,
  ScanDirectory,
  ValidationResult,
} from '../app/lib/agent-connection-types.ts';
import { getProviderRegistry } from '../app/lib/agent-connections.ts';
import { redactDiagnostics } from './agent-secrets.ts';

export interface CommandLookupResult {
  found: boolean;
  version?: string;
  pathLabel?: string;
}

export interface CommandLookup {
  lookup: (command: string) => Promise<CommandLookupResult> | CommandLookupResult;
}

const defaultCommandLookup: CommandLookup = {
  lookup: () => ({ found: false }),
};

function nowIso(): string {
  return new Date().toISOString();
}

export function getKnownLocalAgentProviders() {
  return getProviderRegistry().filter((entry) => entry.type === 'local-agent');
}

export function isFullDiskPath(input: string): boolean {
  const resolved = path.resolve(input);
  const parsed = path.parse(resolved);
  return resolved === parsed.root;
}

export function redactPathLabel(input: string): string {
  return redactDiagnostics(input);
}

export function validateApprovedDirectory(
  input: string,
): { ok: true } | { ok: false; error: string } {
  if (!input.trim()) return { ok: false, error: 'Directory is required.' };
  if (isFullDiskPath(input)) return { ok: false, error: 'Full-disk scan roots are not allowed.' };
  return { ok: true };
}

export async function discoverLocalAgentCandidates(
  opts: {
    includePathCommands?: boolean;
    includeKnownInstallLocations?: boolean;
    approvedDirectories?: ScanDirectory[];
    commandLookup?: CommandLookup;
  } = {},
): Promise<LocalAgentCandidate[]> {
  const lookup = opts.commandLookup ?? defaultCommandLookup;
  const candidates: LocalAgentCandidate[] = [];

  if (opts.includePathCommands !== false) {
    for (const provider of getKnownLocalAgentProviders()) {
      for (const command of provider.knownCommands ?? []) {
        const result = await lookup.lookup(command);
        candidates.push({
          id: `cmd_${provider.id}_${command}`,
          provider: provider.id as LocalAgentProviderId,
          displayName: provider.displayName,
          command,
          pathLabel: result.pathLabel ? redactPathLabel(result.pathLabel) : command,
          source: 'path',
          version: result.version,
          status: result.found ? 'installed' : 'not-installed',
          compatibility: result.found
            ? { status: 'compatible', message: `${provider.displayName} detected.` }
            : undefined,
          lastSeenAt: nowIso(),
        });
      }
    }
  }

  if (opts.includeKnownInstallLocations !== false) {
    for (const provider of getKnownLocalAgentProviders()) {
      for (const knownPath of provider.knownInstallPaths ?? []) {
        candidates.push({
          id: `known_${provider.id}_${Buffer.from(knownPath).toString('base64url')}`,
          provider: provider.id as LocalAgentProviderId,
          displayName: provider.displayName,
          pathLabel: redactPathLabel(knownPath),
          source: 'known-location',
          status: 'needs-manual-path',
          lastSeenAt: nowIso(),
        });
      }
    }
  }

  for (const directory of opts.approvedDirectories ?? []) {
    const validation = validateApprovedDirectory(directory.pathLabel);
    if (!validation.ok) continue;
    candidates.push({
      id: `dir_${directory.id}`,
      provider: 'codex',
      displayName: 'Approved directory',
      pathLabel: redactPathLabel(directory.pathLabel),
      source: 'approved-directory',
      status: 'needs-manual-path',
      lastSeenAt: nowIso(),
    });
  }

  return candidates;
}

function inferProvider(input: string): LocalAgentProviderId | undefined {
  const lowered = input.toLowerCase();
  if (lowered.includes('claude')) return 'claude-code';
  if (lowered.includes('codex')) return 'codex';
  if (lowered.includes('gemini')) return 'gemini-cli';
  if (lowered.includes('opencode')) return 'opencode';
  return undefined;
}

export async function validateManualAgentPath(
  input: string,
  kind: ManualAgentPath['kind'],
): Promise<ValidationResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { status: 'fail', message: 'Path or command is required.' };
  }

  if (kind === 'command') {
    return {
      status: 'pass',
      provider: inferProvider(trimmed),
      message: 'Command accepted for validation.',
    };
  }

  try {
    const stat = await fs.stat(trimmed);
    if (kind === 'executable' && stat.isDirectory()) {
      return { status: 'fail', message: 'Expected an executable file, but found a directory.' };
    }
    if (kind === 'project-path' && !stat.isDirectory()) {
      return { status: 'fail', message: 'Expected a project directory.' };
    }
    return {
      status: 'pass',
      provider: inferProvider(path.basename(trimmed)),
      message: 'Path exists and passed basic validation.',
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    return {
      status: 'fail',
      message: 'Path does not exist or cannot be read.',
      diagnostics: redactDiagnostics(raw),
    };
  }
}
