import * as React from "react";
import { ChevronDown, RotateCcw, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterPillConfig {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  allLabel?: string;
}

interface SolvixFilterBarProps {
  filters: FilterPillConfig[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}

export function SolvixFilterBar({
  filters,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: SolvixFilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 py-1",
        className
      )}
    >
      {/* Left: Longer Filter Pills in a clean horizontal flex row */}
      <div className="flex flex-row flex-wrap items-center gap-2.5">
        {filters.map((f) => {
          const isSelected = f.value && f.value !== "all" && f.value !== "";
          const activeOption = f.options.find((opt) => String(opt.value) === String(f.value));

          // When not selected or value is "all", display clean label e.g. "All Zones" or "All States"
          const displayLabel = isSelected
            ? `${f.label}: ${activeOption?.label || f.value}`
            : f.allLabel || `All ${f.label}s`;

          return (
            <DropdownMenu key={f.id}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-8 px-3.5 rounded-sm text-xs font-medium inline-flex items-center justify-between gap-2 transition-colors border shadow-2xs shrink-0 select-none cursor-pointer outline-none min-w-[150px] sm:min-w-[190px]",
                    isSelected
                      ? "bg-[#e8f5ee] border-[#1a7a52]/40 text-[#1a7a52] font-semibold"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="truncate">{displayLabel}</span>
                  <ChevronDown className="size-3 text-slate-400 shrink-0 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 max-h-80 overflow-y-auto text-xs rounded-sm"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Filter by {f.label}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => f.onChange("all")}
                    className={cn(
                      "cursor-pointer text-xs justify-between rounded-sm",
                      !isSelected && "font-bold text-[#1a7a52] bg-[#e8f5ee]"
                    )}
                  >
                    <span>{f.allLabel || `All ${f.label}s`}</span>
                    {!isSelected && <Check className="size-3.5 text-[#1a7a52]" />}
                  </DropdownMenuItem>
                  {f.options.map((opt) => {
                    const itemSelected = String(opt.value) === String(f.value);
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => f.onChange(opt.value)}
                        className={cn(
                          "cursor-pointer text-xs justify-between rounded-sm",
                          itemSelected && "font-bold text-[#1a7a52] bg-[#e8f5ee]"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {itemSelected && <Check className="size-3.5 text-[#1a7a52]" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Clear Filters reset link */}
        {activeFilterCount > 0 && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
