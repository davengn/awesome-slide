import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectSettingsEntry({
  id = 'project-settings-entry',
  className,
  onOpen,
}: {
  id?: string;
  className?: string;
  onOpen: (triggerId: string) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={() => onOpen(id)}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground outline-none transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30',
        className,
      )}
      aria-label="Open project settings"
      title="Project settings"
    >
      <Settings2 className="size-4" aria-hidden />
    </button>
  );
}
