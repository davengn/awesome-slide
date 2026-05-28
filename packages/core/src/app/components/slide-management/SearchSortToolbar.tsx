import { Grid2X2, List, PanelLeftOpen, Plus, RefreshCw, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SlideSortMode } from '@/lib/management';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

type SearchSortToolbarProps = {
  query: string;
  sortMode: SlideSortMode;
  viewMode: ViewMode;
  canCreate: boolean;
  refreshing: boolean;
  onQueryChange: (query: string) => void;
  onSortModeChange: (sortMode: SlideSortMode) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: () => void;
  onRefresh: () => void;
  onOpenSidebar: () => void;
};

export function SearchSortToolbar({
  query,
  sortMode,
  viewMode,
  canCreate,
  refreshing,
  onQueryChange,
  onSortModeChange,
  onViewModeChange,
  onCreate,
  onRefresh,
  onOpenSidebar,
}: SearchSortToolbarProps) {
  return (
    <div className="grid w-full gap-2 md:grid-cols-[minmax(16rem,1fr)_10rem_auto_auto_auto] md:items-center">
      <div className="flex gap-2 md:hidden">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label="Open collections"
          title="Open collections"
        >
          <PanelLeftOpen className="size-4" aria-hidden />
        </button>
        <ToolbarButton
          label="Refresh slides"
          onClick={onRefresh}
          className="ml-auto"
          disabled={refreshing}
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
        </ToolbarButton>
        <CreateButton canCreate={canCreate} onCreate={onCreate} />
      </div>

      <label className="flex h-10 min-w-0 items-center gap-2 rounded-full border border-hairline bg-background px-3 shadow-edge">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Search slides</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search title, ID, tag, folder, deck"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          type="search"
        />
      </label>

      <select
        value={sortMode}
        onChange={(event) => onSortModeChange(event.target.value as SlideSortMode)}
        className="h-10 rounded-full border border-hairline bg-background px-3 text-[13px] outline-none shadow-edge focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label="Sort slides"
      >
        <option value="manual">Manual</option>
        <option value="updated-desc">Updated newest</option>
        <option value="updated-asc">Updated oldest</option>
        <option value="created-desc">Created newest</option>
        <option value="created-asc">Created oldest</option>
        <option value="title-asc">Title A-Z</option>
        <option value="title-desc">Title Z-A</option>
      </select>

      <div className="grid h-10 grid-cols-2 rounded-full bg-muted p-1">
        <ViewButton
          active={viewMode === 'grid'}
          label="Grid view"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid2X2 className="size-4" aria-hidden />
        </ViewButton>
        <ViewButton
          active={viewMode === 'list'}
          label="List view"
          onClick={() => onViewModeChange('list')}
        >
          <List className="size-4" aria-hidden />
        </ViewButton>
      </div>

      <ToolbarButton
        label="Refresh slides"
        onClick={onRefresh}
        className="hidden md:inline-flex"
        disabled={refreshing}
      >
        <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden />
      </ToolbarButton>
      <div className="hidden md:block">
        <CreateButton canCreate={canCreate} onCreate={onCreate} />
      </div>
    </div>
  );
}

function CreateButton({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      disabled={!canCreate}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-medium text-background outline-none hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/30"
      title={canCreate ? 'Create slide' : 'Create requires the local dev server'}
    >
      <Plus className="size-4" aria-hidden />
      <span>Create</span>
    </button>
  );
}

function ToolbarButton({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-full bg-muted text-foreground outline-none hover:bg-muted/80 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring/30',
        className,
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ViewButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
        active
          ? 'bg-background text-foreground shadow-edge'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
