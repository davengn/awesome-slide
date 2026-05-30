import { type Page, useSlidePageNumber } from '@awesome-slide/core';
import type { ReactNode } from 'react';

const styles = `
@keyframes bs-fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bs-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes bs-scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
`;

const Title = ({ children }: { children: ReactNode }) => (
  <h1
    style={{
      fontFamily: "'Inter Tight', 'Inter', -apple-system, system-ui, sans-serif",
      fontSize: 128,
      fontWeight: 600,
      lineHeight: 1.05,
      letterSpacing: '-0.02em',
      margin: 0,
      color: '#202124',
    }}
  >
    {children}
  </h1>
);

const Subtitle = ({ children }: { children: ReactNode }) => (
  <h2
    style={{
      fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
      fontSize: 64,
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: '-0.015em',
      margin: 0,
      color: '#202124',
      maxWidth: 1400,
    }}
  >
    {children}
  </h2>
);

const Body = ({ children, maxWidth = 1180 }: { children: ReactNode; maxWidth?: number }) => (
  <p
    style={{
      fontSize: 28,
      lineHeight: 1.6,
      color: '#5f6368',
      maxWidth,
      margin: 0,
    }}
  >
    {children}
  </p>
);

const Footer = ({
  dotColor = '#1a73e8',
  label = 'Skills & Sub Agents 101',
}: {
  dotColor?: string;
  label?: string;
}) => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        right: 120,
        bottom: 60,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 18,
        color: '#5f6368',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden
          style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }}
        />
        {label}
      </span>
      <span>
        {current} / {total}
      </span>
    </div>
  );
};

const Eyebrow = ({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'red' | 'yellow' | 'green';
}) => {
  const fill =
    tone === 'red'
      ? '#ea4335'
      : tone === 'yellow'
        ? '#fbbc04'
        : tone === 'green'
          ? '#34a853'
          : '#1a73e8';
  const ink = tone === 'yellow' ? '#202124' : '#ffffff';
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 18px',
        borderRadius: 999,
        background: fill,
        color: ink,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
};

const pageBase: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#ffffff',
  color: '#202124',
  padding: '100px 120px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
};

const CardWrap = ({
  children,
  delay = 0,
  accent = '#1a73e8',
}: {
  children: ReactNode;
  delay?: number;
  accent?: string;
}) => (
  <div
    style={{
      background: '#f7f9fc',
      border: '1px solid #e8eaed',
      borderRadius: 24,
      padding: 36,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      animation: `bs-fadeUp 500ms ease-out both`,
      animationDelay: `${delay}ms`,
    }}
  >
    <span
      aria-hidden
      style={{ width: 24, height: 24, borderRadius: 6, background: accent }}
    />
    {children}
  </div>
);

const CardTitle = ({ children }: { children: ReactNode }) => (
  <h3
    style={{
      fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      margin: 0,
      color: '#202124',
    }}
  >
    {children}
  </h3>
);

const CardBody = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: 20, lineHeight: 1.55, color: '#5f6368', margin: 0 }}>{children}</p>
);

// ─── Slide 1: Cover ──────────────────────────────────────────────────
const Cover: Page = () => (
  <div
    style={{
      ...pageBase,
      justifyContent: 'center',
      gap: 36,
      animation: 'bs-fadeUp 500ms ease-out both',
    }}
  >
    <style>{styles}</style>
    <Eyebrow tone="blue">Agent Architecture</Eyebrow>
    <Title>Skills & Sub Agents.</Title>
    <Body>
      How to break a monolithic agent into composable, specialized pieces that collaborate.
    </Body>
    <Footer />
  </div>
);

// ─── Slide 2: The Problem ────────────────────────────────────────────
const TheProblem: Page = () => (
  <div style={{ ...pageBase, gap: 40 }}>
    <style>{styles}</style>
    <Eyebrow tone="red">Problem</Eyebrow>
    <Subtitle>The monolithic agent trap.</Subtitle>
    <Body maxWidth={1300}>
      One giant prompt. One context window. Every tool crammed into a single loop. It works for demos — and collapses in production.
    </Body>
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 24,
        marginTop: 8,
      }}
    >
      <li>
        <CardWrap accent="#ea4335" delay={0}>
          <CardTitle>Context overflow</CardTitle>
          <CardBody>
            Every tool description and instruction competes for the same token budget. More tools = less reasoning per tool.
          </CardBody>
        </CardWrap>
      </li>
      <li>
        <CardWrap accent="#ea4335" delay={80}>
          <CardTitle>Brittle prompts</CardTitle>
          <CardBody>
            Changing one section of a mega-prompt cascades into unpredictable behavior elsewhere. No isolation.
          </CardBody>
        </CardWrap>
      </li>
      <li>
        <CardWrap accent="#ea4335" delay={160}>
          <CardTitle>No testability</CardTitle>
          <CardBody>
            You can't unit-test "the agent" — it's one opaque loop. Bugs reproduce inconsistently and regress silently.
          </CardBody>
        </CardWrap>
      </li>
      <li>
        <CardWrap accent="#ea4335" delay={240}>
          <CardTitle>Scaling ceiling</CardTitle>
          <CardBody>
            Adding a new capability means editing the system prompt and hoping nothing breaks. Teams block each other.
          </CardBody>
        </CardWrap>
      </li>
    </ul>
    <Footer dotColor="#ea4335" />
  </div>
);

// ─── Slide 3: Four Building Blocks ───────────────────────────────────
type Card = {
  tone: 'blue' | 'red' | 'yellow' | 'green';
  fill: string;
  title: string;
  body: string;
};

const conceptCards: Card[] = [
  {
    tone: 'blue',
    fill: '#1a73e8',
    title: 'Skills',
    body: 'Self-contained capabilities the agent can invoke — file search, code execution, web browsing. Each skill owns its prompt, tools, and validation.',
  },
  {
    tone: 'red',
    fill: '#ea4335',
    title: 'Sub-agents',
    body: 'Specialized mini-agents with their own system prompt and loop. The orchestrator delegates a goal and gets back a result.',
  },
  {
    tone: 'yellow',
    fill: '#fbbc04',
    title: 'Orchestrator',
    body: 'The top-level agent that decides which skill or sub-agent to call, passes context, and synthesizes the final response.',
  },
  {
    tone: 'green',
    fill: '#34a853',
    title: 'Handoff protocol',
    body: 'A structured contract for passing tasks between agents — input schema, output schema, and error boundaries.',
  },
];

const CoreConcepts: Page = () => (
  <div style={{ ...pageBase, gap: 40 }}>
    <style>{styles}</style>
    <Eyebrow tone="blue">Core Concepts</Eyebrow>
    <Subtitle>Four building blocks, one pattern.</Subtitle>
    <ul
      style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 24,
        marginTop: 8,
      }}
    >
      {conceptCards.map((c, i) => (
        <li key={c.title}>
          <CardWrap accent={c.fill} delay={i * 80}>
            <CardTitle>{c.title}</CardTitle>
            <CardBody>{c.body}</CardBody>
          </CardWrap>
        </li>
      ))}
    </ul>
    <Footer />
  </div>
);

// ─── Slide 4: What is a Skill? ───────────────────────────────────────
const WhatIsASkill: Page = () => (
  <div
    style={{
      ...pageBase,
      gap: 36,
      animation: 'bs-fadeUp 500ms ease-out both',
    }}
  >
    <style>{styles}</style>
    <Eyebrow tone="blue">Skills</Eyebrow>
    <Title>What is a skill?</Title>
    <Body maxWidth={1200}>
      A skill is a single, well-scoped capability — a function the agent can call when it decides the user's goal requires it.
    </Body>
    <div
      style={{
        display: 'flex',
        gap: 24,
        marginTop: 16,
      }}
    >
      <CardWrap accent="#1a73e8" delay={100}>
        <CardTitle>Own prompt</CardTitle>
        <CardBody>The skill carries its own instructions — no contamination from the parent agent's system prompt.</CardBody>
      </CardWrap>
      <CardWrap accent="#1a73e8" delay={180}>
        <CardTitle>Own tools</CardTitle>
        <CardBody>Skills bind only the tools they need. A search skill gets search tools; it never sees database tools.</CardBody>
      </CardWrap>
      <CardWrap accent="#1a73e8" delay={260}>
        <CardTitle>Own validation</CardTitle>
        <CardBody>Input schemas and output guards live inside the skill. Bad data is caught at the boundary, not downstream.</CardBody>
      </CardWrap>
    </div>
    <Footer />
  </div>
);

// ─── Slide 5: Skill Anatomy ──────────────────────────────────────────
const SkillAnatomy: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="blue">Skills</Eyebrow>
    <Subtitle>Anatomy of a skill.</Subtitle>
    <div
      style={{
        background: '#f7f9fc',
        border: '1px solid #e8eaed',
        borderRadius: 24,
        padding: '40px 48px',
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 20,
        lineHeight: 2,
        color: '#202124',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div style={{ color: '#5f6368' }}>
        {'{'}<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>name</span>: <span style={{ color: '#34a853' }}>"file_search"</span>,<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>description</span>: <span style={{ color: '#34a853' }}>"Search files by semantic query"</span>,<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>inputSchema</span>: {'{'} <span style={{ color: '#ea4335' }}>query</span>: <span style={{ color: '#34a853' }}>string</span>, <span style={{ color: '#ea4335' }}>topK</span>: <span style={{ color: '#34a853' }}>number</span> {'}'},<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>tools</span>: [<span style={{ color: '#34a853' }}>"embed"</span>, <span style={{ color: '#34a853' }}>"vector_search"</span>, <span style={{ color: '#34a853' }}>"read_file"</span>],<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>outputSchema</span>: {'{'} <span style={{ color: '#ea4335' }}>files</span>: <span style={{ color: '#34a853' }}>FileResult[]</span> {'}'},<br />
        &nbsp;&nbsp;<span style={{ color: '#1a73e8' }}>validate</span>: <span style={{ color: '#34a853' }}>query.length {'>'} 0</span><br />
        {'}'}
      </div>
    </div>
    <Footer />
  </div>
);

// ─── Slide 6: What is a Sub-Agent? ───────────────────────────────────
const WhatIsASubAgent: Page = () => (
  <div
    style={{
      ...pageBase,
      gap: 36,
      animation: 'bs-fadeUp 500ms ease-out both',
    }}
  >
    <style>{styles}</style>
    <Eyebrow tone="red">Sub-agents</Eyebrow>
    <Title>What is a sub-agent?</Title>
    <Body maxWidth={1200}>
      A sub-agent is an autonomous agent with its own loop. The orchestrator gives it a goal, and it runs independently until it returns a result.
    </Body>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginTop: 16,
      }}
    >
      <CardWrap accent="#ea4335" delay={100}>
        <CardTitle>Own system prompt</CardTitle>
        <CardBody>
          A sub-agent has its own persona and instructions. It doesn't see the orchestrator's full context — only what's handed off.
        </CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={180}>
        <CardTitle>Own agentic loop</CardTitle>
        <CardBody>
          It can think, call tools, observe results, and iterate — all within its scoped boundary. Multiple turns are possible.
        </CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={260}>
        <CardTitle>Bounded scope</CardTitle>
        <CardBody>
          It can only use the tools and data it was given. It cannot escalate privileges or call other sub-agents unless explicitly allowed.
        </CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={340}>
        <CardTitle>Structured return</CardTitle>
        <CardBody>
          When it finishes, it returns a typed result — not free-form text. The orchestrator knows exactly what to expect.
        </CardBody>
      </CardWrap>
    </div>
    <Footer dotColor="#ea4335" />
  </div>
);

// ─── Slide 7: Orchestrator Pattern ───────────────────────────────────
const OrchestratorPattern: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="yellow">Orchestrator</Eyebrow>
    <Subtitle>The conductor at the center.</Subtitle>
    <Body maxWidth={1200}>
      The orchestrator is the top-level agent. It doesn't do the work itself — it decides who should.
    </Body>
    <div
      style={{
        display: 'flex',
        gap: 20,
        marginTop: 16,
        flex: 1,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <CardWrap accent="#fbbc04" delay={0}>
          <CardTitle>1. Classify intent</CardTitle>
          <CardBody>Parse the user's message and decide: is this a skill call, a sub-agent delegation, or a direct response?</CardBody>
        </CardWrap>
        <CardWrap accent="#fbbc04" delay={100}>
          <CardTitle>2. Route & delegate</CardTitle>
          <CardBody>Pass the right context to the right agent or skill. Strip irrelevant history to keep each worker focused.</CardBody>
        </CardWrap>
        <CardWrap accent="#fbbc04" delay={200}>
          <CardTitle>3. Synthesize</CardTitle>
          <CardBody>Collect results from sub-agents and skills, then compose a coherent response for the user.</CardBody>
        </CardWrap>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <CardWrap accent="#fbbc04" delay={300}>
          <CardTitle>4. Memory management</CardTitle>
          <CardBody>Decide what context to keep, summarize, or discard across turns. Prevent context window overflow.</CardBody>
        </CardWrap>
        <CardWrap accent="#fbbc04" delay={400}>
          <CardTitle>5. Error recovery</CardTitle>
          <CardBody>When a sub-agent fails, the orchestrator can retry with different params, switch to a fallback, or ask the user.</CardBody>
        </CardWrap>
        <CardWrap accent="#fbbc04" delay={500}>
          <CardTitle>6. Progress reporting</CardTitle>
          <CardBody>Stream status updates to the user while sub-agents work — so the experience never feels frozen.</CardBody>
        </CardWrap>
      </div>
    </div>
    <Footer dotColor="#fbbc04" />
  </div>
);

// ─── Slide 8: Handoff Protocol ───────────────────────────────────────
const HandoffProtocol: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="green">Handoff</Eyebrow>
    <Subtitle>The contract between agents.</Subtitle>
    <Body maxWidth={1200}>
      A handoff protocol defines how agents communicate — input schemas, output schemas, and error boundaries.
    </Body>
    <div
      style={{
        display: 'flex',
        gap: 24,
        marginTop: 16,
        flex: 1,
      }}
    >
      <div
        style={{
          flex: 1,
          background: '#f7f9fc',
          border: '1px solid #e8eaed',
          borderRadius: 24,
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'bs-scaleIn 500ms ease-out both',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#34a853',
            margin: 0,
          }}
        >
          Input contract
        </span>
        <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 20, lineHeight: 1.5, color: '#5f6368' }}>
          <li>Typed parameters (JSON Schema)</li>
          <li>Max context size</li>
          <li>Required vs optional fields</li>
          <li>Timeout budget</li>
        </ul>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34a853',
          fontSize: 48,
          fontWeight: 700,
          animation: 'bs-fadeIn 500ms ease-out both',
          animationDelay: '200ms',
        }}
      >
        →
      </div>
      <div
        style={{
          flex: 1,
          background: '#f7f9fc',
          border: '1px solid #e8eaed',
          borderRadius: 24,
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'bs-scaleIn 500ms ease-out both',
          animationDelay: '300ms',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: '#34a853',
            margin: 0,
          }}
        >
          Output contract
        </span>
        <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 20, lineHeight: 1.5, color: '#5f6368' }}>
          <li>Typed result (JSON Schema)</li>
          <li>Status: success | error | partial</li>
          <li>Confidence / quality score</li>
          <li>Artifact references</li>
        </ul>
      </div>
    </div>
    <Footer dotColor="#34a853" />
  </div>
);

// ─── Slide 9: Skill vs Sub-Agent ─────────────────────────────────────
const SkillVsSubAgent: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="blue">Decision Guide</Eyebrow>
    <Subtitle>Skill vs. sub-agent — when to use which?</Subtitle>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        marginTop: 8,
        flex: 1,
      }}
    >
      <div
        style={{
          background: '#eef4ff',
          border: '2px solid #1a73e8',
          borderRadius: 24,
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'bs-fadeUp 500ms ease-out both',
        }}
      >
        <h3
          style={{
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: '#1a73e8',
            margin: 0,
          }}
        >
          Use a Skill when...
        </h3>
        <ul style={{ margin: 0, padding: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 22, lineHeight: 1.5, color: '#202124' }}>
          <li>The task is <strong>single-turn</strong></li>
          <li>It maps to <strong>one tool call</strong> (or a fixed sequence)</li>
          <li>No autonomous reasoning is needed</li>
          <li>Fast, deterministic, cheap</li>
          <li>Example: semantic file search, code linting</li>
        </ul>
      </div>
      <div
        style={{
          background: '#fef0ef',
          border: '2px solid #ea4335',
          borderRadius: 24,
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          animation: 'bs-fadeUp 500ms ease-out both',
          animationDelay: '100ms',
        }}
      >
        <h3
          style={{
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: '#ea4335',
            margin: 0,
          }}
        >
          Use a Sub-Agent when...
        </h3>
        <ul style={{ margin: 0, padding: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 22, lineHeight: 1.5, color: '#202124' }}>
          <li>The task requires <strong>multi-step reasoning</strong></li>
          <li>It needs to <strong>observe and adapt</strong></li>
          <li>The path isn't known in advance</li>
          <li>It may call multiple tools in sequence</li>
          <li>Example: debug a failing test, refactor a module</li>
        </ul>
      </div>
    </div>
    <Footer />
  </div>
);

// ─── Slide 10: Context Passing ───────────────────────────────────────
const ContextPassing: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="blue">Context</Eyebrow>
    <Subtitle>Passing context without leaking.</Subtitle>
    <Body maxWidth={1200}>
      Every handoff must carry enough context to succeed — but not so much that it wastes tokens or leaks unrelated data.
    </Body>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 24,
        marginTop: 16,
      }}
    >
      <CardWrap accent="#1a73e8" delay={0}>
        <CardTitle>Summarize</CardTitle>
        <CardBody>Compress conversation history into a summary before passing it downstream. Keep the signal, drop the noise.</CardBody>
      </CardWrap>
      <CardWrap accent="#34a853" delay={100}>
        <CardTitle>Filter</CardTitle>
        <CardBody>Only include messages and artifacts relevant to the sub-agent's goal. Strip unrelated tool calls and results.</CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={200}>
        <CardTitle>Scope</CardTitle>
        <CardBody>Give each sub-agent read access to only the files and data it needs. Never expose the full project state.</CardBody>
      </CardWrap>
    </div>
    <div
      style={{
        background: '#f7f9fc',
        border: '1px solid #e8eaed',
        borderRadius: 16,
        padding: '24px 36px',
        marginTop: 8,
        fontSize: 20,
        lineHeight: 1.5,
        color: '#5f6368',
        animation: 'bs-fadeUp 500ms ease-out both',
        animationDelay: '300ms',
      }}
    >
      <strong style={{ color: '#202124' }}>Rule of thumb:</strong> if the sub-agent doesn't need it to complete its goal, don't send it.
    </div>
    <Footer />
  </div>
);

// ─── Slide 11: Error Handling ────────────────────────────────────────
const ErrorHandling: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="red">Resilience</Eyebrow>
    <Subtitle>When things go wrong.</Subtitle>
    <Body maxWidth={1200}>
      Sub-agents fail. Skills timeout. APIs return errors. A robust agent system expects failure and handles it gracefully.
    </Body>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginTop: 16,
      }}
    >
      <CardWrap accent="#ea4335" delay={0}>
        <CardTitle>Timeout walls</CardTitle>
        <CardBody>Every sub-agent invocation has a deadline. If it exceeds the budget, the orchestrator cancels it and reports partial results.</CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={100}>
        <CardTitle>Fallback skills</CardTitle>
        <CardBody>If the primary sub-agent fails, the orchestrator can retry with a simpler skill that covers the common case.</CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={200}>
        <CardTitle>Typed errors</CardTitle>
        <CardBody>Errors aren't strings — they're structured objects with error codes, context, and recovery hints the orchestrator can act on.</CardBody>
      </CardWrap>
      <CardWrap accent="#ea4335" delay={300}>
        <CardTitle>Graceful degradation</CardTitle>
        <CardBody>A failing sub-agent shouldn't crash the whole system. Return what you have, flag what's missing, and let the user decide.</CardBody>
      </CardWrap>
    </div>
    <Footer dotColor="#ea4335" />
  </div>
);

// ─── Slide 12: Real-World Example ────────────────────────────────────
const RealWorldExample: Page = () => (
  <div style={{ ...pageBase, gap: 32 }}>
    <style>{styles}</style>
    <Eyebrow tone="green">Example</Eyebrow>
    <Subtitle>A debug session, end-to-end.</Subtitle>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        flex: 1,
      }}
    >
      {[
        { step: '1', agent: 'Orchestrator', action: 'User reports: "Test auth.test.ts is failing"', tone: 'yellow', fill: '#fbbc04' },
        { step: '2', agent: 'Orchestrator', action: 'Classifies intent → delegates to Debug Sub-agent', tone: 'yellow', fill: '#fbbc04' },
        { step: '3', agent: 'Debug Agent', action: 'Reads test file → runs test → captures stack trace', tone: 'red', fill: '#ea4335' },
        { step: '4', agent: 'Debug Agent', action: 'Calls File Search skill to find related source files', tone: 'blue', fill: '#1a73e8' },
        { step: '5', agent: 'Debug Agent', action: 'Identifies root cause: missing null check in auth.ts:42', tone: 'red', fill: '#ea4335' },
        { step: '6', agent: 'Debug Agent', action: 'Returns structured result: { fix, file, line, confidence }', tone: 'red', fill: '#ea4335' },
        { step: '7', agent: 'Orchestrator', action: 'Synthesizes response → presents fix to user for approval', tone: 'yellow', fill: '#fbbc04' },
      ].map((item, i) => (
        <div
          key={item.step}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '16px 0',
            borderBottom: i < 6 ? '1px solid #e8eaed' : 'none',
            animation: 'bs-fadeUp 400ms ease-out both',
            animationDelay: `${i * 80}ms`,
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: item.fill,
              color: item.tone === 'yellow' ? '#202124' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {item.step}
          </span>
          <span
            style={{
              fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: item.fill,
              minWidth: 140,
            }}
          >
            {item.agent}
          </span>
          <span style={{ fontSize: 20, lineHeight: 1.4, color: '#5f6368' }}>
            {item.action}
          </span>
        </div>
      ))}
    </div>
    <Footer dotColor="#34a853" />
  </div>
);

// ─── Slide 13: Best Practices ────────────────────────────────────────
const BestPractices: Page = () => (
  <div style={{ ...pageBase, gap: 36 }}>
    <style>{styles}</style>
    <Eyebrow tone="green">Best Practices</Eyebrow>
    <Subtitle>Rules for composable agent systems.</Subtitle>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 24,
        marginTop: 8,
        flex: 1,
      }}
    >
      {[
        { num: '01', title: 'Small, focused agents', body: 'Each agent should do one thing well. If you\'re tempted to add "just one more" capability, split it into a new agent.' },
        { num: '02', title: 'Typed handoffs', body: 'Never pass free-form text between agents. Use JSON Schema for inputs and outputs. Contracts make the system debuggable.' },
        { num: '03', title: 'Test in isolation', body: 'Every skill and sub-agent should be testable independently. Mock the handoff boundary, verify the output schema.' },
        { num: '04', title: 'Budget tokens', body: 'Assign a token budget to each sub-agent. If it can\'t finish in budget, it returns partial results instead of burning the orchestrator\'s context.' },
        { num: '05', title: 'Observability first', body: 'Log every handoff — who called what, with what input, and what came back. You can\'t debug what you can\'t see.' },
        { num: '06', title: 'Version your contracts', body: 'When you change a skill\'s input/output schema, version it. Let the orchestrator handle backwards compatibility.' },
      ].map((item, i) => (
        <CardWrap key={item.num} accent="#34a853" delay={i * 60}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: "'Inter Tight', system-ui, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: '#34a853',
                lineHeight: 1,
              }}
            >
              {item.num}
            </span>
            <CardTitle>{item.title}</CardTitle>
          </div>
          <CardBody>{item.body}</CardBody>
        </CardWrap>
      ))}
    </div>
    <Footer dotColor="#34a853" />
  </div>
);

// ─── Slide 14: Closer ────────────────────────────────────────────────
const Closer: Page = () => (
  <div
    style={{
      ...pageBase,
      justifyContent: 'center',
      gap: 32,
      animation: 'bs-fadeUp 500ms ease-out both',
    }}
  >
    <style>{styles}</style>
    <Eyebrow tone="green">Takeaway</Eyebrow>
    <Title>Compose, don't hard-code.</Title>
    <Body>
      The best agent systems are not one giant prompt — they are small, focused agents that hand work to each other through clear contracts.
    </Body>
    <Footer dotColor="#34a853" label="Skills & Sub Agents 101" />
  </div>
);

// ─── Exports ─────────────────────────────────────────────────────────
export const meta = {
  theme: 'bright-sans',
  title: 'Skills & Sub Agents 101',
  status: 'draft',
  createdAt: '2026-05-30T09:56:16.736Z',
};

export default [
  Cover,
  TheProblem,
  CoreConcepts,
  WhatIsASkill,
  SkillAnatomy,
  WhatIsASubAgent,
  OrchestratorPattern,
  HandoffProtocol,
  SkillVsSubAgent,
  ContextPassing,
  ErrorHandling,
  RealWorldExample,
  BestPractices,
  Closer,
];
