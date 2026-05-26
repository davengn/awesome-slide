# @awesome-slide/core

Runtime and CLI for Awesome Slide, a React-based slide framework where you write
slides and the framework handles the Vite/React stack, layout, navigation, hot
reload, inspector, export, and present mode.

## Install

```bash
pnpm add @awesome-slide/core
```

Most users get this installed automatically by running:

```bash
npx @awesome-slide/cli init
```

Existing `@open-slide/core` projects remain supported during the migration
window.

## What's Inside

- **Runtime**: home page, slide viewer, thumbnail rail, inspector, keyboard
  navigation, and presenter mode.
- **Vite plugin**: discovers `slides/<id>/index.{tsx,jsx,ts,js}`, exposes them
  through virtual modules, and reloads when slides change.
- **CLI**: `awesome-slide dev | build | preview` so workspaces do not need to
  touch Vite, React, or tsconfig directly.

## CLI

The canonical bin is `awesome-slide`. The legacy `open-slide` bin forwards to
the same runtime during the compatibility window.

| Command | Description |
| --- | --- |
| `awesome-slide dev` | Start the dev server. |
| `awesome-slide build` | Build a static site. |
| `awesome-slide preview` | Preview the production build. |
| `awesome-slide sync:skills` | Sync bundled agent skills into a workspace. |

## Config

Create `awesome-slide.config.ts` in the workspace root. Existing
`open-slide.config.ts` files continue to load as a fallback.

```ts
import type { AwesomeSlideConfig } from '@awesome-slide/core';

const config: AwesomeSlideConfig = {
  slidesDir: 'slides',
  port: 5173,
};

export default config;
```

## Authoring Slides

Slides live under `slides/<kebab-case-id>/index.tsx` and default-export an array
of `Page` components:

```tsx
import type { Page } from '@awesome-slide/core';

const Cover: Page = () => (
  <div className="flex h-full w-full items-center justify-center">
    <h1 className="text-[120px] font-bold">Hello, Awesome Slide</h1>
  </div>
);

export default [Cover] satisfies Page[];
export const meta = { title: 'Hello' };
```

## Exports

```ts
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type AwesomeSlideConfig,
  type OpenSlideConfig,
  type Page,
  type SlideMeta,
  type SlideModule,
} from '@awesome-slide/core';
```

The Vite helper is exposed under a subpath:

```ts
import { createViteConfig } from '@awesome-slide/core/vite';
```

## License

MIT
