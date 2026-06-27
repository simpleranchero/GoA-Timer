import { useRef, useCallback } from 'react';

export function useTap(
  onSingleTap: () => void,
  onDoubleTap: () => void,
  delay = 300,
) {
  const singleRef = useRef(onSingleTap);
  const doubleRef = useRef(onDoubleTap);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  singleRef.current = onSingleTap;
  doubleRef.current = onDoubleTap;

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const now = Date.now();
    if (now - lastTapRef.current < delay) {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current);
        pendingRef.current = null;
      }
      lastTapRef.current = 0;
      doubleRef.current();
    } else {
      lastTapRef.current = now;
      pendingRef.current = setTimeout(() => {
        pendingRef.current = null;
        singleRef.current();
      }, delay);
    }
  }, [delay]);

  return { onPointerUp };
}
