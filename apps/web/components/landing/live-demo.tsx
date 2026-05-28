'use client';

import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import posthog from 'posthog-js';
import { useState } from 'react';
import { InlineSlidePlayer, inlineSlideCount } from './inline-slide-player';

export function LiveDemo() {
  const [index, setIndex] = useState(0);
  const count = inlineSlideCount;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  const atStart = index === 0;
  const atEnd = index === count - 1;

  const handlePrev = () => {
    const next = clamp(index - 1);
    setIndex(next);
    posthog.capture('demo_slide_navigated', {
      direction: 'prev',
      slide_index: next,
    });
  };

  const handleNext = () => {
    const next = clamp(index + 1);
    setIndex(next);
    posthog.capture('demo_slide_navigated', {
      direction: 'next',
      slide_index: next,
    });
  };

  return (
    <section id="demo" className="landing-section relative">
      <div className="mx-auto max-w-[1360px] px-5 pb-20 pt-4 sm:px-8 sm:pb-28 lg:px-12">
        <div className="landing-color-block bg-[color:var(--color-panel-hi)] p-3 sm:p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="caption">Product preview</span>
              <h2 className="mt-2 text-[26px] font-medium leading-[1.15] tracking-normal sm:text-[34px]">
                Real slides, rendered in place.
              </h2>
            </div>
            <a
              href="https://demo.awesome-slide.dev/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => posthog.capture('view_more_demos_clicked')}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full border border-[color:var(--color-text)] bg-[color:var(--color-panel)] px-4 font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-text)] transition-colors duration-200 hover:bg-[color:var(--color-text)] hover:text-[color:var(--color-inverse-text)]"
            >
              View more demos
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          <div
            className="relative block w-full overflow-hidden rounded-[8px] border border-[color:var(--color-text)] bg-black"
            style={{ aspectRatio: '16 / 9' }}
          >
            <InlineSlidePlayer index={index} onIndexChange={setIndex} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            <span className="text-[color:var(--color-text-soft)]">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={atStart}
                aria-label="Previous slide"
                className="inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--color-text)] bg-[color:var(--color-panel)] text-[color:var(--color-text)] transition-colors duration-200 hover:bg-[color:var(--color-text)] hover:text-[color:var(--color-inverse-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[color:var(--color-panel)] disabled:hover:text-[color:var(--color-text)]"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={atEnd}
                aria-label="Next slide"
                className="inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--color-text)] bg-[color:var(--color-panel)] text-[color:var(--color-text)] transition-colors duration-200 hover:bg-[color:var(--color-text)] hover:text-[color:var(--color-inverse-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[color:var(--color-panel)] disabled:hover:text-[color:var(--color-text)]"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
