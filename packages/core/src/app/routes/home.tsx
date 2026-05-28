import { X } from 'lucide-react';
import { type KeyboardEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateSlideDialog } from '../components/slide-management/CreateSlideDialog';
import { DeleteConfirmDialog } from '../components/slide-management/DeleteConfirmDialog';
import { DuplicateSlideDialog } from '../components/slide-management/DuplicateSlideDialog';
import {
  type ManagementSelection,
  ManagementSidebar,
} from '../components/slide-management/ManagementSidebar';
import { SearchSortToolbar } from '../components/slide-management/SearchSortToolbar';
import { SlideGrid } from '../components/slide-management/SlideGrid';
import { SlideInspector } from '../components/slide-management/SlideInspector';
import { SlideList } from '../components/slide-management/SlideList';
import { type SlideSortMode, searchSlides, sortSlides, useManagement } from '../lib/management';
import type { Deck, SlideMetadataPatch, SlideRecord } from '../lib/sdk';

type ViewMode = 'grid' | 'list';

const LOADING_KEYS = ['preview-a', 'preview-b', 'preview-c', 'preview-d', 'preview-e', 'preview-f'];
const DEFAULT_FOLDER_ICON = { type: 'color', value: '#2f6fed' } as const;

export function Home() {
  const management = useManagement();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SlideSortMode>('manual');
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [duplicateSlideId, setDuplicateSlideId] = useState<string | null>(null);
  const [deleteSlideId, setDeleteSlideId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selection = useMemo(
    () => selectionFromParams(searchParams, management.folders, management.decks),
    [searchParams, management.folders, management.decks],
  );

  const collectionSlides = useMemo(
    () =>
      slidesForSelection(management.slides, management.decks, management.manualOrder, selection),
    [management.slides, management.decks, management.manualOrder, selection],
  );

  const filteredSlides = useMemo(
    () => searchSlides(collectionSlides, query, management.folders, management.decks),
    [collectionSlides, query, management.folders, management.decks],
  );

  const visibleSlides = useMemo(
    () => sortSlides(filteredSlides, sortMode),
    [filteredSlides, sortMode],
  );

  const title = collectionTitle(selection, management.decks, management.folders);
  const selectedSlide = management.slides.find((slide) => slide.id === selectedSlideId) ?? null;
  const duplicateTarget = management.slides.find((slide) => slide.id === duplicateSlideId) ?? null;
  const deleteTarget = management.slides.find((slide) => slide.id === deleteSlideId) ?? null;
  const canMutate = management.mode === 'editable';

  const selectCollection = useCallback(
    (next: ManagementSelection) => {
      setSearchParams(paramsForSelection(next), { replace: true });
      setSidebarOpen(false);
    },
    [setSearchParams],
  );

  const patchCollection = useCallback(
    async (slideId: string, patch: SlideMetadataPatch) => {
      await management.patchMetadata(slideId, patch);
    },
    [management],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (selectedSlideId) setSelectedSlideId(null);
      if (sidebarOpen) setSidebarOpen(false);
      return;
    }

    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-slide-item]');
    if (!item) return;
    if (target.closest('input, textarea, select, a, summary')) return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[data-slide-item]'),
    );
    const currentIndex = items.indexOf(item);
    if (currentIndex === -1) return;

    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp'
    ) {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      const next = items[(currentIndex + direction + items.length) % items.length];
      next?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const slideId = item.dataset.slideId;
      if (slideId) {
        event.preventDefault();
        navigate(`/s/${slideId}`);
      }
    }
  };

  return (
    <section
      className="flex min-h-0 flex-1 overflow-hidden bg-canvas"
      onKeyDown={handleKeyDown}
      aria-label="Slide management"
    >
      <div className="hidden min-h-0 shrink-0 md:block">
        <ManagementSidebar
          slides={management.slides}
          folders={management.folders}
          decks={management.decks}
          selection={selection}
          canManage={canMutate}
          onSelect={selectCollection}
          onCreateFolder={async (name) => {
            const folder = await management.createFolder({ name, icon: DEFAULT_FOLDER_ICON });
            selectCollection({ type: 'folder', id: folder.id });
          }}
          onRenameFolder={async (folderId, name) => {
            await management.updateFolder(folderId, { name });
          }}
          onDeleteFolder={async (folderId) => {
            await management.deleteFolder(folderId);
            if (selection.type === 'folder' && selection.id === folderId) {
              selectCollection({ type: 'draft' });
            }
          }}
          onCreateDeck={async (name) => {
            const deck = await management.createDeck({ name });
            selectCollection({ type: 'deck', id: deck.id });
          }}
          onRenameDeck={async (deckId, name) => {
            await management.updateDeck(deckId, { name });
          }}
          onDeleteDeck={async (deckId) => {
            await management.deleteDeck(deckId);
            if (selection.type === 'deck' && selection.id === deckId) {
              selectCollection({ type: 'draft' });
            }
          }}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Close collections"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,92vw)] bg-background shadow-floating">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              aria-label="Close collections"
            >
              <X className="size-4" aria-hidden />
            </button>
            <ManagementSidebar
              slides={management.slides}
              folders={management.folders}
              decks={management.decks}
              selection={selection}
              canManage={canMutate}
              onSelect={selectCollection}
              onCreateFolder={async (name) => {
                const folder = await management.createFolder({ name, icon: DEFAULT_FOLDER_ICON });
                selectCollection({ type: 'folder', id: folder.id });
              }}
              onRenameFolder={async (folderId, name) => {
                await management.updateFolder(folderId, { name });
              }}
              onDeleteFolder={async (folderId) => {
                await management.deleteFolder(folderId);
                if (selection.type === 'folder' && selection.id === folderId) {
                  selectCollection({ type: 'draft' });
                }
              }}
              onCreateDeck={async (name) => {
                const deck = await management.createDeck({ name });
                selectCollection({ type: 'deck', id: deck.id });
              }}
              onRenameDeck={async (deckId, name) => {
                await management.updateDeck(deckId, { name });
              }}
              onDeleteDeck={async (deckId) => {
                await management.deleteDeck(deckId);
                if (selection.type === 'deck' && selection.id === deckId) {
                  selectCollection({ type: 'draft' });
                }
              }}
            />
          </div>
        </div>
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="grid gap-4 border-b border-hairline bg-canvas px-4 py-4 md:px-7">
          <div className="flex min-w-0 items-end gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-[26px] font-semibold leading-none tracking-[-0.8px] md:text-[28px] md:tracking-[-1px]">
                {title}
              </h1>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {visibleSlides.length.toString().padStart(2, '0')} of{' '}
                {collectionSlides.length.toString().padStart(2, '0')} slides
              </p>
            </div>
          </div>
          <SearchSortToolbar
            query={query}
            sortMode={sortMode}
            viewMode={viewMode}
            canCreate={management.capabilities.create}
            refreshing={management.loading}
            onQueryChange={setQuery}
            onSortModeChange={setSortMode}
            onViewModeChange={setViewMode}
            onCreate={() => setCreateOpen(true)}
            onRefresh={() => {
              void management.refresh();
            }}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
          {management.mode === 'readonly' && <ReadOnlyBanner />}
          {management.mutation.error && (
            <ActionError message={management.mutation.error} mode={management.mode} />
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-7">
          {management.error ? (
            <StateBlock
              title="Slides failed to load"
              detail={`${management.error}. Check the local dev server and refresh the library.`}
            />
          ) : management.loading ? (
            <LoadingGrid />
          ) : visibleSlides.length === 0 ? (
            <StateBlock
              {...emptyState(query, management.slides.length, collectionSlides.length, selection)}
            />
          ) : viewMode === 'grid' ? (
            <SlideGrid
              slides={visibleSlides}
              folders={management.folders}
              decks={management.decks}
              canMutate={canMutate}
              onOpen={(slideId) => navigate(`/s/${slideId}`)}
              onSelect={setSelectedSlideId}
              onDuplicate={(slideId) => {
                if (!canMutate) return;
                setActionError(null);
                setDuplicateSlideId(slideId);
              }}
              onDelete={(slideId) => {
                if (!canMutate) return;
                setActionError(null);
                setDeleteSlideId(slideId);
              }}
              onPatchCollection={patchCollection}
            />
          ) : (
            <SlideList
              slides={visibleSlides}
              folders={management.folders}
              decks={management.decks}
              canMutate={canMutate}
              onOpen={(slideId) => navigate(`/s/${slideId}`)}
              onSelect={setSelectedSlideId}
              onDuplicate={(slideId) => {
                if (!canMutate) return;
                setActionError(null);
                setDuplicateSlideId(slideId);
              }}
              onDelete={(slideId) => {
                if (!canMutate) return;
                setActionError(null);
                setDeleteSlideId(slideId);
              }}
              onPatchCollection={patchCollection}
            />
          )}
        </div>
      </main>
      <div className="hidden min-h-0 shrink-0 xl:block">
        <SlideInspector
          slide={selectedSlide}
          folders={management.folders}
          decks={management.decks}
          mode={management.mode}
          onClose={() => setSelectedSlideId(null)}
          onSave={async (slideId, patch) => {
            await management.patchMetadata(slideId, patch);
            setSelectedSlideId(slideId);
          }}
        />
      </div>
      {selectedSlideId && selectedSlide && (
        <div className="fixed inset-0 z-50 bg-background xl:hidden">
          <SlideInspector
            slide={selectedSlide}
            folders={management.folders}
            decks={management.decks}
            mode={management.mode}
            onClose={() => setSelectedSlideId(null)}
            onSave={async (slideId, patch) => {
              await management.patchMetadata(slideId, patch);
              setSelectedSlideId(slideId);
            }}
          />
        </div>
      )}
      <CreateSlideDialog
        open={createOpen}
        folders={management.folders}
        decks={management.decks}
        onOpenChange={setCreateOpen}
        onCreate={management.createSlide}
        onCreated={(response) => {
          if (response.next.type === 'agent-chat') {
            navigate(`/s/${response.next.seedSlideId}`);
          } else {
            navigate(`/s/${response.next.slideId}`);
          }
        }}
      />
      <DuplicateSlideDialog
        open={duplicateSlideId !== null}
        slide={duplicateTarget}
        pending={management.mutation.pending.duplicate ?? false}
        error={actionError}
        onOpenChange={(open) => {
          if (!open) setDuplicateSlideId(null);
        }}
        onConfirm={async (request) => {
          if (!duplicateTarget) return;
          setActionError(null);
          try {
            const response = await management.duplicateSlide(duplicateTarget.id, request);
            setDuplicateSlideId(null);
            setSelectedSlideId(response.slideId);
          } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
          }
        }}
      />
      <DeleteConfirmDialog
        open={deleteSlideId !== null}
        slide={deleteTarget}
        pending={management.mutation.pending.delete ?? false}
        error={actionError}
        onOpenChange={(open) => {
          if (!open) setDeleteSlideId(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setActionError(null);
          try {
            await management.deleteSlide(deleteTarget.id);
            if (selectedSlideId === deleteTarget.id) setSelectedSlideId(null);
            setDeleteSlideId(null);
          } catch (err) {
            setActionError(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </section>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="rounded-[8px] border border-hairline bg-background px-3 py-2 text-[12.5px] text-muted-foreground">
      This is a read-only slide snapshot. Run the local Awesome Slide dev server to create, move,
      duplicate, delete, or edit slide metadata.
    </div>
  );
}

function ActionError({ message, mode }: { message: string; mode: 'editable' | 'readonly' }) {
  return (
    <div className="rounded-[8px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
      {message}
      {mode === 'readonly' ? ' Editing is available only in the local dev server.' : ''}
    </div>
  );
}

function StateBlock({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-[280px] place-items-center rounded-[8px] border border-hairline bg-muted/50 px-6 text-center">
      <div className="max-w-sm">
        <p className="font-heading text-[16px] font-semibold tracking-normal">{title}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      {LOADING_KEYS.map((key) => (
        <div key={key} className="grid gap-3">
          <div className="aspect-video animate-pulse rounded-[8px] bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

function emptyState(
  query: string,
  totalSlides: number,
  collectionCount: number,
  selection: ManagementSelection,
): { title: string; detail: string } {
  if (query.trim()) {
    return {
      title: 'No search results',
      detail: 'Try a title, slide ID, tag, folder name, or deck name.',
    };
  }
  if (totalSlides === 0) {
    return {
      title: 'No slides yet',
      detail: 'Create a blank slide, use a theme template, or seed one from a prompt.',
    };
  }
  if (collectionCount === 0 && selection.type === 'deck') {
    return {
      title: 'No deck assignment',
      detail: 'Use the item deck toggles or inspector to add slides to this deck.',
    };
  }
  if (collectionCount === 0 && selection.type === 'folder') {
    return {
      title: 'No folder assignment',
      detail: 'Move slides into this folder from an item row or the inspector.',
    };
  }
  return {
    title: 'No slides in this collection',
    detail: 'Move slides here from another collection or create a new slide.',
  };
}

function selectionFromParams(
  searchParams: URLSearchParams,
  folders: { id: string }[],
  decks: Deck[],
): ManagementSelection {
  const deckId = searchParams.get('deck');
  if (deckId && decks.some((deck) => deck.id === deckId)) return { type: 'deck', id: deckId };
  const folderId = searchParams.get('f');
  if (folderId && folders.some((folder) => folder.id === folderId)) {
    return { type: 'folder', id: folderId };
  }
  return { type: 'draft' };
}

function paramsForSelection(selection: ManagementSelection): URLSearchParams {
  const params = new URLSearchParams();
  if (selection.type === 'folder') params.set('f', selection.id);
  if (selection.type === 'deck') params.set('deck', selection.id);
  return params;
}

function collectionTitle(
  selection: ManagementSelection,
  decks: Deck[],
  folders: { id: string; name: string }[],
): string {
  if (selection.type === 'folder') {
    return folders.find((folder) => folder.id === selection.id)?.name ?? 'Folder';
  }
  if (selection.type === 'deck') {
    return decks.find((deck) => deck.id === selection.id)?.name ?? 'Deck';
  }
  return 'Drafts';
}

function slidesForSelection(
  slides: SlideRecord[],
  decks: Deck[],
  manualOrder: Record<string, string[]>,
  selection: ManagementSelection,
): SlideRecord[] {
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  if (selection.type === 'deck') {
    const deck = decks.find((item) => item.id === selection.id);
    const ordered = orderByIds(deck?.slideOrder ?? [], byId);
    const remaining = slides
      .filter((slide) => slide.deckIds.includes(selection.id) && !ordered.includes(slide))
      .sort(fallbackSort);
    return [...ordered, ...remaining];
  }

  const collectionSlides =
    selection.type === 'folder'
      ? slides.filter((slide) => slide.folderId === selection.id)
      : slides.filter((slide) => !slide.folderId);
  const key = selection.type === 'folder' ? `folder:${selection.id}` : 'draft';
  return [
    ...orderByIds(manualOrder[key] ?? [], byId).filter((slide) => collectionSlides.includes(slide)),
    ...collectionSlides
      .filter((slide) => !(manualOrder[key] ?? []).includes(slide.id))
      .sort(fallbackSort),
  ];
}

function orderByIds(ids: string[], byId: Map<string, SlideRecord>): SlideRecord[] {
  return ids.flatMap((id) => {
    const slide = byId.get(id);
    return slide ? [slide] : [];
  });
}

function fallbackSort(a: SlideRecord, b: SlideRecord): number {
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.title.localeCompare(b.title);
}
