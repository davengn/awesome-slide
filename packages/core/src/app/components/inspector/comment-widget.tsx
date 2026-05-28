import { MessageSquare, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { format, plural, useLocale } from '@/lib/use-locale';
import { useInspector } from './inspector-provider';

export function CommentWidget() {
  const t = useLocale();
  const { comments, remove, error } = useInspector();
  const [open, setOpen] = useState(false);
  const count = comments.length;

  return (
    <div data-inspector-ui className="absolute right-4 bottom-4 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 rounded-md border border-hairline bg-popover shadow-floating animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <span className="font-heading text-[12px] font-semibold tracking-tight">
              {format(plural(count, t.inspector.commentsCount), { count })}
            </span>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
            >
              <X className="size-3.5" />
            </button>
          </div>
          {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t.inspector.commentsEmpty}
            </p>
          ) : (
            <>
              <ul className="max-h-72 overflow-auto">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 border-b border-hairline px-3 py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {format(t.inspector.commentLineLabel, { n: c.line })}
                      </div>
                      <div className="mt-0.5 text-xs break-words">{c.note}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      title={t.inspector.commentDeleteAria}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-hairline px-3 py-2 text-[11px] text-muted-foreground">
                {t.inspector.commentsApplyHintPrefix}
                <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-foreground">
                  /apply-comments
                </code>
                {t.inspector.commentsApplyHintSuffix}
              </div>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-hairline bg-popover px-3 text-[12px] font-medium shadow-floating hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        aria-label={t.inspector.commentsButtonAria}
      >
        <MessageSquare className="size-4" />
        {count}
      </button>
    </div>
  );
}
