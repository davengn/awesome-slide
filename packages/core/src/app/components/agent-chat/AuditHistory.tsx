import { Calendar, CheckCircle, History, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { AgentAuditEntry } from '../../lib/agent-chat-types.ts';
import { Button } from '../ui/button.tsx';

interface AuditHistoryProps {
  onClose: () => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<AgentAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/__agent-chat/audit')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit entries:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 bg-neutral-50 shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-neutral-800" />
          <h3 className="text-sm font-semibold text-neutral-800 font-sans">Audit History</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 hover:bg-neutral-200 text-neutral-500 rounded-lg cursor-pointer"
          aria-label="Close Audit History"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Audit List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-neutral-500">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-neutral-300 border-t-neutral-800" />
            <span className="text-xs">Loading audit logs...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
            <History className="h-8 w-8 stroke-[1.5]" />
            <span className="text-xs font-medium">No applied changes found in logs.</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 border border-neutral-200 rounded-xl bg-neutral-50/50 hover:bg-neutral-50 transition-colors duration-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-neutral-800 line-clamp-2">
                  {entry.prompt}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-neutral-100 pt-2 text-neutral-600">
                <div>
                  <span className="block font-medium text-neutral-400">Connection</span>
                  <span className="font-semibold text-neutral-700">
                    {entry.connection.displayName}
                  </span>
                </div>
                <div>
                  <span className="block font-medium text-neutral-400">Scope</span>
                  <span className="font-semibold text-neutral-700 capitalize">
                    {entry.contextSummary}
                  </span>
                </div>
              </div>

              {/* Modified Files */}
              {entry.appliedFiles && entry.appliedFiles.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Applied Files
                  </span>
                  <div className="space-y-1">
                    {entry.appliedFiles.map((file) => {
                      const baseName = file.split('/').pop() || file;
                      return (
                        <div
                          key={file}
                          className="flex items-center gap-1.5 text-xs text-neutral-700 bg-emerald-50/60 border border-emerald-100 rounded-lg p-1.5"
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate font-mono text-[10px]">{baseName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
