import type React from 'react';
import type { SelectedElementDescriptor } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { AgentChatPanel } from './AgentChatPanel.tsx';

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slideId?: string;
  slideContext?: { id: string; title?: string; pageIndex?: number; pageCount?: number };
  selectedElements?: SelectedElementDescriptor[];
  notes?: string;
  seedPrompt?: string;
  collection?: { folderId?: string; deckId?: string; slideIds?: string[] };
  onOpenSettings?: () => void;
}

export const AgentChatDrawer: React.FC<AgentChatDrawerProps> = ({
  isOpen,
  onClose,
  slideId,
  slideContext,
  selectedElements,
  notes,
  seedPrompt,
  collection,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
        role="presentation"
      />

      {/* Drawer content */}
      <div
        className={cn(
          'relative h-full w-[380px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out transform translate-x-0',
        )}
      >
        <AgentChatPanel
          onClose={onClose}
          slideId={slideId}
          slideContext={slideContext}
          selectedElements={selectedElements}
          notes={notes}
          seedPrompt={seedPrompt}
          collection={collection}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </div>
  );
};
