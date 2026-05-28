# Awesome Slide workspace

Slides are React components. Each slide lives under `slides/<id>/index.tsx` and default-exports an array of page components. The `@awesome-slide/core` runtime handles layout, scaling, navigation, thumbnails, and fullscreen play mode; you write the pages.

## Getting Started

```bash
pnpm install
pnpm dev
```

Then open the dev server and edit `slides/getting-started/index.tsx`, or create a new slide at `slides/<your-slide>/index.tsx`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload. |
| `pnpm build` | Build a static bundle you can deploy. |
| `pnpm preview` | Preview the built bundle locally. |
| `pnpm sync:skills` | Sync the bundled agent skills from `@awesome-slide/core`. |

## Authoring A Slide

```tsx
// slides/my-slide/index.tsx
import type { Page, SlideMeta } from '@awesome-slide/core';

const Cover: Page = () => <div style={{ width: '100%', height: '100%' }}>Hello</div>;

export const meta: SlideMeta = { title: 'My slide' };
export default [Cover] satisfies Page[];
```

Every page renders into a fixed **1920 x 1080** canvas. Design with absolute pixel values. Put images, videos, and fonts under `slides/<id>/assets/` and import them directly.

See [`CLAUDE.md`](./CLAUDE.md) for the full authoring guide.

## Navigation

- Arrow keys / PageUp / PageDown move between pages.
- `F` enters fullscreen play mode; Esc exits.
- In play mode: Space / right arrow moves next, left arrow moves previous.

## Agent Integration

This workspace ships with agent skills preconfigured under `.agents/skills/` and `.claude/skills/`. Ask your coding agent to "make slides about X" and the `create-slide` skill takes over. Use `apply-comments` to iterate via inspector-style markers inside your source.

## Config

Optional `awesome-slide.config.ts` at the workspace root:

```ts
import type { AwesomeSlideConfig } from '@awesome-slide/core';

const awesomeSlideConfig: AwesomeSlideConfig = {
  port: 5173,
};

export default awesomeSlideConfig;
```

Supported fields: `slidesDir`, `themesDir`, `assetsDir`, `port`, `locale`, and `build`.
