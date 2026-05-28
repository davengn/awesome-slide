import { Copy, ExternalLink, FileText, PanelRightOpen, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SlideCanvas } from '@/components/slide-canvas';
import { SlidePageProvider } from '@/lib/page-context';
import type { Deck, Folder, SlideMetadataPatch, SlideModule, SlideRecord } from '@/lib/sdk';
import { loadSlide } from '@/lib/slides';
import { cn } from '@/lib/utils';
import { SlideCollectionControls } from './SlideCollectionControls';

type SlideCardProps = {
  slide: SlideRecord;
  folders: Folder[];
  decks: Deck[];
  canMutate: boolean;
  onOpen: (slideId: string) => void;
  onSelect: (slideId: string) => void;
  onDuplicate: (slideId: string) => void;
  onDelete: (slideId: string) => void;
  onPatchCollection: (slideId: string, patch: SlideMetadataPatch) => Promise<void>;
};

export function SlideCard({
  slide,
  folders,
  decks,
  canMutate,
  onOpen,
  onSelect,
  onDuplicate,
  onDelete,
  onPatchCollection,
}: SlideCardProps) {
  const [module, setModule] = useState<SlideModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSlide(slide.id)
      .then((loaded) => {
        if (!cancelled) setModule(loaded);
      })
      .catch(() => {
        if (!cancelled) setModule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slide.id]);

  const FirstPage = module?.default[0];

  return (
    <article className="group grid min-w-0 gap-3">
      <button
        type="button"
        onClick={() => onOpen(slide.id)}
        data-slide-item
        data-slide-id={slide.id}
        className="relative aspect-video overflow-hidden rounded-xl border border-hairline bg-card text-left shadow-edge outline-none ring-1 ring-foreground/[0.04] transition-[box-shadow,transform,--tw-ring-color] duration-200 hover:-translate-y-0.5 hover:shadow-floating hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {FirstPage ? (
          <div className="h-full w-full transition-transform duration-300 group-hover:scale-[1.025]">
            <SlideCanvas flat freezeMotion design={module?.design}>
              <SlidePageProvider index={0} total={module?.default.length ?? 1}>
                <FirstPage />
              </SlidePageProvider>
            </SlideCanvas>
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
            <FileText className="size-7" aria-hidden />
          </div>
        )}
        <span className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-edge backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <ExternalLink className="size-4" aria-hidden />
        </span>
      </button>

      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={() => onOpen(slide.id)}
            className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <h3 className="truncate font-heading text-[14px] font-semibold leading-tight tracking-normal">
              {slide.title || slide.id}
            </h3>
          </button>
          <StatusBadge status={slide.status} />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
          <span className="truncate font-mono">{slide.id}</span>
          {slide.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="max-w-[8rem] truncate rounded-sm bg-muted px-1.5 py-0.5 text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>
        <SlideCollectionControls
          slide={slide}
          folders={folders}
          decks={decks}
          disabled={!canMutate}
          onPatch={onPatchCollection}
        />
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
          <button
            type="button"
            onClick={() => onSelect(slide.id)}
            className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label={`Inspect ${slide.title || slide.id}`}
          >
            <PanelRightOpen className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(slide.id)}
            disabled={!canMutate}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label={`Duplicate ${slide.title || slide.id}`}
          >
            <Copy className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDelete(slide.id)}
            disabled={!canMutate}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label={`Delete ${slide.title || slide.id}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

export function StatusBadge({ status }: { status: SlideRecord['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10.5px] font-medium capitalize',
        status === 'ready' && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
        status === 'draft' && 'bg-muted text-muted-foreground',
        status === 'archived' && 'bg-foreground/10 text-muted-foreground',
      )}
    >
      {status}
    </span>
  );
}
