# Contract: Prompt And Proposal

## Scope

Defines how runtime prompts are assembled and how model/agent output becomes reviewable slide changes.

## Prompt Package

```ts
interface PromptPackage {
  id: string;
  userPrompt: string;
  systemInstructions: string;
  workflowRefs: WorkflowRef[];
  context: ContextSnapshot;
  transcript: MessageTranscriptItem[];
  capabilityInstructions: string;
  outputContract: OutputContract;
  createdAt: string;
}
```

Rules:

- Prompt assembly happens server-side in `agent-runtime/prompts.ts`.
- Workflow instructions are loaded from `packages/core/skills/*/SKILL.md`.
- Missing required workflow files produce a recoverable non-writing error.
- Prompt packages are not responsible for provider/local transport.

## Workflow Selection

Required mappings:

| User intent | Workflow refs |
|-------------|---------------|
| Current slide edit or deictic reference | `current-slide`, `slide-authoring` |
| New slide or deck generation | `create-slide`, `slide-authoring` |
| Inspector comment application | `apply-comments`, `slide-authoring` |
| Theme creation or extraction | `create-theme` |
| Theme application or layout redesign | `slide-authoring`, optional `create-theme` |

Rules:

- The active workflow names and hashes are included in run metadata, status cards, proposals, and audit.
- The runtime may choose multiple workflow refs for a prompt.

## Context Snapshot

```ts
interface ContextSnapshot {
  project: { name?: string; rootLabel?: string };
  slide?: { id: string; title?: string; pageIndex?: number; pageCount?: number };
  selection?: SelectedElementDescriptor[];
  collection?: { folderId?: string; deckId?: string; slideIds?: string[] };
  theme?: { activeThemeId?: string; availableThemeIds: string[] };
  notes?: { included: boolean; currentPage?: string; deckSummary?: string };
  source?: { excerpts: SourceExcerpt[]; totalBytes: number; truncated: boolean };
  limits: { maxBytes: number; generatedAt: string };
}
```

Rules:

- Default max context is the smaller of connection max and runtime max.
- Hidden files, `.env*`, credentials, and unrelated source are excluded by default.
- Truncation is visible in the prompt package and UI context summary.

## Output Contract

File-changing runs instruct the model/agent to emit a structured envelope:

```json
{
  "kind": "awesome-slide-proposal",
  "summary": "Create an intro slide",
  "scope": "slide",
  "riskLevel": "low",
  "operations": [
    {
      "kind": "create-slide",
      "target": "deck_1",
      "description": "Create product intro slide",
      "payload": {
        "slideId": "product-intro",
        "title": "Product Intro",
        "code": "..."
      }
    }
  ]
}
```

Rules:

- Provider/local text deltas can render as assistant text.
- Only valid structured envelopes can create proposals.
- Invalid envelopes produce `invalid-agent-output` or `parser-error`.
- Tool-call output can be translated into the same envelope only when the runtime owns the tool protocol.

## Proposal Validation

Validation checks:

- `source-fingerprint`
- `tsx-parse`
- `metadata-schema`
- `theme-exists`
- `deck-exists`
- `mutation-guard`
- `read-only-mode`
- `risk-confirmation`

Rules:

- Validation runs before proposal is shown when fast enough.
- Apply always revalidates.
- Conflicts block writes.
- High-risk operations require explicit confirmation.

## Apply Transaction

```ts
interface ApplyTransaction {
  transactionId: string;
  proposalId: string;
  selectedOperationIds: string[];
  state: 'applying' | 'applied' | 'failed' | 'rolled-back';
  writtenFiles: string[];
  auditEntryId?: string;
  error?: RuntimeError;
}
```

Rules:

- Selected apply reports success only if every selected operation succeeds.
- Rollback uses file backups captured before writes when possible.
- Successful apply triggers slide/deck refresh from file metadata.
- Audit entry is written after successful transaction.

## Preview Artifacts

Allowed artifacts:

- Operation list.
- Source diff.
- Rendered before/after reference.
- Diagnostics summary.
- Generated-file summary.

Rules:

- Bulky artifacts are referenced, not stored in message history.
- Preview artifacts cannot include raw credentials or hidden-file contents.
