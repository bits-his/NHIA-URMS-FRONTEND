import * as React from "react";
import { cn } from "@/lib/utils";

export interface SolvixStatItem {
  label: string; // e.g. "TOTAL PROFILES"
  value: string | number; // e.g. "37" or "₦142,500,000"
  trendValue?: string; // e.g. "+12.5%" or "100%" or "36 of 37"
  trendLabel?: string; // e.g. "vs last cycle" or "states reporting"
  trendColor?: "emerald" | "sky" | "amber" | "indigo" | "rose";
  sparklineVariant?: "dark" | "teal" | "emerald" | "sky" | "indigo";
}

interface SolvixStatCardsProps {
  items: SolvixStatItem[];
  loading?: boolean;
  className?: string;
}

const SPARKLINE_CONFIG: Record<string, { base: string; tip: string }> = {
  dark: { base: "bg-slate-200", tip: "bg-slate-700" },
  teal: { base: "bg-[#007a8c]/25", tip: "bg-[#007a8c]" },
  emerald: { base: "bg-emerald-200/60", tip: "bg-emerald-600" },
  sky: { base: "bg-sky-200/60", tip: "bg-sky-600" },
  indigo: { base: "bg-indigo-200/60", tip: "bg-indigo-600" },
};

const TREND_COLOR_MAP: Record<string, { dot: string; text: string }> = {
  emerald: { dot: "bg-emerald-500", text: "text-emerald-600" },
  sky: { dot: "bg-sky-500", text: "text-sky-600" },
  amber: { dot: "bg-amber-500", text: "text-amber-600" },
  indigo: { dot: "bg-indigo-500", text: "text-indigo-600" },
  rose: { dot: "bg-rose-500", text: "text-rose-600" },
};

export function SolvixStatCards({ items, loading = false, className }: SolvixStatCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2",
        className
      )}
    >
      {items.map((item, idx) => {
        const variant =
          item.sparklineVariant ||
          (idx === 0 ? "teal" : idx === 1 ? "emerald" : idx === 2 ? "sky" : "indigo");
        const sparkColors = SPARKLINE_CONFIG[variant] || SPARKLINE_CONFIG.dark;
        const trendStyle = TREND_COLOR_MAP[item.trendColor || "emerald"];

        return (
          <div
            key={item.label}
            className="bg-white rounded-sm border border-slate-200/80 p-2 px-2.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            {/* Top row: Compact label + Tiny vertical-bar sparkline */}
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none truncate">
                {item.label}
              </p>

              {/* 5-bar vertical sparkline (compact h-3.5) */}
              <div className="flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
                <div className={`w-0.5 rounded-2xs h-1 ${sparkColors.base}`} />
                <div className={`w-0.5 rounded-2xs h-2 ${sparkColors.base}`} />
                <div className={`w-0.5 rounded-2xs h-1.5 ${sparkColors.base}`} />
                <div className={`w-0.5 rounded-2xs h-2.5 ${sparkColors.tip}/70`} />
                <div className={`w-0.5 rounded-2xs h-3.5 ${sparkColors.tip}`} />
              </div>
            </div>

            {/* Middle row: Compact bold figure */}
            <div className="my-0.5">
              <p className="text-sm sm:text-base font-bold tracking-tight text-slate-900 tabular-nums">
                {loading ? "—" : item.value}
              </p>
            </div>

            {/* Bottom row: Compact trend indicator dot + text */}
            <div className="flex items-center gap-1 mt-0.5 pt-0.5 border-t border-slate-100 text-[10px]">
              <span className={`size-1.5 rounded-full shrink-0 ${trendStyle.dot}`} />
              {item.trendValue && (
                <span className={`font-semibold shrink-0 ${trendStyle.text}`}>
                  {item.trendValue}
                </span>
              )}
              {item.trendLabel && (
                <span className="text-slate-400 font-normal truncate">
                  {item.trendLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SolvixStatusPill({
  status,
  variant,
}: {
  status: string;
  variant?: "emerald" | "sky" | "purple" | "amber" | "rose";
}) {
  const norm = (status || "").toLowerCase().trim();
  const v =
    variant ||
    (norm === "approved" ||
    norm === "endorsed" ||
    norm === "good" ||
    norm === "delivered" ||
    norm === "verified"
      ? "emerald"
      : norm === "submitted" ||
        norm === "processing" ||
        norm === "active" ||
        norm === "in review"
      ? "sky"
      : norm === "draft" ||
        norm === "fair" ||
        norm === "pending info" ||
        norm === "pending"
      ? "amber"
      : norm === "returned" ||
        norm === "repairs" ||
        norm === "cancelled" ||
        norm === "rejected" ||
        norm === "needs repairs"
      ? "rose"
      : "purple");

  const styleMap = {
    emerald: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
      dot: "bg-emerald-500",
    },
    sky: {
      bg: "bg-sky-50 text-sky-700 border-sky-200/90",
      dot: "bg-sky-500",
    },
    purple: {
      bg: "bg-purple-50 text-purple-700 border-purple-200/90",
      dot: "bg-purple-500",
    },
    amber: {
      bg: "bg-amber-50 text-amber-700 border-amber-200/90",
      dot: "bg-amber-500",
    },
    rose: {
      bg: "bg-rose-50 text-rose-700 border-rose-200/90",
      dot: "bg-rose-500",
    },
  };

  const current = styleMap[v];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border select-none",
        current.bg
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", current.dot)} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
