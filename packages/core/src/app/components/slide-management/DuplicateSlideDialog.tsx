import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DuplicateSlideRequest, SlideRecord } from '@/lib/sdk';

type DuplicateSlideDialogProps = {
  slide: SlideRecord | null;
  open: boolean;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: DuplicateSlideRequest) => Promise<void>;
};

export function DuplicateSlideDialog({
  slide,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: DuplicateSlideDialogProps) {
  const [newId, setNewId] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open) return;
    setNewId('');
    setTitle(slide ? `${slide.title} (copy)` : '');
  }, [open, slide]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Duplicate slide</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="New slide ID">
            <input
              value={newId}
              onChange={(event) => setNewId(event.target.value)}
              aria-label="New slide ID"
              className="h-10 w-full rounded-md border border-hairline bg-muted px-3 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>
          <Field label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              aria-label="Title"
              className="h-10 w-full rounded-md border border-hairline bg-muted px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </Field>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={pending || !slide}
            onClick={() =>
              onConfirm({
                newId: newId.trim() || undefined,
                title: title.trim() || undefined,
              })
            }
          >
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
