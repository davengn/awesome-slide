export type { ImagePlaceholderProps } from './app/components/image-placeholder.tsx';
export { ImagePlaceholder } from './app/components/image-placeholder.tsx';
export type {
  DesignFonts,
  DesignPalette,
  DesignSystem,
  DesignTypeScale,
} from './app/lib/design.ts';
export { cssVarsToString, defaultDesign, designToCssVars } from './app/lib/design.ts';
export { useSlidePageNumber } from './app/lib/page-context.tsx';
export type { Page, SlideMeta, SlideModule } from './app/lib/sdk.ts';
export { CANVAS_HEIGHT, CANVAS_WIDTH } from './app/lib/sdk.ts';
export {
  AWESOME_SLIDE_BINARY,
  AWESOME_SLIDE_BRAND,
  AWESOME_SLIDE_CLI_PACKAGE,
  AWESOME_SLIDE_CONFIG_FILE,
  AWESOME_SLIDE_CORE_PACKAGE,
  AWESOME_SLIDE_DISPLAY_NAME,
  AWESOME_SLIDE_PROTOCOL_PREFIX,
  AWESOME_SLIDE_RUNTIME_DIR,
  AWESOME_SLIDE_TECHNICAL_NAME,
  AWESOME_SLIDE_VIRTUAL_PREFIX,
  OPEN_SLIDE_BINARY,
  OPEN_SLIDE_CLI_PACKAGE,
  OPEN_SLIDE_CONFIG_FILE,
  OPEN_SLIDE_CORE_PACKAGE,
  OPEN_SLIDE_PROTOCOL_PREFIX,
  OPEN_SLIDE_RUNTIME_DIR,
  OPEN_SLIDE_TECHNICAL_NAME,
  OPEN_SLIDE_VIRTUAL_PREFIX,
} from './brand.ts';
export type { BrandCompatibilitySurface } from './brand.ts';
export type { SlideTransition, TransitionPhase } from './app/lib/transition.ts';
export type {
  AwesomeSlideBuildConfig,
  AwesomeSlideConfig,
  OpenSlideBuildConfig,
  OpenSlideConfig,
} from './config.ts';
export type { Locale, Plural } from './locale/types.ts';
