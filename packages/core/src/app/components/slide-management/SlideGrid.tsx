import type { Deck, Folder, SlideMetadataPatch, SlideRecord } from '@/lib/sdk';
import { SlideCard } from './SlideCard';

type SlideGridProps = {
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

export function SlideGrid({
  slides,
  folders,
  decks,
  canMutate,
  onOpen,
  onSelect,
  onDuplicate,
  onDelete,
  onPatchCollection,
}: SlideGridProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-5 gap-y-8 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      {slides.map((slide) => (
        <li key={slide.id} className="min-w-0">
          <SlideCard
            slide={slide}
            folders={folders}
            decks={decks}
            canMutate={canMutate}
            onOpen={onOpen}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onPatchCollection={onPatchCollection}
          />
        </li>
      ))}
    </ul>
  );
}
