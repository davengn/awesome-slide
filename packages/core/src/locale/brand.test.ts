import { describe, expect, it } from 'vitest';
import { en, ja, zhCN, zhTW } from './index.ts';

describe('bundled locale product names', () => {
  it('uses Awesome Slide as the app title in every locale', () => {
    expect([en, ja, zhCN, zhTW].map((locale) => locale.home.appTitle)).toEqual([
      'Awesome Slide',
      'Awesome Slide',
      'Awesome Slide',
      'Awesome Slide',
    ]);
  });
});
