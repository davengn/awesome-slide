import { cn } from '@/lib/utils';
import type { FolderIcon } from '../../lib/sdk';
import { FolderIconChip } from './folder-item';

export function MobileFolderPill({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: FolderIcon;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}, ${count} items`}
      title={label}
      className={cn(
        'flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1 text-[11.5px] font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background shadow-edge'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <FolderIconChip icon={icon} className="size-3.5 text-sm" />
      <span className="max-w-[8rem] truncate">{label}</span>
      <span
        className={cn(
          'nums inline-flex min-w-7 justify-center rounded-full border px-1.5 py-0.5 font-mono text-[10px]',
          active
            ? 'border-background/20 text-background/80'
            : 'border-border text-muted-foreground',
        )}
      >
        {count.toString().padStart(2, '0')}
      </span>
    </button>
  );
}
