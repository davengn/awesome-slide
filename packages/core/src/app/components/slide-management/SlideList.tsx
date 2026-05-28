import { Copy, ExternalLink, PanelRightOpen, Trash2 } from 'lucide-react';
import type { Deck, Folder, SlideMetadataPatch, SlideRecord } from '@/lib/sdk';
import { StatusBadge } from './SlideCard';
import { SlideCollectionControls } from './SlideCollectionControls';

type SlideListProps = {
  slides: SlideRecord[];
  folders: Folder[];
  decks: Deck[];
  canMutate: boolean;
  onOpen: (slideId: string) => void;
  onSelect: (slideId: string) => void;
  onDuplicate: (slideId: string) => void;
  onDelete: (slideId: string) => void;
  onPatchCollection: (slideId: string, patch: SlideMetadataPatch) => Promise<void>;
};

export function SlideList({
  slides,
  folders,
  decks,
  canMutate,
  onOpen,
  onSelect,
  onDuplicate,
  onDelete,
  onPatchCollection,
}: SlideListProps) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-hairline bg-background">
      <div className="grid min-w-[900px] grid-cols-[minmax(220px,1fr)_110px_minmax(260px,320px)_minmax(120px,180px)_112px] border-b border-hairline px-3 py-2 text-[11px] font-medium uppercase text-muted-foreground">
        <span>Slide</span>
        <span>Status</span>
        <span>Collections</span>
        <span>Updated</span>
        <span />
      </div>
      <ul className="min-w-[900px] divide-y divide-hairline">
        {slides.map((slide) => (
          <li
            key={slide.id}
            className="grid grid-cols-[minmax(220px,1fr)_110px_minmax(260px,320px)_minmax(120px,180px)_112px] items-center gap-3 px-3 py-2.5 text-[13px]"
          >
            <button
              type="button"
              onClick={() => onOpen(slide.id)}
              data-slide-item
              data-slide-id={slide.id}
              className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="block truncate font-heading font-semibold tracking-normal">
                {slide.title || slide.id}
              </span>
              <span className="block truncate font-mono text-[11.5px] text-muted-foreground">
                {slide.id}
              </span>
            </button>
            <StatusBadge status={slide.status} />
            <SlideCollectionControls
              slide={slide}
              folders={folders}
              decks={decks}
              disabled={!canMutate}
              density="row"
              onPatch={onPatchCollection}
            />
            <span className="truncate text-muted-foreground">{formatDate(slide.updatedAt)}</span>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label={`Inspect ${slide.title || slide.id}`}
              >
                <PanelRightOpen className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDuplicate(slide.id)}
                disabled={!canMutate}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label={`Duplicate ${slide.title || slide.id}`}
              >
                <Copy className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete(slide.id)}
                disabled={!canMutate}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label={`Delete ${slide.title || slide.id}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onOpen(slide.id)}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label={`Open ${slide.title || slide.id}`}
              >
                <ExternalLink className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string | undefined): string {
  if (!value) return 'Not saved';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
