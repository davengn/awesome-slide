import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { appName, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-medium tracking-normal">
          <span className="grid size-7 place-items-center rounded-[6px] bg-black shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]">
            <Image
              src="/awesome-slide.png"
              alt=""
              aria-hidden
              width={20}
              height={20}
              className="h-5 w-5 rounded-[3px]"
            />
          </span>
          <span className="tracking-normal">{appName}</span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
