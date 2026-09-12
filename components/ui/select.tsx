"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Context ──────────────────────────────────────────────────────────────────

interface SelectCtx {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
}

const Ctx = React.createContext<SelectCtx | null>(null);
const useCtx = () => {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("Select compound used outside <Select>");
  return c;
};

// ─── Select root ──────────────────────────────────────────────────────────────

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

function Select({ value: ctrl, defaultValue = "", onValueChange, children, disabled }: SelectProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const [open, setOpen]         = React.useState(false);
  const [query, setQuery]       = React.useState("");
  const triggerRef              = React.useRef<HTMLButtonElement>(null);

  const value = ctrl !== undefined ? ctrl : internal;

  const handleChange = (v: string) => {
    if (ctrl === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <Ctx.Provider value={{ value, onValueChange: handleChange, open, setOpen, query, setQuery, triggerRef, disabled }}>
      <div className="relative w-full" data-disabled={disabled || undefined}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

// ─── SelectValue ──────────────────────────────────────────────────────────────

function SelectValue({ placeholder = "Select…", className }: { placeholder?: string; className?: string }) {
  return <span data-slot="select-value" data-placeholder={placeholder} className={className} />;
}

// ─── SelectTrigger ────────────────────────────────────────────────────────────

interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "default";
  id?: string;
  displayValue?: string;
  disabled?: boolean;
}

function SelectTrigger({ children, className, size = "default", id, displayValue, disabled: propDisabled }: SelectTriggerProps) {
  const { value, open, setOpen, triggerRef, disabled: ctxDisabled } = useCtx();
  const isDisabled = propDisabled ?? ctxDisabled ?? false;

  // Extract placeholder from SelectValue child
  let placeholder = "Select…";
  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type === SelectValue) {
      placeholder = (child.props as any).placeholder ?? placeholder;
    }
  });

  // Use displayValue if provided, otherwise fall back to raw value
  const shown = displayValue ?? (value ? value : placeholder);

  return (
    <button
      ref={triggerRef}
      id={id}
      type="button"
      disabled={isDisabled}
      onClick={() => !isDisabled && setOpen(!open)}
      className={cn(
        "w-full flex items-center justify-between gap-2 text-left",
        "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-xl px-3.5",
        "transition-all duration-200 outline-none",
        "hover:border-[#0f3d2e] hover:bg-white",
        "focus-visible:border-[#0f3d2e] focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25",
        open && "border-[#0f3d2e] bg-white",
        size === "default" ? "h-11 text-sm" : "h-9 text-xs rounded-lg",
        isDisabled && "opacity-50 cursor-not-allowed hover:border-[#1a7a52] hover:bg-[#f4f7f5] pointer-events-none",
        className,
      )}
    >
      <span className={cn("flex-1 truncate", !value && "text-slate-400")}>
        {shown}
      </span>
      <ChevronDown className={cn(
        "w-4 h-4 text-[#1a7a52] shrink-0 transition-transform duration-200",
        open && "rotate-180"
      )} />
    </button>
  );
}

// ─── SelectContent (portal-based) ─────────────────────────────────────────────

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
  sideOffset?: number;
  align?: string;
  alignOffset?: number;
  alignItemWithTrigger?: boolean;
}

function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen, query, setQuery, triggerRef } = useCtx();
  const searchRef  = React.useRef<HTMLInputElement>(null);
  const dropRef    = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

  // Position dropdown below trigger
  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top:   r.bottom + window.scrollY + 6,
      left:  r.left   + window.scrollX,
      width: r.width,
    });
  }, [open, triggerRef]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        dropRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) return;
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen, setQuery, triggerRef]);

  // Close on scroll / resize
  React.useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setQuery(""); };
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open, setOpen, setQuery]);

  // Focus search on open
  React.useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  if (!open) return null;

  // Collect all items for filtering
  const allItems: Array<{ value: string; label: string }> = [];
  const collectItems = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, child => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectItem) {
        allItems.push({
          value: (child.props as any).value,
          label: String((child.props as any).children ?? ""),
        });
      } else if ((child.props as any)?.children) {
        collectItems((child.props as any).children);
      }
    });
  };
  collectItems(children);

  const filtered = query.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;
  const filteredSet = new Set(filtered.map(i => i.value));

  const renderFiltered = (nodes: React.ReactNode): React.ReactNode =>
    React.Children.map(nodes, child => {
      if (!React.isValidElement(child)) return child;
      if (child.type === SelectItem) {
        return filteredSet.has((child.props as any).value) ? child : null;
      }
      if ((child.props as any)?.children) {
        const inner = renderFiltered((child.props as any).children);
        return React.cloneElement(child as React.ReactElement<any>, {}, inner);
      }
      return child;
    });

  const dropdown = (
    <div
      ref={dropRef}
      style={{
        position: "absolute",
        top:      pos.top,
        left:     pos.left,
        width:    Math.max(pos.width, 220),
        zIndex:   9999,
      }}
      className={cn(
        "bg-white rounded-2xl border border-[#d4e8dc]",
        "shadow-[0_8px_40px_rgba(20,92,63,0.18),0_2px_8px_rgba(20,92,63,0.1)]",
        "overflow-hidden",
        className,
      )}
    >
      {/* Search */}
      <div className="p-2 border-b border-[#e8f5ee]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a7a6a]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 h-9 rounded-xl text-sm bg-[#f4f7f5] border border-[#c8e6d8] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1a7a52] focus:ring-2 focus:ring-[#1a7a52]/20 transition-all"
          />
        </div>
      </div>

      {/* Options */}
      <div className="overflow-y-auto p-1.5" style={{ maxHeight: 260 }}>
        {filtered.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-slate-400">No results</div>
        ) : (
          renderFiltered(children)
        )}
      </div>

      {query && (
        <div className="px-3 py-1.5 border-t border-[#e8f5ee] text-[10px] text-[#5a7a6a] font-medium">
          {filtered.length} of {allItems.length} results
        </div>
      )}
    </div>
  );

  return ReactDOM.createPortal(dropdown, document.body);
}

// ─── SelectItem ───────────────────────────────────────────────────────────────

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function SelectItem({ value: itemValue, children, className, disabled }: SelectItemProps) {
  const { value, onValueChange } = useCtx();
  const isSelected = value === itemValue;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onValueChange(itemValue)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
        "transition-all duration-150",
        "whitespace-normal break-words",
        isSelected
          ? "bg-[#e8f5ee] text-[#145c3f]"
          : "text-slate-700 hover:bg-[#f0fdf7] hover:text-[#145c3f]",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      <span className="flex-1 text-sm font-medium leading-snug">{children}</span>
      {isSelected && <Check className="w-4 h-4 text-[#145c3f] shrink-0" />}
    </button>
  );
}

// ─── Stub components ──────────────────────────────────────────────────────────

function SelectGroup({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn("p-1", className)}>{children}</div>;
}

function SelectLabel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5a7a6a]", className)}>
      {children}
    </div>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1.5 h-px bg-[#e8f5ee] -mx-1", className)} />;
}

function SelectScrollUpButton()   { return null; }
function SelectScrollDownButton() { return null; }

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
