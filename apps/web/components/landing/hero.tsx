'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import { useState } from 'react';
import { CopyCommand } from './copy-command';
import { InlineSlidePlayer } from './inline-slide-player';

export function Hero() {
  const [previewIndex, setPreviewIndex] = useState(0);

  return (
    <section className="landing-section relative overflow-hidden">
      <div aria-hidden className="hair absolute inset-x-0 top-0" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-var(--landing-nav-height))] max-w-[1360px] grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-14 lg:px-12 lg:py-16">
        <div className="flex max-w-[760px] flex-col gap-7">
          <span className="caption rise" style={{ animationDelay: '40ms' }}>
            Awesome Slide framework
          </span>
          <div className="flex flex-col gap-5">
            <h1
              className="rise text-[40px] font-medium leading-[1.04] tracking-[-1.5px] text-[color:var(--color-text)] sm:text-[58px] sm:tracking-[-2.5px] lg:text-[72px] lg:tracking-[-3.5px]"
              style={{ animationDelay: '80ms' }}
            >
              Slides as React code, shaped with your agent.
            </h1>

            <p
              className="rise max-w-[620px] text-[16px] leading-[1.6] text-[color:var(--color-text-soft)] sm:text-[18px]"
              style={{ animationDelay: '180ms' }}
            >
              Awesome Slide turns every page into an inspectable 1920x1080 React canvas, so your
              deck is versioned, editable, and ready for agent-driven iteration.
            </p>
          </div>

          <div
            className="rise flex flex-wrap items-center gap-3 sm:gap-4"
            style={{ animationDelay: '280ms' }}
          >
            <CopyCommand command="npx @awesome-slide/cli init" />
            <Link
              href="/docs"
              onClick={() => posthog.capture('docs_link_clicked', { location: 'hero' })}
              className="group inline-flex h-[48px] items-center gap-2 rounded-full border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-5 text-[14px] font-[family-name:var(--font-mono)] text-[color:var(--color-text)] transition-colors duration-200 hover:border-[color:var(--color-text)]"
            >
              <span>Read the docs</span>
              <span aria-hidden className="text-[color:var(--color-muted)]">
                -&gt;
              </span>
            </Link>
          </div>
        </div>

        <div
          className="rise min-w-0"
          style={{ animationDelay: '360ms' }}
          aria-label="Awesome Slide product preview"
        >
          <div className="landing-color-block bg-[color:var(--color-panel-hi)] p-2 sm:p-3">
            <div className="overflow-hidden rounded-[8px] border border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
              <div className="flex h-10 items-center justify-between border-b border-[color:var(--color-rule)] px-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                <span>local workspace</span>
                <span>slide 01</span>
              </div>
              <div className="aspect-[16/9] bg-black">
                <InlineSlidePlayer index={previewIndex} onIndexChange={setPreviewIndex} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
