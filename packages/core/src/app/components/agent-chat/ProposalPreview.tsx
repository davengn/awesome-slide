import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { AgentEditProposal } from '../../lib/agent-chat-types.ts';
import { themes } from '../../lib/themes.ts';
import { cn } from '../../lib/utils.ts';

interface ProposalPreviewProps {
  proposal: AgentEditProposal;
  selectedOperationIds: string[];
  onToggleOperation: (opId: string) => void;
}

export const ProposalPreview: React.FC<ProposalPreviewProps> = ({
  proposal,
  selectedOperationIds,
  onToggleOperation,
}) => {
  const [expandedDiff, setExpandedDiff] = useState<Record<string, boolean>>({});

  const toggleDiff = (id: string) => {
    setExpandedDiff((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { validation, operations, previewArtifacts } = proposal;

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-neutral-50/50 border-t border-b border-neutral-200/80">
      {/* Validation Status */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Validation Report
        </div>
        <div
          className={cn(
            'flex items-start gap-2.5 p-3 rounded-lg border text-xs leading-relaxed',
            validation.status === 'valid' && 'bg-emerald-50 text-emerald-800 border-emerald-100',
            validation.status === 'invalid' && 'bg-red-50 text-red-800 border-red-100',
            validation.status === 'conflict' && 'bg-amber-50 text-amber-800 border-amber-100',
            validation.status === 'pending' && 'bg-neutral-50 text-neutral-800 border-neutral-200',
          )}
        >
          {validation.status === 'valid' && (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {validation.status === 'invalid' && (
            <XCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
          )}
          {validation.status === 'conflict' && (
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          )}
          {validation.status === 'pending' && (
            <Info className="h-4.5 w-4.5 text-neutral-500 shrink-0 mt-0.5" />
          )}

          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              {validation.status === 'valid' && 'All checks passed'}
              {validation.status === 'invalid' && 'Syntax or parsing error detected'}
              {validation.status === 'conflict' && 'File conflict detected'}
              {validation.status === 'pending' && 'Validation checks pending'}
            </span>
            <div className="flex flex-col gap-0.5 text-[11px] opacity-90">
              {validation.checks.map((check) => (
                <div key={check.id} className="flex items-center gap-1">
                  <span
                    className={cn(
                      'inline-block w-1.5 h-1.5 rounded-full shrink-0',
                      check.status === 'pass' && 'bg-emerald-500',
                      check.status === 'fail' && 'bg-red-500',
                      check.status === 'warn' && 'bg-amber-500',
                      check.status === 'skipped' && 'bg-neutral-400',
                    )}
                  />
                  <span>{check.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Operations Checklist */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          Proposed Operations
        </div>
        <div className="flex flex-col gap-1 bg-white border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100">
          {operations.map((op) => {
            const isSelected = selectedOperationIds.includes(op.id);
            const isConflict = op.validationState === 'conflict';
            const isInvalid = op.validationState === 'invalid';

            return (
              <label
                key={op.id}
                className={cn(
                  'flex items-start gap-3 p-3 text-xs cursor-pointer select-none transition-colors hover:bg-neutral-50/50',
                  !isSelected && 'bg-neutral-50/30 text-neutral-500',
                  (isConflict || isInvalid) && 'bg-red-50/30',
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isConflict || isInvalid}
                  onChange={() => onToggleOperation(op.id)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 mt-0.5 size-3.5 shrink-0 accent-neutral-900"
                />
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900">{op.description}</span>
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.2 rounded font-medium border uppercase shrink-0',
                        op.kind.startsWith('patch-slide')
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : op.kind === 'apply-theme'
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200',
                      )}
                    >
                      {op.kind.replace('patch-', '').replace('-slide', '').replace('slide-', '')}
                    </span>
                  </div>
                  <span className="text-[11px] opacity-75">Target: {op.target}</span>
                  {op.requiresConfirmation && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      ⚠️ Requires confirmation
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Preview Diffs & Demos */}
      {previewArtifacts.map((artifact) => {
        if (artifact.kind === 'source-diff' && artifact.inlineContent) {
          const isExpanded = expandedDiff[artifact.id] ?? true;
          return (
            <div
              key={artifact.id}
              className="flex flex-col border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleDiff(artifact.id)}
                className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <FileCode className="h-4 w-4 text-neutral-500" />
                  <span>Code Diff ({artifact.summary})</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {isExpanded && (
                <div className="p-3 bg-neutral-950 text-neutral-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[300px] overflow-y-auto">
                  {artifact.inlineContent.split('\n').map((line, idx) => {
                    const isAdded = line.startsWith('+');
                    const isRemoved = line.startsWith('-');
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: static rendering of code diff lines
                        key={idx}
                        className={cn(
                          'px-1.5 py-0.5 rounded-sm whitespace-pre',
                          isAdded &&
                            'bg-emerald-950/70 text-emerald-300 border-l-2 border-emerald-500',
                          isRemoved && 'bg-red-950/70 text-red-300 border-l-2 border-red-500',
                        )}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        if (artifact.kind === 'rendered-before-after') {
          const themeOp = operations.find((op) => op.kind === 'apply-theme');
          const payload = themeOp?.payload as { themeId?: string } | undefined;
          const themeId = payload?.themeId;
          const targetTheme = themes.find((t) => t.id === themeId);

          return (
            <div
              key={artifact.id}
              className="flex flex-col border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-sm p-3 gap-2.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                <Sparkles className="h-4 w-4 text-neutral-500" />
                <span>Visual Theme Preview</span>
              </div>
              <div className="text-[11px] text-neutral-500 leading-normal">{artifact.summary}</div>
              {targetTheme && (
                <div className="mt-1 flex items-center justify-between p-2 rounded border border-neutral-200 bg-neutral-50">
                  <div className="flex flex-col gap-0.5 max-w-[70%]">
                    <span className="text-xs font-bold text-neutral-800 truncate">
                      {targetTheme.name}
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate">
                      {targetTheme.description}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <div
                      className="w-4 h-4 rounded border border-neutral-300 shadow-sm"
                      style={{
                        backgroundColor:
                          targetTheme.body?.match(/--background:\s*([^;]+)/)?.[1]?.trim() ||
                          '#ffffff',
                      }}
                      title="Background"
                    />
                    <div
                      className="w-4 h-4 rounded border border-neutral-300 shadow-sm"
                      style={{
                        backgroundColor:
                          targetTheme.body?.match(/--primary:\s*([^;]+)/)?.[1]?.trim() || '#3b82f6',
                      }}
                      title="Primary"
                    />
                    <div
                      className="w-4 h-4 rounded border border-neutral-300 shadow-sm"
                      style={{
                        backgroundColor:
                          targetTheme.body?.match(/--foreground:\s*([^;]+)/)?.[1]?.trim() ||
                          '#000000',
                      }}
                      title="Foreground"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
