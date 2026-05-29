import { Check, Loader2, ShieldAlert, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { AgentEditProposal } from '../../lib/agent-chat-types.ts';
import { cn } from '../../lib/utils.ts';
import { Button } from '../ui/button.tsx';

interface ProposalControlsProps {
  proposal: AgentEditProposal;
  selectedOperationIds: string[];
  isApplying: boolean;
  onApply: () => void;
  onReject: () => void;
}

export const ProposalControls: React.FC<ProposalControlsProps> = ({
  proposal,
  selectedOperationIds,
  isApplying,
  onApply,
  onReject,
}) => {
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);

  const hasHighRisk =
    proposal.riskLevel === 'high' || proposal.operations.some((op) => op.requiresConfirmation);
  const validationStatus = proposal.validation.status;
  const isCappedOrConflict = validationStatus === 'conflict' || validationStatus === 'invalid';
  const isAppliedOrRejected = proposal.state === 'applied' || proposal.state === 'rejected';

  const canApply =
    !isCappedOrConflict &&
    !isAppliedOrRejected &&
    selectedOperationIds.length > 0 &&
    (!hasHighRisk || confirmedRisk) &&
    !isApplying;

  if (isAppliedOrRejected) {
    return (
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-center text-xs font-semibold text-neutral-500">
        {proposal.state === 'applied' && '✓ Proposal Applied'}
        {proposal.state === 'rejected' && '✕ Proposal Rejected'}
      </div>
    );
  }

  const applyText =
    selectedOperationIds.length === proposal.operations.length
      ? 'Apply All'
      : `Apply Selected (${selectedOperationIds.length})`;

  const handleApplyClick = () => {
    if (hasHighRisk) {
      setShowDoubleConfirm(true);
    } else {
      onApply();
    }
  };

  const handleConfirmDouble = () => {
    setShowDoubleConfirm(false);
    onApply();
  };

  return (
    <div className="relative flex flex-col gap-3 p-4 border-t border-neutral-200 bg-neutral-50/50">
      {/* High-Risk Double Confirmation Modal Overlay */}
      {showDoubleConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-40 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5 text-xs flex-1">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-2 w-full overflow-hidden">
              <span className="font-bold text-red-900 text-sm">Confirm High-Risk Changes</span>
              <p className="text-neutral-600 leading-normal">
                You are about to apply high-risk changes across multiple slides or layouts. This
                cannot be undone.
              </p>

              <div className="border border-neutral-200 rounded-lg p-2 bg-neutral-50 max-h-24 overflow-y-auto space-y-1.5 w-full">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Affected Targets
                </span>
                {Array.from(new Set(proposal.operations.map((op) => op.target))).map((target) => (
                  <div key={target} className="text-[11px] font-mono text-neutral-700 truncate">
                    • {target}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowDoubleConfirm(false)}
              className="flex-1 text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmDouble}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs h-8 cursor-pointer border border-red-600"
            >
              Confirm & Apply
            </Button>
          </div>
        </div>
      )}

      {/* High Risk Confirmation */}
      {hasHighRisk && !isCappedOrConflict && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5 text-amber-900 leading-normal">
              <span className="font-semibold">High-Risk Operations</span>
              <span>
                This proposal includes changes that modify global theme definitions or narrative
                layouts. Please confirm you want to proceed.
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedRisk}
                onChange={(e) => setConfirmedRisk(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 size-3.5 shrink-0 accent-amber-600"
              />
              <span className="font-medium text-amber-900">
                I understand and want to apply these changes
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isApplying}
          className="flex-1 border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 h-9 text-xs"
        >
          <X className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          Reject
        </Button>
        <Button
          variant="default"
          onClick={handleApplyClick}
          disabled={!canApply}
          className={cn(
            'flex-[2] h-9 text-xs transition-all duration-200',
            canApply && !isApplying
              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
              : 'bg-neutral-200 text-neutral-400 border border-neutral-200 cursor-not-allowed',
          )}
        >
          {isApplying ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 shrink-0" />
              {applyText}
            </>
          )}
        </Button>
      </div>

      {/* Conflict / Error Banner */}
      {isCappedOrConflict && (
        <div className="text-[11px] text-red-600 text-center font-medium leading-normal">
          {validationStatus === 'conflict'
            ? 'Cannot apply: files have been modified since this proposal was generated.'
            : 'Cannot apply: proposal contains syntax or metadata validation errors.'}
        </div>
      )}
    </div>
  );
};
