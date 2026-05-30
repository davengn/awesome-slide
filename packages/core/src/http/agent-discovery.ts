import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AgentScanPreference,
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
  lookup: async (command: string) => {
    return new Promise((resolve) => {
      execFile(command, ['--version'], { timeout: 1000, shell: false }, (error, stdout, stderr) => {
        if (error) {
          resolve({ found: false });
        } else {
          const combined = `${stdout}\n${stderr}`.trim();
          const versionMatch = combined.match(/(?:version\s+)?v?(\d+\.\d+\.\d+(?:-\w+)?)/i);
          resolve({
            found: true,
            version: versionMatch ? versionMatch[1] : undefined,
            pathLabel: command,
          });
        }
      });
    });
  },
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
  try {
    if (isFullDiskPath(input)) return { ok: false, error: 'Full-disk scan roots are not allowed.' };
  } catch {
    return { ok: false, error: 'Invalid path format.' };
  }
  return { ok: true };
}

export function addApprovedDirectory(
  pref: AgentScanPreference,
  dirPath: string,
): { ok: true; preference: AgentScanPreference } | { ok: false; error: string } {
  const validation = validateApprovedDirectory(dirPath);
  if (!validation.ok) return { ok: false, error: validation.error };

  const resolved = path.resolve(dirPath);
  const exists = pref.approvedDirectories.some((d) => path.resolve(d.pathLabel) === resolved);
  if (exists) return { ok: false, error: 'Directory is already added.' };

  const newDir: ScanDirectory = {
    id: `dir_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    pathLabel: dirPath,
    source: 'user-approved',
    createdAt: nowIso(),
  };

  return {
    ok: true,
    preference: {
      ...pref,
      approvedDirectories: [...pref.approvedDirectories, newDir],
    },
  };
}

export function removeApprovedDirectory(
  pref: AgentScanPreference,
  id: string,
): AgentScanPreference {
  return {
    ...pref,
    approvedDirectories: pref.approvedDirectories.filter((d) => d.id !== id),
  };
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

async function probeCommandOrExecutable(
  filePathOrCommand: string,
): Promise<{ ok: boolean; version?: string; output?: string; error?: string }> {
  return new Promise((resolve) => {
    const trimmed = filePathOrCommand.trim();
    if (!trimmed) {
      return resolve({ ok: false, error: 'Command or path is empty' });
    }

    execFile(trimmed, ['--version'], { timeout: 1000, shell: false }, (error, stdout, stderr) => {
      const combined = `${stdout}\n${stderr}`.trim();
      const redactedCombined = redactDiagnostics(combined);

      if (error) {
        const isTimeout =
          error.signal === 'SIGTERM' || (error as Error & { killed?: boolean }).killed;
        if (isTimeout) {
          return resolve({ ok: false, error: 'Validation timed out.' });
        }

        const rawError = error.message.toLowerCase();
        if (
          rawError.includes('not found') ||
          rawError.includes('is not recognized') ||
          rawError.includes('enoent')
        ) {
          return resolve({
            ok: false,
            error: 'Command or executable not found in PATH or filesystem.',
          });
        }

        if (
          redactedCombined.includes('incompatible') ||
          redactedCombined.includes('unknown protocol')
        ) {
          return resolve({
            ok: false,
            error: 'Incompatible agent protocol.',
            output: redactedCombined,
          });
        }

        return resolve({
          ok: true,
          output: redactedCombined,
        });
      }

      if (
        redactedCombined.includes('incompatible') ||
        redactedCombined.includes('unknown protocol')
      ) {
        return resolve({
          ok: false,
          error: 'Incompatible agent protocol.',
          output: redactedCombined,
        });
      }

      const versionMatch = redactedCombined.match(/(?:version\s+)?v?(\d+\.\d+\.\d+(?:-\w+)?)/i);
      resolve({
        ok: true,
        version: versionMatch ? versionMatch[1] : undefined,
        output: redactedCombined,
      });
    });
  });
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
    const probe = await probeCommandOrExecutable(trimmed);
    if (!probe.ok) {
      return {
        status: 'fail',
        message: probe.error || 'Command not found or failed to execute.',
        diagnostics: probe.output,
      };
    }
    return {
      status: 'pass',
      provider: inferProvider(trimmed),
      version: probe.version,
      message: 'Command accepted and passed validation.',
      diagnostics: probe.output,
    };
  }

  if (kind === 'executable') {
    try {
      const stat = await fs.stat(trimmed);
      if (stat.isDirectory()) {
        return { status: 'fail', message: 'Expected an executable file, but found a directory.' };
      }
    } catch {
      return { status: 'fail', message: 'Path does not exist or cannot be read.' };
    }

    const probe = await probeCommandOrExecutable(trimmed);
    if (!probe.ok) {
      return {
        status: 'fail',
        message: probe.error || 'Failed to execute path as an agent.',
        diagnostics: probe.output,
      };
    }
    return {
      status: 'pass',
      provider: inferProvider(path.basename(trimmed)),
      version: probe.version,
      message: 'Path exists and passed basic validation.',
      diagnostics: probe.output,
    };
  }

  if (kind === 'project-path') {
    try {
      const stat = await fs.stat(trimmed);
      if (!stat.isDirectory()) {
        return { status: 'fail', message: 'Expected a project directory.' };
      }
      return {
        status: 'pass',
        provider: inferProvider(path.basename(trimmed)),
        message: 'Project directory exists.',
      };
    } catch {
      return { status: 'fail', message: 'Project path does not exist.' };
    }
  }

  return { status: 'fail', message: 'Unknown validation kind.' };
}
