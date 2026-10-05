"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  sub?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  clearable?: boolean;
  onSearchChange?: (query: string) => void;
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  id,
  clearable = false,
  onSearchChange,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const updateMenuPosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxWidth = Math.min(Math.max(rect.width, 360), window.innerWidth - 16);
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - maxWidth - 8),
      width: maxWidth,
      zIndex: 9999,
    });
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReflow = () => updateMenuPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      clearTimeout(t);
    };
  }, [open, updateMenuPosition]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  const dropdown = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        "bg-white rounded-2xl border border-[#d4e8dc]",
        "shadow-[0_12px_40px_rgba(20,92,63,0.18),0_4px_12px_rgba(20,92,63,0.1)]",
        "overflow-hidden",
      )}
    >
      <div className="p-2 border-b border-[#e8f5ee]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a7a6a]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full pl-9 pr-3 h-9 rounded-xl text-sm",
              "bg-[#f4f7f5] border border-[#c8e6d8]",
              "text-slate-800 placeholder:text-slate-400",
              "outline-none focus:border-[#1a7a52] focus:ring-2 focus:ring-[#1a7a52]/20",
            )}
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-72 p-1.5">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            No results for &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left",
                  "transition-all duration-150 group",
                  isSelected
                    ? "bg-[#e8f5ee] text-[#145c3f]"
                    : "text-slate-700 hover:bg-[#f0fdf7] hover:text-[#145c3f]",
                )}
              >
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {opt.sub && (
                    <span className={cn(
                      "self-start text-[10px] font-bold px-1.5 py-0.5 rounded-md max-w-full truncate",
                      isSelected
                        ? "bg-[#145c3f] text-white"
                        : "bg-[#e8f5ee] text-[#145c3f] group-hover:bg-[#d1f5e4]",
                    )}>
                      {opt.sub}
                    </span>
                  )}
                  <span className="text-sm font-medium leading-snug whitespace-normal break-words">
                    {opt.label}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#145c3f] shrink-0 mt-0.5" />}
              </button>
            );
          })
        )}
      </div>

      {query && (
        <div className="px-3 py-1.5 border-t border-[#e8f5ee] text-[10px] text-[#5a7a6a] font-medium">
          {filtered.length} of {options.length} results
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "h-11 px-3.5 rounded-xl text-sm",
          "bg-[#f4f7f5] border-2 border-[#1a7a52]",
          "text-left transition-all duration-200 outline-none",
          "hover:border-[#0f3d2e] hover:bg-white",
          "focus-visible:border-[#0f3d2e] focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25",
          open && "border-[#0f3d2e] bg-white ring-3 ring-[#1a7a52]/20",
          disabled && "opacity-50 cursor-not-allowed bg-slate-100",
          className,
        )}
      >
        <span className={cn("flex-1 min-w-0 truncate", !selected && "text-slate-400")}>
          {selected ? selected.label : placeholder}
        </span>

        <span className="flex items-center gap-1 shrink-0">
          {clearable && selected && (
            <span
              role="button"
              onClick={handleClear}
              className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-[#d4e8dc] text-slate-400 hover:text-[#145c3f] transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-[#1a7a52] transition-transform duration-200",
            open && "rotate-180"
          )} />
        </span>
      </button>

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
