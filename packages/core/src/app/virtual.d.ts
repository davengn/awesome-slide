declare module 'virtual:awesome-slide/slides' {
  import type { SlideModule } from './lib/sdk';
  export const slideIds: string[];
  export const slideThemes: Record<string, string>;
  export const slideCreatedAt: Record<string, number>;
  export function loadSlide(id: string): Promise<SlideModule>;
}

declare module 'virtual:open-slide/slides' {
  export * from 'virtual:awesome-slide/slides';
}

declare module 'virtual:awesome-slide/config' {
  import type { Locale } from '../locale/types';

  const config: {
    slidesDir?: string;
    port?: number;
    locale?: Locale;
    build: {
      showSlideBrowser: boolean;
      showSlideUi: boolean;
      allowHtmlDownload: boolean;
    };
  };
  export default config;
}

declare module 'virtual:open-slide/config' {
  export { default } from 'virtual:awesome-slide/config';
}

declare module 'virtual:awesome-slide/folders' {
  import type { FoldersManifest } from './lib/sdk';

  const manifest: FoldersManifest;
  export default manifest;
}

declare module 'virtual:open-slide/folders' {
  export { default } from 'virtual:awesome-slide/folders';
}

declare module 'virtual:awesome-slide/themes' {
  import type { DesignSystem } from './lib/design';
  import type { Page } from './lib/sdk';

  export type ThemeMeta = {
    id: string;
    name: string;
    description: string;
    body: string;
    hasDemo: boolean;
  };

  export const themes: ThemeMeta[];
  export function loadThemeDemo(id: string): Promise<{
    default: Page[];
    design?: DesignSystem;
  }>;
}

declare module 'virtual:open-slide/themes' {
  export * from 'virtual:awesome-slide/themes';
}
