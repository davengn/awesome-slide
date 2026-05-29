import type { Page, SlideMeta } from '@awesome-slide/core';

export const meta: SlideMeta = {
  title: 'Slide  101',
  status: 'draft',
  createdAt: '2026-05-28T16:53:49.931Z',
};

const Page1: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1a1a1a' }}>
      {/* @slide-comment id="c-1fe51bf8" ts="2026-05-29T03:58:06.442Z" text="eyJub3RlIjoiVGVzdCBjb21tZW50In0" */}
      Slide 101
    </h1>
  </div>
);

export default [Page1] satisfies Page[];
