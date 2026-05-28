import { FileText } from 'lucide-react';
import { format, useLocale } from '@/lib/use-locale';
import type { PdfExportProgress } from '../lib/export-pdf';
import { Progress } from './ui/progress';

export function PdfProgressToast({ progress }: { progress: PdfExportProgress }) {
  const t = useLocale();
  const text =
    progress.phase === 'processing'
      ? format(t.pdfToast.processing, {
          current: progress.current.toString().padStart(2, '0'),
          total: progress.total.toString().padStart(2, '0'),
        })
      : progress.phase === 'printing'
        ? t.pdfToast.printing
        : t.pdfToast.done;

  return (
    <div className="relative flex w-80 items-start gap-3 overflow-hidden rounded-md border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-floating">
      <div className="absolute -right-16 -top-16 size-32 rounded-full bg-gradient-to-br from-[#6a4cf5]/15 via-[#d44df0]/10 to-transparent blur-xl pointer-events-none" />
      <FileText className="mt-0.5 size-3.5 shrink-0 text-brand z-10" />
      <div className="min-w-0 flex-1 z-10">
        <p className="font-heading text-[12.5px] font-semibold tracking-tight">
          {t.pdfToast.title}
        </p>
        <p className="truncate font-mono text-[10.5px] tracking-[0.04em] text-muted-foreground">
          {text}
        </p>
        <Progress
          value={Math.round(progress.percent)}
          className="mt-2 h-[3px] [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#6a4cf5] [&>[data-slot=progress-indicator]]:via-[#d44df0] [&>[data-slot=progress-indicator]]:to-[#ff7a3d]"
        />
      </div>
    </div>
  );
}
