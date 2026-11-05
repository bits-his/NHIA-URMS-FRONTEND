import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { DrillStatChip } from "./drillStats";

export function DrillStatBar({
  stats,
  onStatClick,
  loading,
}: {
  stats: DrillStatChip[];
  onStatClick?: (stat: DrillStatChip) => void;
  loading?: boolean;
}) {
  if (loading || stats.length <= 1) return null;

  return (
    <div className="px-4 pt-4 pb-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5a7a6a] mb-2">
        Quick stats · click to drill down
      </p>
      <div className="flex flex-wrap gap-2">
        {stats.map((stat) => {
          const clickable = !!(onStatClick && (stat.row || stat.filter));
          const Tag = clickable ? "button" : "div";
          return (
            <Tag
              key={stat.key}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => onStatClick(stat) : undefined}
              className={`rounded-none border border-[#d4e8dc] bg-white px-3 py-2 min-w-[88px] text-left transition-all ${
                clickable
                  ? "cursor-pointer hover:border-[#25a872] hover:shadow-sm hover:-translate-y-0.5 group"
                  : "bg-[#f0fdf7]/60"
              }`}
            >
              <p className="text-[9px] font-semibold text-[#5a7a6a] uppercase tracking-wide leading-tight">
                {stat.label}
              </p>
              <p className="text-lg font-black text-slate-900 leading-tight mt-0.5">{stat.value}</p>
              {clickable && (
                <p className="text-[9px] text-[#25a872] font-semibold mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ChevronRight className="w-3 h-3" />
                </p>
              )}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
