import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SlideRecord } from '@/lib/sdk';

type DeleteConfirmDialogProps = {
  slide: SlideRecord | null;
  open: boolean;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function DeleteConfirmDialog({
  slide,
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete slide</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-[13px]">
          <p className="text-muted-foreground">
            Delete <span className="font-medium text-foreground">{slide?.title ?? slide?.id}</span>?
          </p>
          {slide && (
            <p className="rounded-md bg-muted px-3 py-2 font-mono text-[12px] text-muted-foreground">
              {slide.id}
            </p>
          )}
          <p className="text-muted-foreground">Recovery depends on your project history.</p>
          {error && <p className="text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={pending || !slide} onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
