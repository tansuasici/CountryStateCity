'use client';

import { useCallback, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface UseTabListOptions {
  count: number;
  active: number;
  onChange: (index: number) => void;
  /** Vertical lists announce `aria-orientation` so arrow keys read correctly. */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Wires a set of buttons up as a real ARIA tab list: tab/panel id linkage,
 * roving tabindex, and Arrow/Home/End navigation. The home page has three of
 * these widgets, so the behaviour lives here instead of being repeated.
 */
export function useTabList({ count, active, onChange, orientation }: UseTabListOptions) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectAndFocus = useCallback(
    (index: number) => {
      const next = (index + count) % count;
      onChange(next);
      tabRefs.current[next]?.focus();
    },
    [count, onChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const targets: Record<string, number | undefined> = {
        ArrowRight: index + 1,
        ArrowDown: index + 1,
        ArrowLeft: index - 1,
        ArrowUp: index - 1,
        Home: 0,
        End: count - 1,
      };
      const next = targets[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectAndFocus(next);
    },
    [count, selectAndFocus]
  );

  const tabListProps = {
    role: 'tablist' as const,
    ...(orientation ? { 'aria-orientation': orientation } : {}),
  };

  const getTabProps = useCallback(
    (index: number) => ({
      id: `${baseId}-tab-${index}`,
      type: 'button' as const,
      role: 'tab' as const,
      'aria-selected': active === index,
      // Only the selected panel is mounted, so pointing inactive tabs at it
      // would leave dangling references.
      ...(active === index ? { 'aria-controls': `${baseId}-panel-${index}` } : {}),
      tabIndex: active === index ? 0 : -1,
      ref: (node: HTMLButtonElement | null) => {
        tabRefs.current[index] = node;
      },
      onClick: () => onChange(index),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index),
    }),
    [active, baseId, handleKeyDown, onChange]
  );

  /**
   * `focusable` gives keyboard users a way into panels that hold no focusable
   * content of their own; panels with their own controls should pass false.
   */
  const getPanelProps = useCallback(
    (index: number, { focusable = true }: { focusable?: boolean } = {}) => ({
      id: `${baseId}-panel-${index}`,
      role: 'tabpanel' as const,
      'aria-labelledby': `${baseId}-tab-${index}`,
      ...(focusable ? { tabIndex: 0 } : {}),
    }),
    [baseId]
  );

  return { tabListProps, getTabProps, getPanelProps };
}
