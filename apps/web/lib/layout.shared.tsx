import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-medium tracking-normal">
          <span className="grid size-7 place-items-center rounded-[6px] bg-[oklch(0.555_0.185_28)] shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]">
            <img src="/awesome-slide.png" alt="" aria-hidden className="h-5 w-5 rounded-[3px]" />
          </span>
          <span>{appName}</span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
