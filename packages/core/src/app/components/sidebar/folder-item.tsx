import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Folder, FolderIcon } from '@/lib/sdk';
import { useLocale } from '@/lib/use-locale';
import { cn } from '@/lib/utils';
import { IconPicker } from './icon-picker';

export const SLIDE_DND_MIME = 'application/x-slide-id';

function useSlideDragActive() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onStart = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes(SLIDE_DND_MIME)) setActive(true);
    };
    const onEnd = () => setActive(false);
    document.addEventListener('dragstart', onStart);
    document.addEventListener('dragend', onEnd);
    document.addEventListener('drop', onEnd);
    return () => {
      document.removeEventListener('dragstart', onStart);
      document.removeEventListener('dragend', onEnd);
      document.removeEventListener('drop', onEnd);
    };
  }, []);
  return active;
}

export function FolderIconChip({ icon, className }: { icon: FolderIcon; className?: string }) {
  if (icon.type === 'emoji') {
    return (
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center text-[15px] leading-none',
          className,
        )}
      >
        {icon.value}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-block size-3 rounded-[3px] ring-1 ring-foreground/15 shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]',
        className,
      )}
      style={{ background: icon.value }}
    />
  );
}

type Row =
  | {
      kind: 'folder';
      folder: Folder;
      onRename: (name: string) => void;
      onChangeIcon: (icon: FolderIcon) => void;
      onDelete: () => void;
    }
  | {
      kind: 'draft';
    }
  | {
      kind: 'themes';
    }
  | {
      kind: 'assets';
    };

export function FolderItem({
  row,
  count,
  selected,
  onSelect,
  onDropSlide,
}: {
  row: Row;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onDropSlide: (slideId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const [draftName, setDraftName] = useState(row.kind === 'folder' ? row.folder.name : '');
  const slideDragActive = useSlideDragActive();
  const t = useLocale();

  const acceptsSlideDrop = row.kind !== 'themes' && row.kind !== 'assets';
  const isSlideDrag = (e: React.DragEvent) =>
    acceptsSlideDrop && e.dataTransfer.types.includes(SLIDE_DND_MIME);
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    dragDepth.current += 1;
    if (dragDepth.current === 1) setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!isSlideDrag(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    if (!acceptsSlideDrop) return;
    const slideId = e.dataTransfer.getData(SLIDE_DND_MIME);
    dragDepth.current = 0;
    setDragOver(false);
    if (!slideId) return;
    e.preventDefault();
    onDropSlide(slideId);
  };

  const icon: FolderIcon =
    row.kind === 'draft'
      ? { type: 'emoji', value: '📝' }
      : row.kind === 'themes'
        ? { type: 'emoji', value: '🎨' }
        : row.kind === 'assets'
          ? { type: 'emoji', value: '🗂️' }
          : row.folder.icon;
  const label =
    row.kind === 'draft'
      ? t.home.draft
      : row.kind === 'themes'
        ? t.home.themes
        : row.kind === 'assets'
          ? t.home.assets
          : row.folder.name;

  const commitRename = () => {
    if (row.kind !== 'folder') return;
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== row.folder.name) row.onRename(trimmed);
    setRenaming(false);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop target wraps interactive children
    <div
      className={cn(
        'group relative grid min-h-[var(--sidebar-row-height)] grid-cols-[1.5rem_minmax(0,1fr)_var(--sidebar-count-width)] items-center gap-2 rounded-[var(--sidebar-row-radius)] px-2.5 text-[12.5px] transition-colors',
        selected
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        slideDragActive && acceptsSlideDrop && !dragOver && 'ring-1 ring-foreground/10',
        dragOver &&
          'bg-muted text-foreground ring-1 ring-foreground ring-offset-1 ring-offset-sidebar motion-safe:scale-[1.01] motion-safe:transition-transform',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {row.kind === 'folder' && import.meta.env.DEV ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded-full transition-transform hover:bg-sidebar-accent hover:scale-105"
              aria-label={t.home.changeIcon}
              onClick={(e) => e.stopPropagation()}
            >
              <FolderIconChip icon={icon} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-auto p-2">
            <IconPicker value={row.folder.icon} onChange={(next) => row.onChangeIcon(next)} />
          </PopoverContent>
        </Popover>
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center">
          <FolderIconChip icon={icon} />
        </span>
      )}

      {renaming && row.kind === 'folder' ? (
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setDraftName(row.folder.name);
              setRenaming(false);
            }
          }}
          maxLength={40}
          className="min-w-0 rounded-[3px] bg-card px-1 text-[12.5px] text-foreground outline-none ring-1 ring-foreground/20"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          title={label}
          className="min-w-0 truncate text-left"
        >
          {label}
        </button>
      )}

      <span
        className={cn(
          'nums ml-auto inline-flex min-w-[var(--sidebar-count-width)] shrink-0 justify-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] transition-opacity',
          selected
            ? 'border-sidebar-primary-foreground/20 text-sidebar-primary-foreground/80'
            : 'border-sidebar-border text-muted-foreground',
          row.kind === 'folder' &&
            import.meta.env.DEV &&
            'group-hover:opacity-0 group-has-[[aria-expanded=true]]:opacity-0',
        )}
      >
        {count.toString().padStart(2, '0')}
      </span>

      {row.kind === 'folder' && import.meta.env.DEV && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-2 top-1/2 size-6 -translate-y-1/2 rounded-full opacity-0 transition-opacity hover:bg-foreground/10 group-hover:opacity-100 aria-expanded:opacity-100"
              aria-label={t.home.folderActions}
            >
              <MoreHorizontal className="mx-auto size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem
              onSelect={() => {
                setDraftName(row.folder.name);
                setRenaming(true);
              }}
            >
              <Pencil />
              {t.common.rename}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => row.onDelete()}>
              <Trash2 />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
