# Contract: Prompt Style Matrix

## Required Cases

The first E2E generation matrix must include at least these five cases.

| Case ID | Style | Entry Point | Prompt Shape | Expected Result |
|---------|-------|-------------|--------------|-----------------|
| `terse-command` | Terse command | Slide library prompt creation | "Create a product launch slide for Atlas." | Creates a slide with a clear product launch title and visible supporting content. |
| `structured-brief` | Structured creative brief | Slide library prompt creation | Goal, audience, tone, sections, and constraints in prose. | Creates a slide matching the requested sections and tone. |
| `markdown-brief` | Markdown/bullet brief | Slide library prompt creation | Markdown headings and bullets for content hierarchy. | Creates a slide whose visible hierarchy reflects the bullet structure. |
| `conversational-request` | Conversational | Slide page chat | Natural request such as "Can you make this feel more executive-ready?" | Updates the active slide through a proposal and visible text/source change. |
| `iterative-follow-up` | Follow-up edit | Slide page chat after a previous generated slide | "Make the metrics more prominent and tighten the headline." | Applies a second proposal to the existing generated slide and preserves slide renderability. |

## Success Definition

For each successful case, tests must assert:

- The submitted prompt remains visible or recoverable in chat history.
- The active connection shown in the session matches the fixture connection.
- The chat run reaches a terminal successful state.
- A proposal appears when the flow requires review.
- Proposal apply succeeds.
- Generated or updated slide source/metadata exists in the fixture project.
- The slide can be opened in the browser.
- The slide preview renders visible text or nonblank pixels.

## Failure Definition

For connection-failure cases, tests must assert:

- The run does not apply partial edits.
- A categorized recovery action is visible.
- Diagnostics are redacted.
- The composer remains usable after recovery or retry setup.

## Prompt Case Data Rules

- Prompts should be natural user language, not internal simulation prefixes.
- Expected text should be deterministic and short enough for stable assertions.
- Cases should avoid model-quality assertions that depend on subjective wording.
- Each case should have one primary assertion and a small number of supporting assertions to keep the suite maintainable.
