import { describe, expect, it } from 'vitest';
import { readStorageWithLegacy, writeStorageWithLegacy } from './compat-storage.ts';

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('compat storage', () => {
  it('reads and migrates legacy open-slide keys to awesome-slide keys', () => {
    const storage = new MemoryStorage();
    storage.setItem('open-slide:home-sort', 'title-asc');

    expect(readStorageWithLegacy(storage, 'awesome-slide:home-sort', 'open-slide:home-sort')).toBe(
      'title-asc',
    );
    expect(storage.getItem('awesome-slide:home-sort')).toBe('title-asc');
  });

  it('prefers canonical keys and only dual-writes when a legacy key exists', () => {
    const storage = new MemoryStorage();
    storage.setItem('awesome-slide:home-sort', 'created-desc');
    storage.setItem('open-slide:home-sort', 'title-asc');

    expect(readStorageWithLegacy(storage, 'awesome-slide:home-sort', 'open-slide:home-sort')).toBe(
      'created-desc',
    );

    writeStorageWithLegacy(
      storage,
      'awesome-slide:home-sort',
      'open-slide:home-sort',
      'title-desc',
    );

    expect(storage.getItem('awesome-slide:home-sort')).toBe('title-desc');
    expect(storage.getItem('open-slide:home-sort')).toBe('title-desc');
  });
});
