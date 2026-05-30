import crypto from 'node:crypto';
import type {
  ContextSnapshot,
  MessageTranscriptItem,
  OutputContract,
  PromptPackage,
  RuntimeConnectionSnapshot,
  RuntimeMode,
  WorkflowRef,
} from './contracts.ts';

export interface AssemblePromptPackageInput {
  userPrompt: string;
  connection: RuntimeConnectionSnapshot;
  context: ContextSnapshot;
  workflowRefs: WorkflowRef[];
  transcript?: MessageTranscriptItem[];
  runtimeMode?: RuntimeMode;
  now?: string;
}

function promptPackageId(input: AssemblePromptPackageInput, createdAt: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userPrompt: input.userPrompt,
        contextSnapshotId: input.context.contextSnapshotId,
        workflows: input.workflowRefs.map((workflow) => workflow.contentHash),
        createdAt,
      }),
    )
    .digest('hex')
    .slice(0, 12);
  return `prompt_${hash}`;
}

function outputContractFor(
  connection: RuntimeConnectionSnapshot,
  runtimeMode: RuntimeMode,
): OutputContract {
  const writeAccess = runtimeMode === 'interactive' && connection.capabilities.writeCapable;
  return {
    kind: writeAccess ? 'awesome-slide-proposal' : 'text-only',
    writeAccess,
    requiresStructuredEnvelope: writeAccess,
    validationChecks: [
      'source-fingerprint',
      'tsx-parse',
      'metadata-schema',
      'mutation-guard',
      runtimeMode === 'read-only' ? 'read-only-mode' : 'risk-confirmation',
    ],
  };
}

function capabilityInstructions(
  connection: RuntimeConnectionSnapshot,
  runtimeMode: RuntimeMode,
): string {
  const lines: string[] = [];
  if (connection.type === 'api-provider') {
    lines.push('Do not call tools or assume direct filesystem access.');
  }
  if (connection.capabilities.localFileContext) {
    lines.push('Use the provided source context as the local project boundary.');
  }
  if (runtimeMode === 'read-only') {
    lines.push('Read-only mode is active. Do not propose or describe file mutations as applied.');
  } else if (connection.capabilities.writeCapable) {
    lines.push('For file changes, emit the required awesome-slide-proposal envelope.');
  } else {
    lines.push('This connection can answer questions but cannot write slide files.');
  }
  return lines.join('\n');
}

function systemInstructions(workflowRefs: WorkflowRef[], capabilityText: string): string {
  return [
    'You are running inside the Awesome Slide agent runtime.',
    'Follow the selected workflow instructions exactly.',
    capabilityText,
    workflowRefs
      .map(
        (workflow) =>
          `Workflow ${workflow.workflowId} (${workflow.contentHash}):\n${workflow.instructions}`,
      )
      .join('\n\n'),
  ].join('\n\n');
}

export function assemblePromptPackage(input: AssemblePromptPackageInput): PromptPackage {
  const runtimeMode = input.runtimeMode ?? 'interactive';
  const createdAt = input.now ?? new Date().toISOString();
  const capabilityText = capabilityInstructions(input.connection, runtimeMode);

  return {
    promptPackageId: promptPackageId(input, createdAt),
    userPrompt: input.userPrompt,
    systemInstructions: systemInstructions(input.workflowRefs, capabilityText),
    workflowRefs: input.workflowRefs,
    context: input.context,
    transcript: input.transcript ?? [],
    capabilityInstructions: capabilityText,
    outputContract: outputContractFor(input.connection, runtimeMode),
    createdAt,
  };
}
