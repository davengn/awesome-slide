export const AWESOME_SLIDE_DISPLAY_NAME = 'Awesome Slide';
export const AWESOME_SLIDE_TECHNICAL_NAME = 'awesome-slide';
export const OPEN_SLIDE_TECHNICAL_NAME = 'open-slide';

export const AWESOME_SLIDE_CORE_PACKAGE = '@awesome-slide/core';
export const OPEN_SLIDE_CORE_PACKAGE = '@open-slide/core';
export const AWESOME_SLIDE_CLI_PACKAGE = '@awesome-slide/cli';
export const OPEN_SLIDE_CLI_PACKAGE = '@open-slide/cli';

export const AWESOME_SLIDE_BINARY = 'awesome-slide';
export const OPEN_SLIDE_BINARY = 'open-slide';

export const AWESOME_SLIDE_CONFIG_FILE = 'awesome-slide.config.ts';
export const OPEN_SLIDE_CONFIG_FILE = 'open-slide.config.ts';

export const AWESOME_SLIDE_RUNTIME_DIR = '.awesome-slide';
export const OPEN_SLIDE_RUNTIME_DIR = '.open-slide';

export const AWESOME_SLIDE_PROTOCOL_PREFIX = 'awesome-slide';
export const OPEN_SLIDE_PROTOCOL_PREFIX = 'open-slide';

export const AWESOME_SLIDE_VIRTUAL_PREFIX = 'virtual:awesome-slide';
export const OPEN_SLIDE_VIRTUAL_PREFIX = 'virtual:open-slide';

export const AWESOME_SLIDE_BRAND = {
  displayName: AWESOME_SLIDE_DISPLAY_NAME,
  technicalName: AWESOME_SLIDE_TECHNICAL_NAME,
  legacyTechnicalName: OPEN_SLIDE_TECHNICAL_NAME,
  packages: {
    core: AWESOME_SLIDE_CORE_PACKAGE,
    cli: AWESOME_SLIDE_CLI_PACKAGE,
    legacyCore: OPEN_SLIDE_CORE_PACKAGE,
    legacyCli: OPEN_SLIDE_CLI_PACKAGE,
  },
  binaries: {
    canonical: AWESOME_SLIDE_BINARY,
    legacy: OPEN_SLIDE_BINARY,
  },
  configFiles: {
    canonical: AWESOME_SLIDE_CONFIG_FILE,
    legacy: OPEN_SLIDE_CONFIG_FILE,
  },
  runtimeDirs: {
    canonical: AWESOME_SLIDE_RUNTIME_DIR,
    legacy: OPEN_SLIDE_RUNTIME_DIR,
  },
  protocolPrefixes: {
    canonical: AWESOME_SLIDE_PROTOCOL_PREFIX,
    legacy: OPEN_SLIDE_PROTOCOL_PREFIX,
  },
  virtualPrefixes: {
    canonical: AWESOME_SLIDE_VIRTUAL_PREFIX,
    legacy: OPEN_SLIDE_VIRTUAL_PREFIX,
  },
} as const;

export type BrandCompatibilitySurface =
  | 'package'
  | 'binary'
  | 'config-file'
  | 'virtual-module'
  | 'hmr-event'
  | 'local-storage-key'
  | 'runtime-path'
  | 'documentation-url';
