import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import type {
  AgentConnectionConfig,
  ConnectionCapabilities,
} from '../app/lib/agent-connection-types.ts';
import { normalizeCapabilities } from '../app/lib/agent-connections.ts';
import type { RuntimeEventInput } from './events.ts';
import { normalizeLocalAgentExit, parseLocalAgentStdoutChunk } from './local-stream-parsers.ts';

export type LocalAgentRuntimeId = 'codex' | 'claude-code';

export interface RuntimeLocalAgentRequest {
  runId: string;
  prompt: string;
  context: unknown;
  workflows: Array<{
    id?: string;
    workflowId?: string;
    contentHash: string;
    instructions: string;
  }>;
  connectionId: string;
  modelId?: string;
  reasoningEffort?: string;
  capabilities: ConnectionCapabilities;
  signal: AbortSignal;
}

export interface LocalAgentConfig {
  provider?: string;
  type?: string;
  agentCommandAlias?: string;
  manualPathRef?: string;
}

export interface LocalAgentInvocation {
  runtimeId: LocalAgentRuntimeId;
  command: string;
  args: string[];
  input: string;
  cwd: string;
  env?: Record<string, string>;
}

export interface LocalAgentRuntimeDefinition {
  id: LocalAgentRuntimeId;
  displayName: string;
  commands: string[];
  capabilities: ConnectionCapabilities;
  buildInvocation: (
    commandOrPath: string,
    request: RuntimeLocalAgentRequest,
    cwd: string,
  ) => LocalAgentInvocation;
  cancel: (child: ChildProcessWithoutNullStreams) => void;
}

export class IncompatibleLocalAgentError extends Error {
  constructor(readonly commandOrPath: string) {
    super('Local agent does not have an explicit Awesome Slide runtime definition.');
    this.name = 'IncompatibleLocalAgentError';
  }
}

function commandBasename(commandOrPath: string): string | undefined {
  return commandOrPath.toLowerCase().replace(/\\/g, '/').split('/').pop();
}

function buildLocalAgentPrompt(req: RuntimeLocalAgentRequest): string {
  return [
    req.prompt,
    '',
    'You are running from Awesome Slide agent chat. Use this context when it is relevant.',
    '<awesome-slide-context>',
    JSON.stringify({ context: req.context, workflows: req.workflows }, null, 2),
    '</awesome-slide-context>',
  ].join('\n');
}

function cancelChild(child: ChildProcessWithoutNullStreams): void {
  child.kill();
}

export const LOCAL_AGENT_RUNTIME_DEFINITIONS: LocalAgentRuntimeDefinition[] = [
  {
    id: 'codex',
    displayName: 'Codex CLI',
    commands: ['codex', 'codex.cmd', 'codex.exe'],
    capabilities: normalizeCapabilities({
      streaming: true,
      cancellation: true,
      structuredProposals: true,
      toolCalls: true,
      localFileContext: true,
      writeCapable: true,
      maxContextBytes: 256 * 1024,
      supportedModalities: ['text'],
    }),
    buildInvocation: (commandOrPath, req, cwd) => {
      const args = [
        'exec',
        '--cd',
        cwd,
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
        '--color',
        'never',
      ];
      if (req.modelId) {
        args.push('--model', req.modelId);
      }
      args.push('-');
      return {
        runtimeId: 'codex',
        command: commandOrPath,
        args,
        input: buildLocalAgentPrompt(req),
        cwd,
      };
    },
    cancel: cancelChild,
  },
  {
    id: 'claude-code',
    displayName: 'Claude Code',
    commands: ['claude', 'claude.cmd', 'claude.exe'],
    capabilities: normalizeCapabilities({
      streaming: true,
      cancellation: true,
      structuredProposals: true,
      toolCalls: true,
      localFileContext: true,
      writeCapable: true,
      maxContextBytes: 256 * 1024,
      supportedModalities: ['text'],
    }),
    buildInvocation: (commandOrPath, req, cwd) => {
      const args = [
        '--print',
        '--input-format',
        'text',
        '--output-format',
        'text',
        '--permission-mode',
        'acceptEdits',
      ];
      if (req.modelId) {
        args.push('--model', req.modelId);
      }
      return {
        runtimeId: 'claude-code',
        command: commandOrPath,
        args,
        input: buildLocalAgentPrompt(req),
        cwd,
      };
    },
    cancel: cancelChild,
  },
];

export function isCodexCli(commandOrPath: string, connectionConfig?: LocalAgentConfig): boolean {
  if (connectionConfig?.provider === 'codex') {
    return true;
  }
  const basename = commandBasename(commandOrPath);
  return basename === 'codex' || basename === 'codex.cmd' || basename === 'codex.exe';
}

export function isClaudeCodeCli(
  commandOrPath: string,
  connectionConfig?: LocalAgentConfig,
): boolean {
  if (connectionConfig?.provider === 'claude-code') {
    return true;
  }
  const basename = commandBasename(commandOrPath);
  return basename === 'claude' || basename === 'claude.cmd' || basename === 'claude.exe';
}

export function resolveLocalAgentRuntimeDefinition(
  commandOrPath: string,
  connectionConfig?: LocalAgentConfig,
): LocalAgentRuntimeDefinition | null {
  if (isCodexCli(commandOrPath, connectionConfig)) {
    return LOCAL_AGENT_RUNTIME_DEFINITIONS.find((definition) => definition.id === 'codex') ?? null;
  }
  if (isClaudeCodeCli(commandOrPath, connectionConfig)) {
    return (
      LOCAL_AGENT_RUNTIME_DEFINITIONS.find((definition) => definition.id === 'claude-code') ?? null
    );
  }
  return null;
}

export function createLocalAgentInvocation(
  commandOrPath: string,
  connectionConfig: LocalAgentConfig | undefined,
  req: RuntimeLocalAgentRequest,
  cwd: string,
): LocalAgentInvocation {
  const definition = resolveLocalAgentRuntimeDefinition(commandOrPath, connectionConfig);
  if (!definition) {
    throw new IncompatibleLocalAgentError(commandOrPath);
  }
  return definition.buildInvocation(commandOrPath, req, cwd);
}

export async function* runLocalAgentCli(
  commandOrPath: string,
  connectionConfig: AgentConnectionConfig | LocalAgentConfig | undefined,
  req: RuntimeLocalAgentRequest,
  cwd: string,
): AsyncIterable<RuntimeEventInput> {
  const definition = resolveLocalAgentRuntimeDefinition(commandOrPath, connectionConfig);
  if (!definition) {
    throw new IncompatibleLocalAgentError(commandOrPath);
  }
  const invocation = definition.buildInvocation(commandOrPath, req, cwd);
  const child = spawn(commandOrPath, invocation.args, {
    cwd,
    env: invocation.env ? { ...process.env, ...invocation.env } : process.env,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdoutText = '';
  let stderrText = '';
  const closePromise = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const cancel = () => definition.cancel(child);

  req.signal.addEventListener('abort', cancel, { once: true });
  child.stderr.on('data', (chunk: Buffer) => {
    stderrText += chunk.toString();
  });

  try {
    child.stdin.end(invocation.input);
    for await (const chunk of child.stdout) {
      if (req.signal.aborted) {
        definition.cancel(child);
        break;
      }
      const text = chunk.toString();
      stdoutText += text;
      for (const event of parseLocalAgentStdoutChunk(text)) {
        yield { runId: req.runId, ...event };
      }
    }

    const exitCode = await closePromise;
    for (const event of normalizeLocalAgentExit({
      exitCode,
      stdoutText,
      stderrText,
      aborted: req.signal.aborted,
    })) {
      yield { runId: req.runId, ...event };
    }
  } finally {
    req.signal.removeEventListener('abort', cancel);
  }
}
