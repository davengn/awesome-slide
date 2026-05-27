'use client';

import { ExternalLink, Menu, X } from 'lucide-react';
import Link from 'next/link';
import posthog from 'posthog-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeToggle } from './theme-toggle';

export function Nav({ githubStars }: { githubStars?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeMenu, menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-rule)] bg-[color:var(--color-ink)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--landing-nav-height)] max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 font-[family-name:var(--font-mono)] text-[13px] tracking-normal"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src="/awesome-slide.png"
            alt=""
            aria-hidden
            className="block h-6 w-6 rounded-[4px]"
          />
          <span className="truncate text-[color:var(--color-text)]">Awesome Slide</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.08em] lg:flex"
        >
          <Link
            href="/docs"
            className="text-[color:var(--color-text)] transition-colors duration-200 hover:underline"
          >
            Docs
          </Link>
          <a
            href="https://demo.awesome-slide.dev/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture('nav_external_link_clicked', { label: 'demo' })}
            className="inline-flex items-center gap-1.5 text-[color:var(--color-text)] transition-colors duration-200 hover:underline"
          >
            Demo
            <ExternalLink className="size-3" aria-hidden />
          </a>
          <a
            href="https://github.com/1weiho/awesome-slide"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture('nav_external_link_clicked', { label: 'github' })}
            className="inline-flex items-center gap-2 text-[color:var(--color-text)] transition-colors duration-200 hover:underline"
          >
            <span>GitHub</span>
            {githubStars ? (
              <span
                aria-label={`${githubStars} GitHub stars`}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-rule)] px-2 py-[2px] text-[10px] tracking-[0.06em] text-[color:var(--color-text)]"
              >
                <span aria-hidden>*</span>
                {githubStars}
              </span>
            ) : null}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/docs"
            className="hidden h-9 items-center rounded-full border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-text)] transition-colors duration-200 hover:border-[color:var(--color-text)] md:inline-flex"
          >
            Docs
          </Link>
          <Link
            href="#install"
            onClick={() => setMenuOpen(false)}
            className="inline-flex h-9 items-center rounded-full border border-[color:var(--color-accent)] bg-[color:var(--color-accent)] px-4 font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--color-inverse-text)] transition-colors duration-200 hover:bg-[color:var(--color-text-soft)]"
          >
            Get started
          </Link>
          <span className="hidden md:inline-flex">
            <ThemeToggle />
          </span>
          <button
            ref={triggerRef}
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] text-[color:var(--color-text)] transition-colors duration-200 hover:border-[color:var(--color-text)] lg:hidden"
          >
            {menuOpen ? (
              <X className="size-4" aria-hidden />
            ) : (
              <Menu className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="landing-mobile-menu"
          className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-ink)] px-5 py-5 shadow-[0_18px_48px_-28px_rgba(0,0,0,0.25)] sm:px-8 lg:hidden"
        >
          <nav
            aria-label="Mobile primary"
            className="mx-auto flex max-w-[1360px] flex-col gap-3 font-[family-name:var(--font-mono)] text-[13px] uppercase tracking-[0.08em]"
          >
            <Link
              href="/docs"
              onClick={() => setMenuOpen(false)}
              className="rounded-[8px] border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-3 text-[color:var(--color-text)]"
            >
              Docs
            </Link>
            <a
              href="https://demo.awesome-slide.dev/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setMenuOpen(false);
                posthog.capture('nav_external_link_clicked', { label: 'demo' });
              }}
              className="inline-flex items-center justify-between rounded-[8px] border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-3 text-[color:var(--color-text)]"
            >
              Demo
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <a
              href="https://github.com/1weiho/awesome-slide"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setMenuOpen(false);
                posthog.capture('nav_external_link_clicked', { label: 'github' });
              }}
              className="inline-flex items-center justify-between rounded-[8px] border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-3 text-[color:var(--color-text)]"
            >
              <span>GitHub</span>
              <span className="inline-flex items-center gap-2">
                {githubStars ? (
                  <span aria-label={`${githubStars} GitHub stars`}>{githubStars}</span>
                ) : null}
                <ExternalLink className="size-3.5" aria-hidden />
              </span>
            </a>
            <div className="mt-1 flex items-center justify-between gap-3 rounded-[8px] border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] px-4 py-3">
              <span className="text-[color:var(--color-muted)]">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
