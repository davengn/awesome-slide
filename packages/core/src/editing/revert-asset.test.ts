import { describe, expect, it } from 'vitest';
import { applyRevertAsset, findAssetUsages } from './revert-asset.ts';

describe('findAssetUsages', () => {
  it('returns 0 when the import is absent', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      'export default [() => (<ImagePlaceholder hint="x" />)];',
      '',
    ].join('\n');
    expect(findAssetUsages(src, './assets/hero.png')).toBe(0);
  });

  it('counts every <img src={ident}> that references the import', () => {
    const src = [
      "import hero from './assets/hero.png';",
      'export default [() => (',
      '  <div>',
      "    <img src={hero} alt='a' style={{ objectFit: 'cover' }} />",
      "    <img src={hero} alt='b' style={{ objectFit: 'cover' }} />",
      '  </div>',
      ')];',
      '',
    ].join('\n');
    expect(findAssetUsages(src, './assets/hero.png')).toBe(2);
  });

  it('ignores <img src> that points at a different identifier', () => {
    const src = [
      "import hero from './assets/hero.png';",
      "import logo from './assets/logo.svg';",
      'export default [() => (',
      "  <img src={logo} alt='l' />",
      ')];',
      '',
    ].join('\n');
    expect(findAssetUsages(src, './assets/hero.png')).toBe(0);
  });
});

describe('applyRevertAsset', () => {
  it('reverts <img> back to <ImagePlaceholder> and removes the asset import', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      "  <img src={hero} alt='Product hero' style={{ width: 1280, height: 720, objectFit: 'cover', objectPosition: '50% 50%' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).not.toContain("from './assets/hero.png'");
    expect(r.source).not.toContain('<img');
    expect(r.source).toContain(
      '<ImagePlaceholder hint="Product hero" width={1280} height={720} />',
    );
  });

  it('omits width/height when the style only carries objectFit', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      "import logo from './assets/logo.svg';",
      'export default [() => (',
      "  <img src={logo} alt='Logo' style={{ objectFit: 'cover', objectPosition: '50% 50%' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/logo.svg');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toContain('<ImagePlaceholder hint="Logo" />');
    expect(r.source).not.toMatch(/width=\{/);
    expect(r.source).not.toMatch(/height=\{/);
  });

  it("treats '100%' style fillers as unset and keeps numeric dims", () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      "import cover from './assets/cover.png';",
      'export default [() => (',
      "  <img src={cover} alt='Cover' style={{ width: 800, height: '100%', objectFit: 'cover', objectPosition: '50% 50%' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/cover.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toContain('<ImagePlaceholder hint="Cover" width={800} />');
  });

  it('adds ImagePlaceholder to an existing @open-slide/core named import', () => {
    const src = [
      "import { type Page } from '@open-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      "  <img src={hero} alt='x' style={{ objectFit: 'cover' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toMatch(/import \{ type Page, ImagePlaceholder \} from '@open-slide\/core';/);
  });

  it('adds ImagePlaceholder to an existing @awesome-slide/core named import', () => {
    const src = [
      "import { type Page } from '@awesome-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      "  <img src={hero} alt='x' style={{ objectFit: 'cover' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toMatch(
      /import \{ type Page, ImagePlaceholder \} from '@awesome-slide\/core';/,
    );
  });

  it('adds a separate value import when the only @open-slide/core import is type-only', () => {
    const src = [
      "import type { DesignSystem, Page, SlideMeta } from '@open-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      "  <img src={hero} alt='x' style={{ objectFit: 'cover' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toMatch(
      /import type \{ DesignSystem, Page, SlideMeta \} from '@open-slide\/core';/,
    );
    expect(r.source).toContain("import { ImagePlaceholder } from '@awesome-slide/core';");
  });

  it('adds a fresh @awesome-slide/core import when none exists', () => {
    const src = [
      "import hero from './assets/hero.png';",
      'export default [() => (',
      "  <img src={hero} alt='x' style={{ objectFit: 'cover' }} />",
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source.split('\n')[0]).toBe("import { ImagePlaceholder } from '@awesome-slide/core';");
  });

  it('is a no-op when the asset is not imported', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      'export default [() => (<ImagePlaceholder hint="x" />)];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/missing.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).toBe(src);
  });

  it('reverts multiple <img> usages of the same import in one file', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      '  <div>',
      "    <img src={hero} alt='First' style={{ width: 100, height: 100, objectFit: 'cover' }} />",
      "    <img src={hero} alt='Second' style={{ objectFit: 'cover' }} />",
      '  </div>',
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    if (!r.ok) throw new Error(`expected ok, got ${r.error}`);
    expect(r.source).not.toContain("from './assets/hero.png'");
    expect(r.source).toContain('<ImagePlaceholder hint="First" width={100} height={100} />');
    expect(r.source).toContain('<ImagePlaceholder hint="Second" />');
  });

  it('refuses to revert when the identifier is referenced outside <img src>', () => {
    const src = [
      "import { ImagePlaceholder } from '@open-slide/core';",
      "import hero from './assets/hero.png';",
      'export default [() => (',
      '  <div data-bg={hero}>',
      "    <img src={hero} alt='x' style={{ objectFit: 'cover' }} />",
      '  </div>',
      ')];',
      '',
    ].join('\n');
    const r = applyRevertAsset(src, './assets/hero.png');
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.error).toMatch(/outside <img/);
  });
});
