import { useCallback, useEffect, useRef, useState } from 'react';
import type { SlideModule } from './sdk';
import { loadSlide, slideChangeIncludes } from './slides';

const SLIDE_CHANGED_EVENTS = ['awesome-slide:slide-changed', 'open-slide:slide-changed'] as const;

export function useSlideModule(slideId: string) {
  const [slide, setSlide] = useState<SlideModule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadSeqRef = useRef(0);

  const reload = useCallback(
    (reset: boolean) => {
      const seq = ++loadSeqRef.current;
      if (reset) setSlide(null);
      setError(null);
      loadSlide(slideId)
        .then((mod) => {
          if (seq === loadSeqRef.current) setSlide(mod);
        })
        .catch((e) => {
          if (seq === loadSeqRef.current) setError(String(e?.message ?? e));
        });
    },
    [slideId],
  );

  useEffect(() => {
    reload(true);
  }, [reload]);

  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return;
    let cancelled = false;
    const handler = (data: unknown) => {
      if (slideChangeIncludes(data, slideId)) {
        queueMicrotask(() => {
          if (!cancelled) reload(false);
        });
      }
    };
    for (const event of SLIDE_CHANGED_EVENTS) hot.on(event, handler);
    return () => {
      cancelled = true;
      for (const event of SLIDE_CHANGED_EVENTS) hot.off(event, handler);
    };
  }, [slideId, reload]);

  return { slide, error, reload };
}
