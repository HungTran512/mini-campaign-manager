import { useLayoutEffect, useRef } from 'react';

/** Focus page title for a11y after navigation (§5.9). */
export function usePageH1Focus(deps: ReadonlyArray<unknown>) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    ref.current?.focus();
  }, deps);
  return ref;
}
