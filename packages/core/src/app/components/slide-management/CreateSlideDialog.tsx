import { FilePlus2, Layers3, MessageSquare } from 'lucide-react';
import type { ElementType, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CreateSlideRequest, CreateSlideResponse, Deck, Folder } from '@/lib/sdk';
import { themes } from '@/lib/themes';
import { cn } from '@/lib/utils';

type CreateKind = CreateSlideRequest['kind'];

type CreateSlideDialogProps = {
  open: boolean;
  folders: Folder[];
  decks: Deck[];
  onOpenChange: (open: boolean) => void;
  onCreate: (request: CreateSlideRequest) => Promise<CreateSlideResponse>;
  onCreated: (response: CreateSlideResponse) => void;
};

const KIND_OPTIONS: Array<{ kind: CreateKind; label: string; icon: ElementType }> = [
  { kind: 'blank', label: 'Blank', icon: FilePlus2 },
  { kind: 'template', label: 'Template', icon: Layers3 },
  { kind: 'prompt', label: 'Prompt', icon: MessageSquare },
];

export function CreateSlideDialog({
  open,
  folders,
  decks,
  onOpenChange,
  onCreate,
  onCreated,
}: CreateSlideDialogProps) {
  const availableTemplates = useMemo(() => themes.filter((theme) => theme.hasDemo), []);
  const [kind, setKind] = useState<CreateKind>('blank');
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [deckId, setDeckId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind('blank');
    setTitle('');
    setId('');
    setTemplateId(availableTemplates[0]?.id ?? '');
    setFolderId('');
    setDeckId('');
    setPrompt('');
    setSubmitting(false);
    setError(null);
  }, [open, availableTemplates]);

  const generatedId = slugify(title);
  const effectiveId = id.trim() || generatedId;
  const canSubmit =
    title.trim().length > 0 &&
    effectiveId.length > 0 &&
    (kind !== 'template' || templateId.length > 0) &&
    (kind !== 'prompt' || prompt.trim().length > 0);

  const submit = async () => {
    if (!canSubmit) {
      setError('Missing required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await onCreate({
        kind,
        id: effectiveId,
        title: title.trim(),
        templateId: kind === 'template' ? templateId : undefined,
        theme: kind === 'template' ? templateId : undefined,
        folderId: folderId || undefined,
        deckId: deckId || undefined,
        prompt: kind === 'prompt' ? prompt.trim() : undefined,
      });
      onCreated(response);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create slide</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid grid-cols-3 gap-2 rounded-md bg-muted p-1">
            {KIND_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = kind === option.kind;
              return (
                <button
                  key={option.kind}
                  type="button"
                  onClick={() => setKind(option.kind)}
                  className={cn(
                    'inline-flex h-10 items-center justify-center gap-2 rounded-sm text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
                    active ? 'bg-background text-foreground shadow-edge' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                aria-label="Title"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </Field>
            <Field label="Slide ID">
              <input
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder={generatedId}
                aria-label="Slide ID"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </Field>
          </div>

          {kind === 'template' && (
            <Field label="Template">
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                aria-label="Template"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {availableTemplates.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {kind === 'prompt' && (
            <Field label="Prompt">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                maxLength={2000}
                aria-label="Prompt"
                className="min-h-28 w-full resize-y rounded-md border border-hairline bg-muted px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </Field>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Folder">
              <select
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                aria-label="Folder"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="">Drafts</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Deck">
              <select
                value={deckId}
                onChange={(event) => setDeckId(event.target.value)}
                aria-label="Deck"
                className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <option value="">None</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit || submitting} onClick={submit}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 text-[12px] font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </div>
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
