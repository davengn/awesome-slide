import type React from 'react';
import { cn } from '../../lib/utils.ts';
import { AgentChatPanel } from './AgentChatPanel.tsx';

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slideId?: string;
}

export const AgentChatDrawer: React.FC<AgentChatDrawerProps> = ({ isOpen, onClose, slideId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div
        className={cn(
          'relative h-full w-[380px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out transform translate-x-0',
        )}
      >
        <AgentChatPanel onClose={onClose} slideId={slideId} />
      </div>
    </div>
  );
};
