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
  itemLabels: Map<string, string>;
  registerLabel: (val: string, label: string) => void;
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
  const [itemLabels, setItemLabels] = React.useState<Map<string, string>>(() => new Map());

  const value = ctrl !== undefined ? ctrl : internal;

  const registerLabel = React.useCallback((val: string, label: string) => {
    setItemLabels(prev => {
      if (prev.get(val) === label) return prev;
      const next = new Map(prev);
      next.set(val, label);
      return next;
    });
  }, []);

  // Pre-collect static children mappings
  React.useEffect(() => {
    const map = new Map<string, string>();
    const collect = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, child => {
        if (!React.isValidElement(child)) return;
        if (child.type === SelectItem) {
          const v = String((child.props as any).value ?? "");
          const raw = (child.props as any).children;
          let label = "";
          if (typeof raw === "string" || typeof raw === "number") {
            label = String(raw);
          } else if (Array.isArray(raw)) {
            label = raw.map(c => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("").trim();
          }
          if (v && label) {
            map.set(v, label);
          }
        } else if ((child.props as any)?.children) {
          collect((child.props as any).children);
        }
      });
    };
    collect(children);
    if (map.size > 0) {
      setItemLabels(prev => {
        let changed = false;
        const next = new Map(prev);
        map.forEach((lbl, val) => {
          if (next.get(val) !== lbl) {
            next.set(val, lbl);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [children]);

  const handleChange = (v: string) => {
    if (ctrl === undefined) setInternal(v);
    onValueChange?.(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <Ctx.Provider value={{ value, onValueChange: handleChange, open, setOpen, query, setQuery, triggerRef, disabled, itemLabels, registerLabel }}>
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
  const { value, open, setOpen, triggerRef, disabled: ctxDisabled, itemLabels } = useCtx();
  const isDisabled = propDisabled ?? ctxDisabled ?? false;

  // Extract placeholder from SelectValue child
  let placeholder = "Select…";
  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type === SelectValue) {
      placeholder = (child.props as any).placeholder ?? placeholder;
    }
  });

  // Use displayValue if provided, otherwise resolve label from registered itemLabels, otherwise fall back to raw value or placeholder
  const mappedLabel = value ? itemLabels?.get(String(value)) : undefined;
  const shown = displayValue ?? mappedLabel ?? (value ? value : placeholder);

  return (
    <button
      ref={triggerRef}
      id={id}
      type="button"
      disabled={isDisabled}
      onClick={() => !isDisabled && setOpen(!open)}
      className={cn(
        "w-full flex items-center justify-between gap-2 text-left",
        "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5",
        "transition-all duration-150 outline-none",
        "hover:border-[#0f3d2e] hover:bg-white",
        "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
        open && "border-[#0f3d2e] bg-white",
        size === "default" ? "h-11 text-sm font-medium" : "h-9 text-xs",
        isDisabled && "opacity-50 cursor-not-allowed hover:border-[#1a7a52] hover:bg-[#f4f7f5] pointer-events-none",
        className,
      )}
    >
      <span className={cn("flex-1 truncate", !value && "text-slate-400")}>
        {shown}
      </span>
      <ChevronDown className={cn(
        "size-4 text-[#1a7a52] shrink-0 transition-transform duration-200",
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
  const [pos, setPos] = React.useState({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
    openUp: false,
  });

  // Calculate and update position on open and continuously on ANY scroll or resize event
  React.useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();

      // Trigger is unmounted or zero-sized
      if (r.width === 0 && r.height === 0) return;

      // If scrolled entirely off screen, close gracefully
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setOpen(false);
        return;
      }

      const gap = 4;
      const spaceBelow = window.innerHeight - r.bottom - gap;
      const spaceAbove = r.top - gap;
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(320, Math.max(140, Math.floor(openUp ? spaceAbove - 8 : spaceBelow - 8)));

      setPos({
        top: openUp ? r.top - gap : r.bottom + gap,
        bottom: openUp ? window.innerHeight - r.top + gap : 0,
        left: Math.min(Math.max(8, r.left), window.innerWidth - Math.max(r.width, 220) - 8),
        width: r.width,
        maxHeight,
        openUp,
      });
    };

    updatePosition();

    // Listen on scroll with capture: true to track window, document, and ANY scrollable parent (like ScrollArea)
    window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", updatePosition, { capture: true } as any);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, triggerRef, setOpen]);

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
        position: "fixed",
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? pos.bottom : undefined,
        left: pos.left,
        width: Math.max(pos.width, 220),
        maxHeight: pos.maxHeight,
        zIndex: 9999,
      }}
      className={cn(
        "flex flex-col bg-white rounded-sm border-2 border-[#1a7a52]",
        "shadow-2xl overflow-hidden text-sm",
        className,
      )}
    >
      {/* Search */}
      <div className="shrink-0 p-2 border-b border-[#e8f5ee] bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#1a7a52]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full pl-9 pr-3 h-10 rounded-sm text-sm bg-[#f4f7f5] border border-[#c8e6d8] text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#1a7a52] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Options */}
      <div className="overflow-y-auto flex-1 min-h-0 p-1.5 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-slate-400">No results</div>
        ) : (
          renderFiltered(children)
        )}
      </div>

      {query && (
        <div className="px-3 py-1.5 border-t border-[#e8f5ee] text-xs text-[#1a7a52] font-medium">
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
  const { value, onValueChange, registerLabel } = useCtx();
  const isSelected = value === itemValue;

  React.useEffect(() => {
    if (itemValue && registerLabel) {
      let label = "";
      if (typeof children === "string" || typeof children === "number") {
        label = String(children);
      } else if (Array.isArray(children)) {
        label = children
          .map(c => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
          .join("")
          .trim();
      }
      if (label) {
        registerLabel(String(itemValue), label);
      }
    }
  }, [itemValue, children, registerLabel]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onValueChange(itemValue)}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-sm text-left text-sm cursor-pointer",
        "transition-colors duration-150",
        "whitespace-normal break-words select-none",
        isSelected
          ? "bg-[#e8f5ee] text-[#0f3d2e] font-semibold"
          : "text-slate-700 hover:bg-[#e8f5ee] hover:text-[#0f3d2e]",
        disabled && "opacity-40 pointer-events-none cursor-not-allowed",
        className,
      )}
    >
      <span className="flex-1 text-sm font-medium leading-snug">{children}</span>
      {isSelected && <Check className="size-4 text-[#1a7a52] shrink-0" />}
    </button>
  );
}

// ─── Stub components ──────────────────────────────────────────────────────────

function SelectGroup({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cn("p-0.5", className)}>{children}</div>;
}

function SelectLabel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none", className)}>
      {children}
    </div>
  );
}

function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-slate-100 -mx-1", className)} />;
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
