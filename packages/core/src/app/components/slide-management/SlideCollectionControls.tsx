import { Folder, Layers3 } from 'lucide-react';
import { useState } from 'react';
import type { Deck, Folder as FolderRecord, SlideMetadataPatch, SlideRecord } from '@/lib/sdk';
import { cn } from '@/lib/utils';

type SlideCollectionControlsProps = {
  slide: SlideRecord;
  folders: FolderRecord[];
  decks: Deck[];
  disabled: boolean;
  density?: 'card' | 'row';
  onPatch: (slideId: string, patch: SlideMetadataPatch) => Promise<void>;
};

export function SlideCollectionControls({
  slide,
  folders,
  decks,
  disabled,
  density = 'card',
  onPatch,
}: SlideCollectionControlsProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = async (patchValue: SlideMetadataPatch) => {
    setPending(true);
    setError(null);
    try {
      await onPatch(slide.id, patchValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const toggleDeck = (deckId: string, checked: boolean) => {
    const nextDeckIds = checked
      ? [...slide.deckIds, deckId]
      : slide.deckIds.filter((id) => id !== deckId);
    void patch({ deckIds: Array.from(new Set(nextDeckIds)) });
  };

  return (
    <div className={cn('grid min-w-0 gap-1.5', density === 'row' && 'grid-cols-[1fr_1fr]')}>
      <label className="grid min-w-0 gap-1">
        <span className="sr-only">Folder</span>
        <span className="flex h-8 min-w-0 items-center gap-1.5 rounded-[7px] border border-hairline bg-muted px-2">
          <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <select
            value={slide.folderId ?? ''}
            disabled={disabled || pending}
            onChange={(event) => void patch({ folderId: event.target.value || null })}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none disabled:opacity-60"
            aria-label={`Move ${slide.title || slide.id} to folder`}
          >
            <option value="">Drafts</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </span>
      </label>

      <details className="min-w-0 rounded-[7px] border border-hairline bg-muted px-2 py-1.5">
        <summary className="flex min-h-5 cursor-pointer list-none items-center gap-1.5 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
          <Layers3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate">
            {slide.deckIds.length > 0 ? `${slide.deckIds.length} decks` : 'No decks'}
          </span>
        </summary>
        <div className="mt-2 grid gap-1">
          {decks.map((deck) => (
            <label key={deck.id} className="flex min-h-7 items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={slide.deckIds.includes(deck.id)}
                disabled={disabled || pending}
                onChange={(event) => toggleDeck(deck.id, event.target.checked)}
              />
              <span className="min-w-0 truncate">{deck.name}</span>
            </label>
          ))}
          {decks.length === 0 && (
            <p className="py-1 text-[12px] text-muted-foreground">No decks available</p>
          )}
        </div>
      </details>

      {error && (
        <p className={cn('text-[12px] text-destructive', density === 'row' && 'col-span-2')}>
          {error}
        </p>
      )}
    </div>
  );
}
