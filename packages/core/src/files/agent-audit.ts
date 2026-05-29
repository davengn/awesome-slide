import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { redactDiagnostics } from '../app/lib/agent-chat-errors.ts';
import type { AgentAuditEntry } from '../app/lib/agent-chat-types.ts';

export async function appendAuditEntry(
  projectRoot: string,
  entryData: Omit<AgentAuditEntry, 'id' | 'timestamp'>,
): Promise<AgentAuditEntry> {
  const auditDir = path.join(projectRoot, '.awesome-slide/agent-chat');
  const auditFilePath = path.join(auditDir, 'audit.jsonl');

  // Redact secrets in prompt and summaries
  const prompt = redactDiagnostics(entryData.prompt);
  const contextSummary = redactDiagnostics(entryData.contextSummary);
  const proposalSummary = redactDiagnostics(entryData.proposalSummary);
  const validationSummary = redactDiagnostics(entryData.validationSummary);

  const entry: AgentAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    prompt,
    contextSummary,
    proposalSummary,
    appliedFiles: entryData.appliedFiles,
    operationKinds: entryData.operationKinds,
    connection: entryData.connection,
    validationSummary,
  };

  // Ensure directory exists
  await fs.mkdir(auditDir, { recursive: true });

  // Append entry to JSONL file
  await fs.appendFile(auditFilePath, `${JSON.stringify(entry)}\n`, 'utf-8');

  return entry;
}

export async function readAuditEntries(projectRoot: string): Promise<AgentAuditEntry[]> {
  const auditFilePath = path.join(projectRoot, '.awesome-slide/agent-chat/audit.jsonl');
  try {
    const content = await fs.readFile(auditFilePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line)).reverse();
  } catch {
    return [];
  }
}
