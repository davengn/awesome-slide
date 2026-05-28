import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Deck, Folder, ManagementMode, SlideMetadataPatch, SlideRecord } from '@/lib/sdk';

type SlideInspectorProps = {
  slide: SlideRecord | null;
  folders: Folder[];
  decks: Deck[];
  mode: ManagementMode;
  onClose: () => void;
  onSave: (slideId: string, patch: SlideMetadataPatch) => Promise<void>;
};

export function SlideInspector({
  slide,
  folders,
  decks,
  mode,
  onClose,
  onSave,
}: SlideInspectorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [theme, setTheme] = useState('');
  const [status, setStatus] = useState<SlideRecord['status']>('draft');
  const [notes, setNotes] = useState('');
  const [folderId, setFolderId] = useState('');
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slide) return;
    setTitle(slide.title);
    setDescription(slide.description ?? '');
    setTags(slide.tags.join(', '));
    setTheme(slide.theme ?? '');
    setStatus(slide.status);
    setNotes(slide.notes ?? '');
    setFolderId(slide.folderId ?? '');
    setDeckIds(slide.deckIds);
    setSaving(false);
    setError(null);
  }, [slide]);

  const sourceEditable = mode === 'editable' && slide?.sourceState === 'supported';
  const collectionEditable = mode === 'editable';

  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
    [tags],
  );

  if (!slide) {
    return null;
  }

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: SlideMetadataPatch = {
        folderId: folderId || null,
        deckIds,
      };
      if (sourceEditable) {
        patch.title = title.trim();
        patch.description = description.trim() || null;
        patch.tags = parsedTags;
        patch.theme = theme.trim() || null;
        patch.status = status;
        patch.notes = notes.trim() || null;
      }
      await onSave(slide.id, patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-hairline bg-background lg:w-[22rem]">
      <div className="flex min-h-14 items-center gap-3 border-b border-hairline px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[15px] font-semibold tracking-normal">
            {slide.title || slide.id}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">{slide.id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label="Close inspector"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!sourceEditable && (
          <div className="mb-4 rounded-md border border-hairline bg-muted p-3 text-[12px] text-muted-foreground">
            {sourceWarning(slide.sourceState, mode)}
          </div>
        )}

        <div className="grid gap-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!sourceEditable}
              maxLength={80}
              aria-label="Title"
              className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!sourceEditable}
              maxLength={280}
              rows={3}
              aria-label="Description"
              className="min-h-20 w-full resize-y rounded-md border border-hairline bg-muted px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>
          <Field label="Tags">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              disabled={!sourceEditable}
              aria-label="Tags"
              className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Theme">
              <input
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                disabled={!sourceEditable}
                aria-label="Theme"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as SlideRecord['status'])}
                disabled={!sourceEditable}
                aria-label="Status"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!sourceEditable}
              maxLength={2000}
              rows={5}
              aria-label="Notes"
              className="min-h-28 w-full resize-y rounded-md border border-hairline bg-muted px-3 py-2 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>

          <Field label="Folder">
            <select
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
              disabled={!collectionEditable}
              aria-label="Folder"
              className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] text-foreground outline-none disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="">Drafts</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">Decks</span>
            <div className="grid gap-1">
              {decks.map((deck) => (
                <label
                  key={deck.id}
                  className="flex min-h-9 items-center gap-2 rounded-sm bg-muted px-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    checked={deckIds.includes(deck.id)}
                    disabled={!collectionEditable}
                    onChange={(event) => {
                      setDeckIds((current) =>
                        event.target.checked
                          ? [...current, deck.id]
                          : current.filter((id) => id !== deck.id),
                      );
                    }}
                  />
                  <span className="min-w-0 truncate">{deck.name}</span>
                </label>
              ))}
              {decks.length === 0 && (
                <p className="rounded-sm bg-muted px-2 py-2 text-[12px] text-muted-foreground">
                  No decks
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-hairline p-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button size="sm" disabled={saving || mode !== 'editable'} onClick={save}>
          Save
        </Button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function sourceWarning(sourceState: SlideRecord['sourceState'], mode: ManagementMode): string {
  if (mode === 'readonly') return 'Editing requires the local dev server.';
  if (sourceState === 'readable-unsupported') {
    return 'Slide source uses an unsupported metadata shape.';
  }
  if (sourceState === 'parse-error') return 'Slide source cannot be parsed.';
  return 'Slide source file not found.';
}
