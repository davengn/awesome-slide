import { FilePlus, FileText, Layout, ListOrdered, Palette } from 'lucide-react';
import type React from 'react';
import type {
  AgentEditProposal,
  GeneratedFileSummary,
  GeneratedFileSummaryItem,
  OperationKind,
} from '../../lib/agent-chat-types.ts';

interface FilesFromTurnProps {
  proposal?: AgentEditProposal;
  summary?: GeneratedFileSummary;
}

const KIND_METADATA: Record<
  OperationKind,
  { icon: React.FC<{ className?: string }>; label: string; colorClass: string }
> = {
  'patch-slide-source': {
    icon: FileText,
    label: 'Modified file',
    colorClass: 'bg-blue-50/70 text-blue-700 border-blue-100/40',
  },
  'raw-patch': {
    icon: FileText,
    label: 'Patched file',
    colorClass: 'bg-blue-50/70 text-blue-700 border-blue-100/40',
  },
  'patch-slide-metadata': {
    icon: FileText,
    label: 'Metadata updated',
    colorClass: 'bg-indigo-50/70 text-indigo-700 border-indigo-100/40',
  },
  'update-speaker-notes': {
    icon: FileText,
    label: 'Notes updated',
    colorClass: 'bg-amber-50/70 text-amber-700 border-amber-100/40',
  },
  'apply-theme': {
    icon: Palette,
    label: 'Theme applied',
    colorClass: 'bg-purple-50/70 text-purple-700 border-purple-100/40',
  },
  'create-slide': {
    icon: FilePlus,
    label: 'Slide created',
    colorClass: 'bg-emerald-50/70 text-emerald-700 border-emerald-100/40',
  },
  'reorder-pages': {
    icon: ListOrdered,
    label: 'Slides reordered',
    colorClass: 'bg-cyan-50/70 text-cyan-700 border-cyan-100/40',
  },
  'update-deck': {
    icon: Layout,
    label: 'Deck updated',
    colorClass: 'bg-teal-50/70 text-teal-700 border-teal-100/40',
  },
};

function itemsFromProposal(proposal: AgentEditProposal): GeneratedFileSummaryItem[] {
  return proposal.operations.map((operation) => ({
    operationId: operation.id,
    operationKind: operation.kind,
    path: operation.target,
    target: operation.target,
    summary: operation.description,
  }));
}

export const FilesFromTurn: React.FC<FilesFromTurnProps> = ({ proposal, summary }) => {
  const items = summary?.files ?? (proposal ? itemsFromProposal(proposal) : []);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 font-sans select-none">
      <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
        Modified in this turn
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const meta = KIND_METADATA[item.operationKind] || {
            icon: FileText,
            label: 'Operation',
            colorClass: 'bg-neutral-50 text-neutral-700 border-neutral-100',
          };
          const Icon = meta.icon;

          return (
            <div
              key={`${item.operationId}-${item.path}`}
              className={`flex items-center gap-1.5 border rounded-lg px-2 py-1 text-[10px] font-medium leading-none ${meta.colorClass}`}
              title={`${meta.label}: ${item.path}`}
            >
              <Icon className="h-3 w-3 stroke-[2]" />
              <span className="max-w-[120px] truncate">{item.path || item.target || 'target'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
