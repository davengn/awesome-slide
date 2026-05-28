import type { ReactNode } from 'react';

type Step = {
  num: string;
  kicker: string;
  title: string;
  body: string;
  spotlight: 'violet' | 'magenta' | 'orange';
  code: {
    prompt: string;
    line: string;
    tail: ReactNode;
  };
};

const steps: Step[] = [
  {
    num: '01',
    kicker: 'scaffold',
    title: 'Spin up a workspace',
    body: 'Create the deck shell, scripts, config, and starter slide in one command.',
    spotlight: 'violet',
    code: {
      prompt: '$',
      line: 'npx @awesome-slide/cli init my-deck',
      tail: 'ready in 3s',
    },
  },
  {
    num: '02',
    kicker: 'author',
    title: 'Ask your agent',
    body: 'Your agent drafts pages as arbitrary React components that you can review as source.',
    spotlight: 'magenta',
    code: {
      prompt: '>',
      line: '/create-slide for Q2 roadmap',
      tail: <AgentRow />,
    },
  },
  {
    num: '03',
    kicker: 'iterate',
    title: 'Edit, comment, apply',
    body: 'Click the canvas, leave a note, or edit the generated component directly.',
    spotlight: 'orange',
    code: {
      prompt: '>',
      line: '/apply-comment',
      tail: 'applied change',
    },
  },
];

const SLASH_COMMAND = /\/[a-z][a-z-]*/g;

function renderLine(line: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(SLASH_COMMAND)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(line.slice(last, start));
    const cmd = match[0];
    parts.push(
      <span key={`cmd-${start}`}>
        <span className="text-white/90">/</span>
        <span className="text-white/90">{cmd.slice(1)}</span>
      </span>,
    );
    last = start + cmd.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <>{parts}</>;
}

function AgentRow() {
  const agents: [string, string][] = [
    ['claude.svg', 'Claude'],
    ['codex-dark.svg', 'Codex'],
    ['cursor-dark.svg', 'Cursor'],
    ['gemini.svg', 'Gemini CLI'],
  ];
  const cls = 'h-[14px] w-auto shrink-0 object-contain brightness-0 invert opacity-80';
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 normal-case tracking-normal">
      {agents.map(([file, name]) => (
        <img key={file} src={`/assets/${file}`} alt={name} className={cls} />
      ))}
      <span className="text-[10px] uppercase tracking-[0.1em] text-white/60">...</span>
    </span>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section relative">
      <div className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32">
        <div className="mb-10 max-w-[760px] sm:mb-14">
          <span className="caption">Workflow</span>
          <h2 className="mt-4 text-[32px] font-medium leading-[1.1] tracking-[-1px] sm:text-[46px] sm:tracking-[-2px] lg:text-[58px] lg:tracking-[-3px]">
            Slides stay simple because the source stays yours.
          </h2>
        </div>

        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.num}
              className={`spotlight ${s.spotlight} flex min-h-[340px] flex-col gap-7 p-6 sm:p-7 lg:p-8`}
            >
              <div className="flex items-center justify-between gap-4 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-white/60">
                <span>{s.num}</span>
                <span>{s.kicker}</span>
              </div>

              <div>
                <h3 className="spotlight-title text-[22px] font-medium leading-[1.15] tracking-[-0.8px] sm:text-[25px] sm:tracking-[-1px]">
                  {s.title}
                </h3>
                <p className="spotlight-body mt-4 max-w-[36ch] text-[15px] leading-[1.65]">
                  {s.body}
                </p>
              </div>

              <div className="mt-auto rounded-xl border border-white/20 bg-white/10 p-4 font-[family-name:var(--font-mono)] text-[13px] backdrop-blur-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-white/50">{s.code.prompt}</span>
                  <span className="min-w-0 truncate text-white/90">{renderLine(s.code.line)}</span>
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.1em] text-white/60">
                  {s.code.tail}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
