export function readStorageWithLegacy(
  storage: Storage,
  canonicalKey: string,
  legacyKey: string,
): string | null {
  const canonical = storage.getItem(canonicalKey);
  if (canonical !== null) return canonical;
  const legacy = storage.getItem(legacyKey);
  if (legacy !== null) {
    storage.setItem(canonicalKey, legacy);
  }
  return legacy;
}

export function writeStorageWithLegacy(
  storage: Storage,
  canonicalKey: string,
  legacyKey: string,
  value: string,
): void {
  storage.setItem(canonicalKey, value);
  if (storage.getItem(legacyKey) !== null) storage.setItem(legacyKey, value);
}
