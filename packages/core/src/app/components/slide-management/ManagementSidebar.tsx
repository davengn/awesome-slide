import { Archive, Check, Folder, Layers3, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import logoUrl from '@/assets/awesome-slide.png';
import { ThemeToggle } from '@/components/theme-toggle';
import type { Deck, Folder as FolderRecord, SlideRecord } from '@/lib/sdk';
import { cn } from '@/lib/utils';

export type ManagementSelection =
  | { type: 'draft' }
  | { type: 'folder'; id: string }
  | { type: 'deck'; id: string };

type EditorState =
  | { type: 'folder' | 'deck'; mode: 'create'; name: string }
  | { type: 'folder' | 'deck'; mode: 'rename'; id: string; name: string };

type DeleteState = { type: 'folder' | 'deck'; id: string; name: string } | null;

type ManagementSidebarProps = {
  slides: SlideRecord[];
  folders: FolderRecord[];
  decks: Deck[];
  selection: ManagementSelection;
  canManage: boolean;
  onSelect: (selection: ManagementSelection) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onCreateDeck: (name: string) => Promise<void>;
  onRenameDeck: (deckId: string, name: string) => Promise<void>;
  onDeleteDeck: (deckId: string) => Promise<void>;
};

export function ManagementSidebar({
  slides,
  folders,
  decks,
  selection,
  canManage,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateDeck,
  onRenameDeck,
  onDeleteDeck,
}: ManagementSidebarProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const existingIds = new Set(slides.map((slide) => slide.id));
  const selectionKey = selection.type === 'draft' ? 'draft' : `${selection.type}:${selection.id}`;

  useEffect(() => {
    if (!selectionKey) return;
    setError(null);
    setDeleteTarget(null);
  }, [selectionKey]);

  const submitEditor = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (editor.mode === 'create' && editor.type === 'folder') await onCreateFolder(name);
      if (editor.mode === 'create' && editor.type === 'deck') await onCreateDeck(name);
      if (editor.mode === 'rename' && editor.type === 'folder') {
        await onRenameFolder(editor.id, name);
      }
      if (editor.mode === 'rename' && editor.type === 'deck') await onRenameDeck(editor.id, name);
      setEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPending(true);
    setError(null);
    try {
      if (deleteTarget.type === 'folder') await onDeleteFolder(deleteTarget.id);
      if (deleteTarget.type === 'deck') await onDeleteDeck(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-hairline bg-background md:w-[17rem]">
      <div className="flex min-h-14 items-center justify-between border-b border-hairline px-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Logo" className="size-6 rounded-md object-contain" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase text-muted-foreground leading-none">
              Collections
            </p>
            <h2 className="truncate font-heading text-[15px] font-semibold tracking-normal mt-0.5">
              Slide library
            </h2>
          </div>
        </div>
        <div className="-mr-1">
          <ThemeToggle />
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Slide collections">
        <CollectionButton
          icon={<Archive className="size-4" aria-hidden />}
          label="Drafts"
          count={slides.filter((slide) => !slide.folderId).length}
          active={selection.type === 'draft'}
          onClick={() => onSelect({ type: 'draft' })}
        />

        <SectionLabel
          label="Folders"
          canManage={canManage}
          onAdd={() => setEditor({ type: 'folder', mode: 'create', name: '' })}
        />
        {editor?.type === 'folder' && editor.mode === 'create' && (
          <InlineEditor
            label="New folder"
            value={editor.name}
            pending={pending}
            onChange={(name) => setEditor({ ...editor, name })}
            onCancel={() => setEditor(null)}
            onSubmit={submitEditor}
          />
        )}
        {folders.map((folder) =>
          editor?.type === 'folder' && editor.mode === 'rename' && editor.id === folder.id ? (
            <InlineEditor
              key={folder.id}
              label="Folder name"
              value={editor.name}
              pending={pending}
              onChange={(name) => setEditor({ ...editor, name })}
              onCancel={() => setEditor(null)}
              onSubmit={submitEditor}
            />
          ) : (
            <CollectionButton
              key={folder.id}
              icon={<Folder className="size-4" aria-hidden />}
              label={folder.name}
              count={slides.filter((slide) => slide.folderId === folder.id).length}
              active={selection.type === 'folder' && selection.id === folder.id}
              canManage={canManage}
              onClick={() => onSelect({ type: 'folder', id: folder.id })}
              onRename={() =>
                setEditor({ type: 'folder', mode: 'rename', id: folder.id, name: folder.name })
              }
              onDelete={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}
            />
          ),
        )}
        {folders.length === 0 && <EmptyLine label="No folders" />}

        <SectionLabel
          label="Decks"
          canManage={canManage}
          onAdd={() => setEditor({ type: 'deck', mode: 'create', name: '' })}
        />
        {editor?.type === 'deck' && editor.mode === 'create' && (
          <InlineEditor
            label="New deck"
            value={editor.name}
            pending={pending}
            onChange={(name) => setEditor({ ...editor, name })}
            onCancel={() => setEditor(null)}
            onSubmit={submitEditor}
          />
        )}
        {decks.map((deck) =>
          editor?.type === 'deck' && editor.mode === 'rename' && editor.id === deck.id ? (
            <InlineEditor
              key={deck.id}
              label="Deck name"
              value={editor.name}
              pending={pending}
              onChange={(name) => setEditor({ ...editor, name })}
              onCancel={() => setEditor(null)}
              onSubmit={submitEditor}
            />
          ) : (
            <CollectionButton
              key={deck.id}
              icon={<Layers3 className="size-4" aria-hidden />}
              label={deck.name}
              count={deck.slideOrder.filter((id) => existingIds.has(id)).length}
              active={selection.type === 'deck' && selection.id === deck.id}
              canManage={canManage}
              onClick={() => onSelect({ type: 'deck', id: deck.id })}
              onRename={() =>
                setEditor({ type: 'deck', mode: 'rename', id: deck.id, name: deck.name })
              }
              onDelete={() => setDeleteTarget({ type: 'deck', id: deck.id, name: deck.name })}
            />
          ),
        )}
        {decks.length === 0 && <EmptyLine label="No decks" />}

        {deleteTarget && (
          <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-[12px]">
            <p className="font-medium text-foreground">Delete {deleteTarget.name}?</p>
            <p className="mt-1 text-muted-foreground">
              Slides stay in the library. Folder assignments or deck membership are cleared.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-8 rounded-full px-3 text-[12px] text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="h-8 rounded-full bg-destructive px-3 text-[12px] font-medium text-destructive-foreground outline-none disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {error && <p className="px-2 py-2 text-[12px] text-destructive">{error}</p>}
      </nav>
    </aside>
  );
}

function SectionLabel({
  label,
  canManage,
  onAdd,
}: {
  label: string;
  canManage: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 pb-1 pt-4">
      <div className="min-w-0 flex-1 text-[10.5px] font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      {canManage && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label={`Create ${label.toLocaleLowerCase().slice(0, -1)}`}
          title={`Create ${label.toLocaleLowerCase().slice(0, -1)}`}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div className="px-2 py-2 text-[12px] text-muted-foreground">{label}</div>;
}

function CollectionButton({
  icon,
  label,
  count,
  active,
  canManage,
  onClick,
  onRename,
  onDelete,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  active: boolean;
  canManage?: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        'group mb-1 grid h-10 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md transition-colors',
        active ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="grid h-10 min-w-0 grid-cols-[1rem_minmax(0,1fr)_2.25rem] items-center gap-2 px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <span className={active ? 'text-background/80' : 'text-muted-foreground'}>{icon}</span>
        <span className="truncate font-medium text-[13px]">{label}</span>
        <span
          className={cn(
            'justify-self-end rounded-full px-2 py-0.5 text-[11px]',
            active ? 'bg-background/15 text-background' : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      </button>
      {canManage && onRename && onDelete && (
        <div className="mr-1 hidden items-center gap-0.5 group-hover:flex group-focus-within:flex">
          <button
            type="button"
            onClick={onRename}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              active
                ? 'text-background/80 hover:bg-background/15'
                : 'text-muted-foreground hover:bg-background',
            )}
            aria-label={`Rename ${label}`}
            title={`Rename ${label}`}
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              active
                ? 'text-background/80 hover:bg-background/15'
                : 'text-muted-foreground hover:bg-background hover:text-destructive',
            )}
            aria-label={`Delete ${label}`}
            title={`Delete ${label}`}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function InlineEditor({
  label,
  value,
  pending,
  onChange,
  onCancel,
  onSubmit,
}: {
  label: string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 rounded-md bg-muted p-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        maxLength={60}
        aria-label={label}
        className="h-8 min-w-0 rounded-sm border border-hairline bg-background px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending}
        className="inline-flex size-8 items-center justify-center rounded-full text-foreground outline-none hover:bg-background disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label="Save"
      >
        <Check className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label="Cancel"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
