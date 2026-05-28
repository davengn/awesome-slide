import type { Locale } from './locale/types';

export type AwesomeSlideBuildConfig = {
  showSlideBrowser?: boolean;
  showSlideUi?: boolean;
  allowHtmlDownload?: boolean;
};

export type AwesomeSlideConfig = {
  slidesDir?: string;
  themesDir?: string;
  assetsDir?: string;
  port?: number;
  locale?: Locale;
  build?: AwesomeSlideBuildConfig;
};

export type OpenSlideBuildConfig = AwesomeSlideBuildConfig;
export type OpenSlideConfig = AwesomeSlideConfig;
