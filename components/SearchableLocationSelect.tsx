'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, Search, X } from 'lucide-react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Input } from '@/components/ui/input';
import { normalizeSearchText } from '@/countrystatecity-npm/src/search';

interface LocationOption {
  id: number;
  name: string;
}

interface SearchableLocationSelectProps<T extends LocationOption> {
  id: string;
  label: string;
  items: T[];
  value: T | null;
  search: string;
  placeholder: string;
  allItemsLabel?: string;
  active?: boolean;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onValueChange: (value: T | null) => void;
  getSearchText?: (item: T) => string;
  getItemLabel?: (item: T) => string;
  formatValue?: (item: T) => string;
  renderLeading?: (item: T, index: number) => ReactNode;
  renderDescription?: (item: T) => ReactNode;
  renderTrailing?: (item: T) => ReactNode;
  emptyMessage: (query: string) => string;
}

export default function SearchableLocationSelect<T extends LocationOption>({
  id,
  label,
  items,
  value,
  search,
  placeholder,
  allItemsLabel = 'All options',
  active = false,
  disabled = false,
  onSearchChange,
  onValueChange,
  getSearchText = (item) => item.name,
  getItemLabel = (item) => item.name,
  formatValue,
  renderLeading,
  renderDescription,
  renderTrailing,
  emptyMessage,
}: SearchableLocationSelectProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  const filteredItems = useMemo(() => {
    // Fold diacritics so "Turkiye" finds Türkiye and "Kadikoy" finds Kadıköy.
    const query = normalizeSearchText(search);
    if (!query) return items;
    return items.filter((item) => normalizeSearchText(getSearchText(item)).includes(query));
  }, [getSearchText, items, search]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [search, items]);

  useEffect(() => {
    if (!open) return;
    listboxRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectItem = (item: T) => {
    onValueChange(item);
    onSearchChange('');
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (filteredItems.length === 0) return 0;
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        if (!open) return direction === 1 ? 0 : filteredItems.length - 1;
        return (current + direction + filteredItems.length) % filteredItems.length;
      });
      return;
    }

    if (event.key === 'Enter' && open && filteredItems[activeIndex]) {
      event.preventDefault();
      selectItem(filteredItems[activeIndex]);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`explorer-field explorer-combobox ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
    >
      <label htmlFor={id}>
        {label}
        {value ? <Check aria-hidden="true" /> : null}
      </label>
      <div className="explorer-input-wrap">
        <Search aria-hidden="true" />
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            open && filteredItems[activeIndex]
              ? `${listboxId}-option-${filteredItems[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={value ? (formatValue?.(value) ?? getItemLabel(value)) : search}
          onFocus={(event) => {
            setOpen(true);
            if (value) event.currentTarget.select();
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onSearchChange(event.target.value);
            if (value) onValueChange(null);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="explorer-input"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onValueChange(null);
              onSearchChange('');
              setOpen(true);
              window.requestAnimationFrame(() => inputRef.current?.focus());
            }}
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {open && !disabled ? (
          <m.div
            ref={listboxRef}
            id={listboxId}
            className="explorer-results"
            role="listbox"
            aria-label={`${label} results`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.995 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="explorer-results-summary" aria-hidden="true">
              <span>{search ? 'Search results' : allItemsLabel}</span>
              <code>{filteredItems.length.toString().padStart(2, '0')}</code>
            </div>
            {filteredItems.map((item, index) => (
              <button
                id={`${listboxId}-option-${item.id}`}
                type="button"
                role="option"
                aria-selected={value?.id === item.id}
                data-option-index={index}
                key={item.id}
                onPointerMove={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectItem(item)}
                className={`explorer-result ${activeIndex === index ? 'is-highlighted' : ''}`}
              >
                {activeIndex === index ? (
                  <m.i className="explorer-result-active" layoutId={`${id}-active-result`} />
                ) : null}
                <span className="explorer-result-symbol">
                  {renderLeading?.(item, index) ?? String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <strong>{getItemLabel(item)}</strong>
                  {(() => {
                    const description = renderDescription?.(item);
                    return description ? <small>{description}</small> : null;
                  })()}
                </span>
                <code>{renderTrailing?.(item)}</code>
              </button>
            ))}
            {filteredItems.length === 0 ? (
              <p className="explorer-empty">{emptyMessage(search)}</p>
            ) : null}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
