# Awesome Slide

**The slide framework built for agents.** Describe your deck in natural language
and let your coding agent write the React. Awesome Slide handles the canvas,
scaling, navigation, hot reload, inspector, assets, export, and present mode so
the agent can focus on content.

Every slide renders into a fixed **1920 x 1080** canvas. Pages are arbitrary
React components, not a constrained DSL.

```bash
npx @awesome-slide/cli init my-slide
```

## Why Awesome Slide

Slides are visual code. Agents are good at writing code. Awesome Slide is the
runtime that turns "make slides about X" into a polished, presentable deck
without forcing you out of the chat.

## Highlights

- **Agent-native authoring.** Built-in skills such as `/create-slide`,
  `/slide-authoring`, `/apply-comments`, and `/create-theme` guide agents
  through deck creation and edits.
- **In-browser inspector.** Click rendered elements, leave comments, and let an
  agent apply the requested source edits.
- **Assets manager and logo search.** Manage deck assets and search brand logos
  through the integrated svgl catalogue.
- **Professional present mode.** Fullscreen playback, presenter view, speaker
  notes, a timer, and keyboard controls.
- **Static export.** Build self-contained HTML or PDF output for sharing and
  deployment.
- **Slide manager.** Organize decks into folders with drag-and-drop.

## Get Started

```bash
npx @awesome-slide/cli init my-slide
cd my-slide
pnpm dev
```

The scaffolded workspace ships with agent skills preconfigured. From there you
drive the deck through your agent or edit `slides/<id>/index.tsx` directly.

## Repo Layout

This repo is a pnpm + Turbo monorepo.

| Path | Description |
| --- | --- |
| [packages/core](packages/core) | `@awesome-slide/core` runtime, Vite plugin, and the `awesome-slide` dev/build/preview CLI. |
| [packages/cli](packages/cli) | `@awesome-slide/cli` scaffolder. Generates a minimal workspace where Vite, React, and tsconfig stay hidden inside core. |
| [apps/demo](apps/demo) | Example workspace that consumes `@awesome-slide/core` via `workspace:*`. |
| [apps/web](apps/web) | Marketing and documentation site. |

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm check
pnpm test
```

Filter to one package:

```bash
pnpm core <script>
pnpm cli <script>
```

## Migration

Awesome Slide is the canonical brand and technical target. Existing
`@open-slide/*`, `open-slide`, and `open-slide.config.ts` projects remain in the
documented compatibility window while users migrate to `@awesome-slide/*`,
`awesome-slide`, and `awesome-slide.config.ts`.

## License

MIT
