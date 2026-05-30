import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeAuditSummary,
  RuntimeConversation,
  RuntimeEditProposal,
  RuntimeEvent,
  RuntimeRun,
} from './contracts.ts';
import { redactJsonValue } from './redaction.ts';

export interface AgentRuntimeStorageOptions {
  projectRoot?: string;
  storageRoot?: string;
  maxMessages?: number;
  maxEvents?: number;
  maxBytes?: number;
}

export interface AgentRuntimeStorage {
  storageRoot: string;
  paths: {
    conversations: string;
    runs: string;
    events: string;
    proposals: string;
    audit: string;
  };
  writeConversation: (conversation: RuntimeConversation) => Promise<void>;
  readConversation: (conversationId: string) => Promise<RuntimeConversation | null>;
  writeRun: (run: RuntimeRun) => Promise<void>;
  readRun: (runId: string) => Promise<RuntimeRun | null>;
  appendRunEvent: (runId: string, event: RuntimeEvent) => Promise<RuntimeEvent[]>;
  listRunEvents: (runId: string) => Promise<RuntimeEvent[]>;
  writeProposal: (proposal: RuntimeEditProposal) => Promise<void>;
  readProposal: (proposalId: string) => Promise<RuntimeEditProposal | null>;
  writeAuditSummary: (summary: RuntimeAuditSummary) => Promise<void>;
  listAuditSummaries: (limit?: number) => Promise<RuntimeAuditSummary[]>;
}

const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_MAX_EVENTS = 200;
const DEFAULT_MAX_BYTES = 256 * 1024;

export function runtimeStorageRootForProject(projectRoot: string): string {
  return path.join(projectRoot, '.awesome-slide', 'agent-chat');
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '_');
}

function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function trimArrayByBytes<T>(items: T[], maxBytes: number): T[] {
  const trimmed = [...items];
  while (trimmed.length > 0 && jsonBytes(trimmed) > maxBytes) {
    trimmed.shift();
  }
  return trimmed;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(redactJsonValue(value), null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

export function createAgentRuntimeStorage(
  options: AgentRuntimeStorageOptions = {},
): AgentRuntimeStorage {
  const storageRoot = options.storageRoot
    ? path.resolve(options.storageRoot)
    : runtimeStorageRootForProject(path.resolve(options.projectRoot ?? process.cwd()));
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const paths = {
    conversations: path.join(storageRoot, 'conversations'),
    runs: path.join(storageRoot, 'runs'),
    events: path.join(storageRoot, 'events'),
    proposals: path.join(storageRoot, 'proposals'),
    audit: path.join(storageRoot, 'audit'),
  };

  return {
    storageRoot,
    paths,
    writeConversation: async (conversation) => {
      const bounded = {
        ...conversation,
        messageIds: trimArrayByBytes(conversation.messageIds.slice(-maxMessages), maxBytes),
      };
      await writeJson(
        path.join(paths.conversations, `${safeId(conversation.conversationId)}.json`),
        bounded,
      );
    },
    readConversation: (conversationId) =>
      readJson<RuntimeConversation>(
        path.join(paths.conversations, `${safeId(conversationId)}.json`),
      ),
    writeRun: async (run) => {
      await writeJson(path.join(paths.runs, `${safeId(run.runId)}.json`), run);
    },
    readRun: (runId) => readJson<RuntimeRun>(path.join(paths.runs, `${safeId(runId)}.json`)),
    appendRunEvent: async (runId, event) => {
      const filePath = path.join(paths.events, `${safeId(runId)}.json`);
      const events = (await readJson<RuntimeEvent[]>(filePath)) ?? [];
      const bounded = trimArrayByBytes([...events, event].slice(-maxEvents), maxBytes);
      await writeJson(filePath, bounded);
      return bounded;
    },
    listRunEvents: async (runId) =>
      (await readJson<RuntimeEvent[]>(path.join(paths.events, `${safeId(runId)}.json`))) ?? [],
    writeProposal: async (proposal) => {
      await writeJson(path.join(paths.proposals, `${safeId(proposal.proposalId)}.json`), proposal);
    },
    readProposal: (proposalId) =>
      readJson<RuntimeEditProposal>(path.join(paths.proposals, `${safeId(proposalId)}.json`)),
    writeAuditSummary: async (summary) => {
      await writeJson(path.join(paths.audit, `${safeId(summary.auditEntryId)}.json`), summary);
    },
    listAuditSummaries: async (limit = 50) => {
      try {
        const files = await fs.readdir(paths.audit);
        const summaries = await Promise.all(
          files
            .filter((file) => file.endsWith('.json'))
            .map((file) => readJson<RuntimeAuditSummary>(path.join(paths.audit, file))),
        );
        return summaries
          .filter((summary): summary is RuntimeAuditSummary => Boolean(summary))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, limit);
      } catch {
        return [];
      }
    },
  };
}
