'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import { ThemeToggle } from './theme-toggle';

export function Nav({ githubStars }: { githubStars?: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[13px] tracking-[0.04em]"
        >
          <img
            src="/awesome-slide.png"
            alt=""
            aria-hidden
            className="block h-6 w-6 rounded-[4px]"
          />
          <span className="text-[color:var(--color-text)]">Awesome Slide</span>
        </Link>

        <nav className="flex items-center gap-8 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.08em] uppercase">
          <Link
            href="/docs"
            className="hidden text-[color:var(--color-text)] transition-colors hover:underline md:inline"
          >
            Docs
          </Link>
          <a
            href="https://demo.awesome-slide.dev/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture('nav_external_link_clicked', { label: 'demo' })}
            className="hidden text-[color:var(--color-text)] transition-colors hover:underline md:inline"
          >
            Demo ↗
          </a>
          <a
            href="https://github.com/1weiho/awesome-slide"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture('nav_external_link_clicked', { label: 'github' })}
            className="hidden items-center gap-2 text-[color:var(--color-text)] transition-colors hover:underline md:inline-flex"
          >
            <span>GitHub ↗</span>
            {githubStars ? (
              <span
                aria-label={`${githubStars} GitHub stars`}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-rule)] px-2 py-[2px] text-[10px] tracking-[0.06em] text-[color:var(--color-text)]"
              >
                <span aria-hidden>★</span>
                {githubStars}
              </span>
            ) : null}
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
