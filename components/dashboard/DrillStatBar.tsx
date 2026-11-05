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
    <div className="w-full px-4 pt-4 pb-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5a7a6a] mb-2">
        Quick stats · click to drill down
      </p>
      <div className="flex flex-wrap items-stretch gap-2.5 w-full">
        {stats.map((stat) => {
          const clickable = !!(onStatClick && (stat.row || stat.filter));
          const Tag = clickable ? "button" : "div";
          return (
            <Tag
              key={stat.key}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => onStatClick(stat) : undefined}
              className={`flex-1 min-w-[120px] rounded-none border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-left transition-all flex flex-col justify-between ${
                clickable
                  ? "cursor-pointer hover:border-[#25a872] hover:shadow-sm hover:-translate-y-0.5 group"
                  : "bg-[#f0fdf7]/60"
              }`}
            >
              <div>
                <p className="text-[9px] font-bold text-[#5a7a6a] uppercase tracking-wider leading-tight truncate">
                  {stat.label}
                </p>
                <p className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-1">{stat.value}</p>
              </div>
              {clickable && (
                <p className="text-[9px] text-[#25a872] font-bold mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
