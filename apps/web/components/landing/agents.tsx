type Agent = {
  name: string;
  /** asset file stem; if no theme variants, `variants: false` */
  file: string;
  variants: boolean;
};

const agents: Agent[] = [
  { name: 'Claude', file: 'claude', variants: false },
  { name: 'Codex', file: 'codex', variants: true },
  { name: 'Cursor', file: 'cursor', variants: true },
  { name: 'Gemini CLI', file: 'gemini', variants: false },
  { name: 'OpenCode', file: 'opencode', variants: true },
  { name: 'Windsurf', file: 'windsurf', variants: true },
  { name: 'Zed', file: 'zed', variants: true },
];

export function Agents() {
  const track = [...agents, ...agents];

  return (
    <section
      id="agents"
      className="landing-section relative overflow-hidden bg-[color:var(--color-ink)]"
    >
      <div className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mb-10 max-w-[760px]">
          <span className="caption">Agent ready</span>
          <h2 className="mt-4 text-[32px] font-medium leading-[1.12] tracking-normal sm:text-[44px] lg:text-[58px]">
            Bring whatever writes React.
          </h2>
        </div>

        <div className="agent-inverse overflow-hidden rounded-[24px] bg-[color:var(--color-inverse)] text-[color:var(--color-inverse-text)]">
          <div
            className="relative"
            style={{
              WebkitMaskImage:
                'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
              maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
            }}
          >
            <div className="marquee-track py-9 will-change-transform">
              {track.map((agent, i) => (
                <span key={`${agent.file}-${i}`} className="inline-flex items-center gap-4">
                  <AgentLogo agent={agent} />
                  <span className="font-[family-name:var(--font-sans)] text-[22px] tracking-normal sm:text-[28px] lg:text-[36px]">
                    {agent.name}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentLogo({ agent }: { agent: Agent }) {
  const alt = agent.name;
  const cls = 'h-[28px] md:h-[34px] lg:h-[40px] w-auto object-contain shrink-0';

  if (!agent.variants) {
    return <img src={`/assets/${agent.file}.svg`} alt={alt} className={cls} />;
  }
  return (
    <>
      <img src={`/assets/${agent.file}-dark.svg`} alt={alt} className={`${cls} logo-dark`} />
      <img
        src={`/assets/${agent.file}-light.svg`}
        alt=""
        aria-hidden
        className={`${cls} logo-light`}
      />
    </>
  );
}
