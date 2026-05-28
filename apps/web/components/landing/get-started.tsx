import type React from 'react';
import { CopyCommand } from './copy-command';

export function GetStarted() {
  return (
    <section
      id="install"
      className="landing-section relative overflow-hidden bg-[color:var(--color-ink)] py-20 sm:py-28 lg:py-32"
    >
      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12">
        <div
          className="spotlight violet p-8 sm:p-12 lg:p-16"
          style={
            {
              '--color-accent': 'rgba(255,255,255,0.18)',
              '--color-inverse-text': '#fff',
              '--color-rule': 'rgba(255,255,255,0.25)',
              '--color-text-soft': 'rgba(255,255,255,0.28)',
            } as React.CSSProperties
          }
        >
          <div className="flex max-w-[820px] flex-col gap-8 sm:gap-10">
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-white/60">
              Start
            </span>
            <h2 className="text-[36px] leading-[1.08] tracking-[-1px] sm:text-[52px] sm:tracking-[-2.5px] lg:text-[72px] lg:tracking-[-3.5px]">
              <span className="spotlight-title font-[family-name:var(--font-sans)] font-medium">
                Author a deck
              </span>
              <br />
              <span className="font-[family-name:var(--font-display)] italic text-white/80">
                in the next minute.
              </span>
            </h2>

            <p className="spotlight-body max-w-[560px] text-[17px] leading-[1.65]">
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
