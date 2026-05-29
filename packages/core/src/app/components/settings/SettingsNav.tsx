import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  ImageIcon,
  Languages,
  Link2,
  Palette,
  Plug,
  Settings2,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { SettingsModalState } from '@/lib/agent-connection-types';
import { cn } from '@/lib/utils';

type SettingsSection = SettingsModalState['activeSection'];

type SettingsNavItem = {
  id: SettingsSection;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'execution-model',
    label: 'Configure execution mode',
    detail: 'Local CLI / BYOK',
    icon: SlidersHorizontal,
  },
  {
    id: 'media-providers',
    label: 'Media providers',
    detail: 'Image / video / audio',
    icon: ImageIcon,
  },
  {
    id: 'connectors',
    label: 'Connectors',
    detail: 'External systems',
    icon: Plug,
  },
  {
    id: 'mcp-server',
    label: 'MCP server',
    detail: 'Expose Awesome Slide',
    icon: Link2,
  },
  {
    id: 'external-mcp',
    label: 'External MCP',
    detail: 'Third-party tools',
    icon: Settings2,
  },
  {
    id: 'language',
    label: 'Language',
    detail: 'Interface language',
    icon: Languages,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    detail: 'Light / dark / system',
    icon: Sun,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    detail: 'Completion alerts',
    icon: Bell,
  },
];

export function SettingsNav({
  activeSection,
  onSectionChange,
  ariaLabel,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="min-w-0">
      <div className="flex gap-1 overflow-x-auto border-b border-hairline bg-muted/35 p-2 md:grid md:gap-1 md:overflow-visible md:border-r md:border-b-0 md:p-3">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'grid min-w-[176px] grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-transparent px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/35 md:min-w-0',
                active
                  ? 'border-brand/55 bg-background text-foreground shadow-edge'
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-[6px]',
                  active ? 'bg-brand/10 text-brand' : 'bg-background text-muted-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold leading-tight">
                  {item.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                  {item.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function PlaceholderSettingsSection({ section }: { section: SettingsSection }) {
  const label = SETTINGS_NAV_ITEMS.find((item) => item.id === section)?.label ?? 'Settings';
  return (
    <div className="grid min-h-[260px] place-items-center rounded-[8px] border border-dashed border-hairline bg-muted/35 px-6 text-center">
      <div className="max-w-xs">
        <Palette className="mx-auto size-5 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-[13px] font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          This section is reserved for the shared settings surface.
        </p>
      </div>
    </div>
  );
}
