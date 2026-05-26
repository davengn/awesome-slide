# @awesome-slide/cli

Scaffold an Awesome Slide workspace with agent skills preconfigured.

## Usage

```bash
npx @awesome-slide/cli init my-slide
cd my-slide
pnpm install
pnpm dev
```

This creates a workspace containing:

- `slides/getting-started/`: a starter slide you can edit or delete.
- `package.json`: depends on `@awesome-slide/core`.
- `awesome-slide.config.ts`: optional typed config.
- `.claude/skills/` and `.agents/skills/`: bundled agent skills.
- `CLAUDE.md` and `AGENTS.md`: agent guides for authoring slides.

You will not see Vite, React, or tsconfig files in the workspace. They live
inside `@awesome-slide/core`.

## Commands

| Command | Description |
| --- | --- |
| `awesome-slide init [dir]` | Scaffold a new workspace in `dir`. |
| `awesome-slide init --force` | Scaffold into a non-empty directory. |
| `awesome-slide init --name <name>` | Override the generated `package.json` name. |

The legacy `open-slide` bin remains available during the migration window.

## Authoring

Inside the scaffolded workspace, slides live under
`slides/<kebab-case-id>/index.tsx` and default-export an array of `Page`
components. Each page renders into a fixed 1920 x 1080 canvas; the framework
handles scaling.

Ask your coding agent to make slides about a topic and the `create-slide` skill
will take it from there.
