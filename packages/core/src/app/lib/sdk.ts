import type { ComponentType } from 'react';
import type { DesignSystem } from './design.ts';
import type { SlideTransition } from './transition.ts';

export type Page = ComponentType & { transition?: SlideTransition };

export type SlideMeta = {
  title?: string;
  description?: string;
  tags?: string[];
  theme?: string;
  status?: 'draft' | 'ready' | 'archived';
  notes?: string;
  createdAt?: string;
};

export type SlideModule = {
  default: Page[];
  meta?: SlideMeta;
  design?: DesignSystem;
  // Index-aligned with `default`.
  notes?: (string | undefined)[];
  transition?: SlideTransition;
};

export type FolderIcon = { type: 'emoji'; value: string } | { type: 'color'; value: string };

export type Folder = {
  id: string;
  name: string;
  icon: FolderIcon;
};

export type SlideId = string;
export type FolderId = string;
export type DeckId = string;

export type Deck = {
  id: DeckId;
  name: string;
  description?: string;
  theme?: string;
  slideOrder: SlideId[];
};

export type SlideCollectionManifest = {
  folders: Folder[];
  assignments: Record<SlideId, FolderId>;
  decks: Deck[];
  manualOrder: Record<string, SlideId[]>;
};

export type FoldersManifest = SlideCollectionManifest;

export type SourceState = 'supported' | 'readable-unsupported' | 'parse-error' | 'missing';

export type ManagementMode = 'editable' | 'readonly';

export type ManagementCapabilities = {
  create: boolean;
  rename: boolean;
  duplicate: boolean;
  delete: boolean;
  move: boolean;
  editMetadata: boolean;
  manualOrder: boolean;
};

export type ApiError = {
  error: string;
  code?: string;
  field?: string;
  recovery?: string;
};

export type SlideRecord = {
  id: SlideId;
  title: string;
  description?: string;
  tags: string[];
  theme?: string;
  status: 'draft' | 'ready' | 'archived';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  folderId?: FolderId;
  deckIds: DeckId[];
  manualOrder?: number;
  preview: { kind: 'live' | 'unavailable'; reason?: string };
  sourceState: SourceState;
  readOnly: boolean;
};

export type CreateSlideRequest = {
  kind: 'blank' | 'template' | 'prompt';
  id: string;
  title: string;
  theme?: string;
  templateId?: string;
  folderId?: string | null;
  deckId?: string | null;
  prompt?: string;
};

export type ListSlidesResponse = {
  mode: ManagementMode;
  capabilities: ManagementCapabilities;
  slides: SlideRecord[];
  folders: Folder[];
  decks: Deck[];
  manualOrder: Record<string, SlideId[]>;
};

export type CreateSlideResponse = {
  ok: true;
  slideId: SlideId;
  next:
    | { type: 'open-slide'; slideId: SlideId }
    | { type: 'agent-chat'; prompt: string; seedSlideId: SlideId };
};

export type SlideMetadataPatch = {
  title?: string;
  description?: string | null;
  tags?: string[];
  theme?: string | null;
  status?: 'draft' | 'ready' | 'archived';
  notes?: string | null;
  folderId?: string | null;
  deckIds?: string[];
};

export type SlideMetadataPatchResponse = {
  ok: true;
  slide: SlideRecord;
};

export type DuplicateSlideRequest = {
  newId?: string;
  title?: string;
  folderId?: string | null;
  deckId?: string | null;
};

export type DuplicateSlideResponse = {
  ok: true;
  slideId: SlideId;
};

export type UpdateOrderRequest = {
  collection:
    | { type: 'draft' }
    | { type: 'folder'; folderId: string }
    | { type: 'deck'; deckId: string };
  slideIds: string[];
};

export type DeleteSlideResponse = {
  ok: true;
};

export type UpdateOrderResponse = {
  ok: true;
  collectionKey: string;
  slideIds: SlideId[];
};

export type CreateFolderRequest = {
  name: string;
  icon: FolderIcon;
};

export type UpdateFolderRequest = {
  name?: string;
  icon?: FolderIcon;
};

export type CreateDeckRequest = {
  name: string;
  description?: string;
  theme?: string;
};

export type UpdateDeckRequest = Partial<CreateDeckRequest>;

export type DeleteCollectionResponse = {
  ok: true;
};

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
