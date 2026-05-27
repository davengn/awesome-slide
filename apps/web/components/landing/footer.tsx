import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-rule)] bg-[color:var(--color-panel)]">
      <div className="mx-auto grid max-w-[1360px] grid-cols-12 gap-x-6 gap-y-10 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[13px]">
            <img src="/awesome-slide.png" alt="" aria-hidden className="h-6 w-6 rounded-[4px]" />
            <span className="tracking-normal">Awesome Slide</span>
          </div>
          <p className="max-w-[38ch] text-[14px] leading-[1.6] text-[color:var(--color-muted)]">
            A React-first slide framework authored by AI agents. MIT licensed, built for the long
            haul.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            ['Live demo', '#demo'],
            ['Docs', '/docs'],
          ]}
        />
        <FooterCol
          title="Packages"
          links={[
            ['@awesome-slide/core', 'https://www.npmjs.com/package/@awesome-slide/core'],
            ['@awesome-slide/cli', 'https://www.npmjs.com/package/@awesome-slide/cli'],
          ]}
        />
        <FooterCol
          title="Elsewhere"
          links={[
            ['GitHub', 'https://github.com/1weiho/awesome-slide'],
            ['npm', 'https://www.npmjs.com/package/@awesome-slide/core'],
            ['Issues', 'https://github.com/1weiho/awesome-slide/issues'],
          ]}
        />
      </div>

      <div className="border-t border-[color:var(--color-rule)]">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-2 px-5 py-5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)] sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <span>Copyright Awesome Slide / MIT</span>
          <span>
            Made by{' '}
            <a
              href="https://1wei.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-accent)]"
            >
              Yiwei
            </a>
            .
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="col-span-6 flex flex-col gap-4 md:col-span-4 lg:col-span-2">
      <div className="caption">{title}</div>
      <ul className="flex flex-col gap-2">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('/') || href.startsWith('#') ? (
              <Link
                href={href}
                className="text-[14px] text-[color:var(--color-text-soft)] transition-colors hover:text-[color:var(--color-accent)]"
              >
                {label}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[color:var(--color-text-soft)] transition-colors hover:text-[color:var(--color-accent)]"
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
