import buildManifest from 'virtual:awesome-slide/folders';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ApiError,
  CreateDeckRequest,
  CreateFolderRequest,
  CreateSlideRequest,
  CreateSlideResponse,
  Deck,
  DeleteCollectionResponse,
  DeleteSlideResponse,
  DuplicateSlideRequest,
  DuplicateSlideResponse,
  Folder,
  ListSlidesResponse,
  ManagementCapabilities,
  SlideMetadataPatch,
  SlideMetadataPatchResponse,
  SlideRecord,
  UpdateDeckRequest,
  UpdateFolderRequest,
  UpdateOrderRequest,
  UpdateOrderResponse,
} from './sdk';
import {
  slideCreatedAt,
  slideDescriptions,
  slideIds,
  slideSourceState,
  slideStatus,
  slideTags,
  slideThemes,
  slideTitles,
  slideUpdatedAt,
} from './slides';

const FILES_CHANGED_EVENTS = [
  'awesome-slide:slide-changed',
  'open-slide:slide-changed',
  'awesome-slide:files-changed',
  'open-slide:files-changed',
] as const;

const READONLY_CAPABILITIES: ManagementCapabilities = {
  create: false,
  rename: false,
  duplicate: false,
  delete: false,
  move: false,
  editMetadata: false,
  manualOrder: false,
};

export type SlideSortMode =
  | 'manual'
  | 'updated-desc'
  | 'updated-asc'
  | 'created-desc'
  | 'created-asc'
  | 'title-asc'
  | 'title-desc';

type MutationName = 'create' | 'patch' | 'duplicate' | 'delete' | 'reorder' | 'collection';

type MutationState = {
  pending: Partial<Record<MutationName, boolean>>;
  error: string | null;
};

export type UseManagementResult = ListSlidesResponse & {
  loading: boolean;
  error: string | null;
  mutation: MutationState;
  refresh: () => Promise<void>;
  createSlide: (request: CreateSlideRequest) => Promise<CreateSlideResponse>;
  patchMetadata: (
    slideId: string,
    patch: SlideMetadataPatch,
  ) => Promise<SlideMetadataPatchResponse>;
  duplicateSlide: (
    slideId: string,
    request?: DuplicateSlideRequest,
  ) => Promise<DuplicateSlideResponse>;
  deleteSlide: (slideId: string) => Promise<DeleteSlideResponse>;
  updateOrder: (request: UpdateOrderRequest) => Promise<UpdateOrderResponse>;
  createFolder: (request: CreateFolderRequest) => Promise<Folder>;
  updateFolder: (folderId: string, request: UpdateFolderRequest) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<DeleteCollectionResponse>;
  createDeck: (request: CreateDeckRequest) => Promise<Deck>;
  updateDeck: (deckId: string, request: UpdateDeckRequest) => Promise<Deck>;
  deleteDeck: (deckId: string) => Promise<DeleteCollectionResponse>;
};

export function searchSlides(
  slides: readonly SlideRecord[],
  query: string,
  folders: readonly Folder[],
  decks: readonly Deck[],
): SlideRecord[] {
  const terms = query
    .toLocaleLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return [...slides];

  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  const deckNames = new Map(decks.map((deck) => [deck.id, deck.name]));

  return slides.filter((slide) => {
    const haystack = [
      slide.id,
      slide.title,
      slide.description ?? '',
      ...(slide.tags ?? []),
      slide.folderId ? (folderNames.get(slide.folderId) ?? slide.folderId) : 'drafts',
      ...slide.deckIds.map((deckId) => deckNames.get(deckId) ?? deckId),
    ]
      .join(' ')
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function sortSlides(slides: readonly SlideRecord[], sortMode: SlideSortMode): SlideRecord[] {
  const next = [...slides];
  if (sortMode === 'manual') return next;
  if (sortMode === 'title-asc') return next.sort((a, b) => compareTitle(a, b));
  if (sortMode === 'title-desc') return next.sort((a, b) => compareTitle(b, a));
  if (sortMode === 'created-asc')
    return next.sort((a, b) => compareDate(a.createdAt, b.createdAt, a, b, 'asc'));
  if (sortMode === 'created-desc')
    return next.sort((a, b) => compareDate(a.createdAt, b.createdAt, a, b, 'desc'));
  if (sortMode === 'updated-asc')
    return next.sort((a, b) => compareDate(a.updatedAt, b.updatedAt, a, b, 'asc'));
  return next.sort((a, b) => compareDate(a.updatedAt, b.updatedAt, a, b, 'desc'));
}

function compareTitle(a: SlideRecord, b: SlideRecord): number {
  return (a.title || a.id).localeCompare(b.title || b.id, undefined, { sensitivity: 'base' });
}

function compareDate(
  aValue: string | undefined,
  bValue: string | undefined,
  a: SlideRecord,
  b: SlideRecord,
  direction: 'asc' | 'desc',
): number {
  const aTime = dateTime(aValue);
  const bTime = dateTime(bValue);
  if (aTime === null && bTime === null) return compareTitle(a, b);
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  const diff = direction === 'asc' ? aTime - bTime : bTime - aTime;
  return diff || compareTitle(a, b);
}

function dateTime(value: string | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function staticManagementData(): ListSlidesResponse {
  const slides: SlideRecord[] = slideIds.map((id) => ({
    id,
    title: slideTitles[id] ?? id,
    description: slideDescriptions[id],
    tags: slideTags[id] ?? [],
    theme: slideThemes[id],
    status: slideStatus[id] ?? 'draft',
    createdAt: msToIso(slideCreatedAt[id]),
    updatedAt: msToIso(slideUpdatedAt[id]),
    folderId: buildManifest.assignments[id],
    deckIds: buildManifest.decks
      .filter((deck: Deck) => deck.slideOrder.includes(id))
      .map((deck: Deck) => deck.id),
    manualOrder: manualOrderIndex(id, buildManifest.manualOrder),
    preview: { kind: 'live' },
    sourceState: slideSourceState[id] ?? 'missing',
    readOnly: true,
  }));

  return {
    mode: 'readonly',
    capabilities: READONLY_CAPABILITIES,
    slides,
    folders: buildManifest.folders,
    decks: buildManifest.decks,
    manualOrder: buildManifest.manualOrder,
  };
}

async function getManagementData(): Promise<ListSlidesResponse> {
  if (!import.meta.env.DEV) return staticManagementData();
  const res = await fetch('/__management/slides');
  if (!res.ok) throw await responseError(res, 'GET /__management/slides');
  return (await res.json()) as ListSlidesResponse;
}

async function mutationRequest<T>(url: string, init: RequestInit, label: string): Promise<T> {
  if (!import.meta.env.DEV) {
    throw new Error('Editing requires the local Awesome Slide dev server.');
  }
  const res = await fetch(url, init);
  if (!res.ok) throw await responseError(res, label);
  return (await res.json()) as T;
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = (await res.json()) as Partial<ApiError>;
    if (typeof body.error === 'string') return new Error(body.error);
  } catch {}
  return new Error(`${fallback} failed with ${res.status}`);
}

function msToIso(value: number | undefined): string | undefined {
  return value === undefined ? undefined : new Date(value).toISOString();
}

function manualOrderIndex(id: string, manualOrder: Record<string, string[]>): number | undefined {
  const indexes = Object.values(manualOrder)
    .map((ids) => ids.indexOf(id))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);
  return indexes[0];
}

function mutationInit(method: string, body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function useManagement(): UseManagementResult {
  const initial = useMemo(staticManagementData, []);
  const [data, setData] = useState<ListSlidesResponse>(initial);
  const [loading, setLoading] = useState(import.meta.env.DEV);
  const [error, setError] = useState<string | null>(null);
  const [mutation, setMutation] = useState<MutationState>({ pending: {}, error: null });

  const refresh = useCallback(async () => {
    setError(null);
    const next = await getManagementData();
    setData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getManagementData()
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return;
    const handler = () => {
      refresh().catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    };
    for (const event of FILES_CHANGED_EVENTS) hot.on(event, handler);
    return () => {
      for (const event of FILES_CHANGED_EVENTS) hot.off(event, handler);
    };
  }, [refresh]);

  const runMutation = useCallback(
    async <T>(name: MutationName, request: () => Promise<T>): Promise<T> => {
      setMutation((current) => ({
        pending: { ...current.pending, [name]: true },
        error: null,
      }));
      try {
        const result = await request();
        await refresh();
        setMutation((current) => ({
          pending: { ...current.pending, [name]: false },
          error: null,
        }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setMutation((current) => ({
          pending: { ...current.pending, [name]: false },
          error: message,
        }));
        throw err;
      }
    },
    [refresh],
  );

  const createSlide = useCallback(
    (request: CreateSlideRequest) =>
      runMutation('create', () =>
        mutationRequest<CreateSlideResponse>(
          '/__management/slides',
          mutationInit('POST', request),
          'POST /__management/slides',
        ),
      ),
    [runMutation],
  );

  const patchMetadata = useCallback(
    (slideId: string, patch: SlideMetadataPatch) =>
      runMutation('patch', () =>
        mutationRequest<SlideMetadataPatchResponse>(
          `/__management/slides/${encodeURIComponent(slideId)}/metadata`,
          mutationInit('PATCH', patch),
          `PATCH /__management/slides/${slideId}/metadata`,
        ),
      ),
    [runMutation],
  );

  const duplicateSlide = useCallback(
    (slideId: string, request: DuplicateSlideRequest = {}) =>
      runMutation('duplicate', () =>
        mutationRequest<DuplicateSlideResponse>(
          `/__management/slides/${encodeURIComponent(slideId)}/duplicate`,
          mutationInit('POST', request),
          `POST /__management/slides/${slideId}/duplicate`,
        ),
      ),
    [runMutation],
  );

  const deleteSlide = useCallback(
    (slideId: string) =>
      runMutation('delete', () =>
        mutationRequest<DeleteSlideResponse>(
          `/__management/slides/${encodeURIComponent(slideId)}`,
          mutationInit('DELETE'),
          `DELETE /__management/slides/${slideId}`,
        ),
      ),
    [runMutation],
  );

  const updateOrder = useCallback(
    (request: UpdateOrderRequest) =>
      runMutation('reorder', () =>
        mutationRequest<UpdateOrderResponse>(
          '/__management/collections/order',
          mutationInit('PUT', request),
          'PUT /__management/collections/order',
        ),
      ),
    [runMutation],
  );

  const createFolder = useCallback(
    (request: CreateFolderRequest) =>
      runMutation('collection', () =>
        mutationRequest<Folder>(
          '/__management/folders',
          mutationInit('POST', request),
          'POST /__management/folders',
        ),
      ),
    [runMutation],
  );

  const updateFolder = useCallback(
    (folderId: string, request: UpdateFolderRequest) =>
      runMutation('collection', () =>
        mutationRequest<Folder>(
          `/__management/folders/${encodeURIComponent(folderId)}`,
          mutationInit('PUT', request),
          `PUT /__management/folders/${folderId}`,
        ),
      ),
    [runMutation],
  );

  const deleteFolder = useCallback(
    (folderId: string) =>
      runMutation('collection', () =>
        mutationRequest<DeleteCollectionResponse>(
          `/__management/folders/${encodeURIComponent(folderId)}`,
          mutationInit('DELETE'),
          `DELETE /__management/folders/${folderId}`,
        ),
      ),
    [runMutation],
  );

  const createDeck = useCallback(
    (request: CreateDeckRequest) =>
      runMutation('collection', () =>
        mutationRequest<Deck>(
          '/__management/decks',
          mutationInit('POST', request),
          'POST /__management/decks',
        ),
      ),
    [runMutation],
  );

  const updateDeck = useCallback(
    (deckId: string, request: UpdateDeckRequest) =>
      runMutation('collection', () =>
        mutationRequest<Deck>(
          `/__management/decks/${encodeURIComponent(deckId)}`,
          mutationInit('PUT', request),
          `PUT /__management/decks/${deckId}`,
        ),
      ),
    [runMutation],
  );

  const deleteDeck = useCallback(
    (deckId: string) =>
      runMutation('collection', () =>
        mutationRequest<DeleteCollectionResponse>(
          `/__management/decks/${encodeURIComponent(deckId)}`,
          mutationInit('DELETE'),
          `DELETE /__management/decks/${deckId}`,
        ),
      ),
    [runMutation],
  );

  return {
    ...data,
    loading,
    error,
    mutation,
    refresh,
    createSlide,
    patchMetadata,
    duplicateSlide,
    deleteSlide,
    updateOrder,
    createFolder,
    updateFolder,
    deleteFolder,
    createDeck,
    updateDeck,
    deleteDeck,
  };
}
