import { CopyCommand } from './copy-command';

export function GetStarted() {
  return (
    <section
      id="install"
      className="landing-section relative overflow-hidden bg-[color:var(--color-ink)] py-20 sm:py-28 lg:py-32"
    >
      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12">
        <div className="landing-color-block bg-[color:var(--color-block-lilac)] p-8 sm:p-12 lg:p-16">
          <div className="flex max-w-[820px] flex-col gap-8 sm:gap-10">
            <span className="caption">Start</span>
            <h2 className="text-[36px] leading-[1.08] tracking-normal sm:text-[52px] lg:text-[72px]">
              <span className="font-[family-name:var(--font-sans)] font-medium">Author a deck</span>
              <br />
              <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-promo)]">
                in the next minute.
              </span>
            </h2>

            <p className="max-w-[560px] text-[17px] leading-[1.65] text-[color:var(--color-text-soft)]">
              One command, zero config. Your agent takes it from here.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <CopyCommand command="npx @awesome-slide/cli init" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
