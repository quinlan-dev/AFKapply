"use client";

// Searchable inputs for preferences: TagInput (multi-value chips) and
// AutocompleteInput (single value). Both filter a suggestion list as the
// user types instead of relying on placeholder text.

import { useMemo, useRef, useState } from "react";

function filterSuggestions(
  suggestions: string[],
  query: string,
  exclude: string[],
  showAllOnEmpty: boolean
): string[] {
  const q = query.trim().toLowerCase();
  const taken = new Set(exclude.map((v) => v.toLowerCase()));
  const pool = suggestions.filter((s) => !taken.has(s.toLowerCase()));
  if (!q) return showAllOnEmpty ? pool.slice(0, 8) : [];
  const starts = pool.filter((s) => s.toLowerCase().startsWith(q));
  const contains = pool.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, 8);
}

function Dropdown({
  items,
  activeIndex,
  onPick
}: {
  items: string[];
  activeIndex: number;
  onPick: (item: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-auto py-1">
      {items.map((s, i) => (
        <li key={s}>
          <button
            type="button"
            // mousedown fires before the input's blur, so the click isn't lost
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(s);
            }}
            className={`w-full text-left px-3 py-1.5 text-sm ${
              i === activeIndex ? "bg-accent/10 text-accent" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TagInput({
  value,
  onChange,
  suggestions,
  showAllOnFocus = false,
  max = 20,
  ariaLabel
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  /** Show top suggestions on click/focus even before typing (e.g. board recommendations). */
  showAllOnFocus?: boolean;
  max?: number;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => (open ? filterSuggestions(suggestions, query, value, showAllOnFocus) : []),
    [open, suggestions, query, value, showAllOnFocus]
  );

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setQuery("");
      return;
    }
    if (value.length >= max) return;
    onChange([...value, v]);
    setQuery("");
    setActiveIndex(-1);
  }

  function remove(item: string) {
    onChange(value.filter((x) => x !== item));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === ",") {
      if (query.trim() || (activeIndex >= 0 && items[activeIndex])) {
        e.preventDefault();
        add(activeIndex >= 0 && items[activeIndex] ? items[activeIndex] : query);
      } else if (e.key === "Enter" && open) {
        e.preventDefault();
      }
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <div
        className="input flex flex-wrap items-center gap-1.5 cursor-text !py-1.5 min-h-[38px]"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((item) => (
          <span key={item} className="chip bg-accent/10 text-accent !py-1 gap-1">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(item);
              }}
              className="hover:text-red-600 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          aria-label={ariaLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
            if (query.trim()) add(query);
          }}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-[90px] border-0 outline-none focus:ring-0 p-0 text-sm bg-transparent"
        />
      </div>
      {open && <Dropdown items={items} activeIndex={activeIndex} onPick={add} />}
    </div>
  );
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  showAllOnFocus = false,
  ariaLabel
}: {
  value: string;
  onChange: (next: string) => void;
  suggestions: string[];
  showAllOnFocus?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const items = useMemo(
    () => (open ? filterSuggestions(suggestions, value, [], showAllOnFocus) : []),
    [open, suggestions, value, showAllOnFocus]
  );

  function pick(item: string) {
    onChange(item);
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div className="relative">
      <input
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
          } else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            pick(items[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="input"
      />
      {open && <Dropdown items={items} activeIndex={activeIndex} onPick={pick} />}
    </div>
  );
}
