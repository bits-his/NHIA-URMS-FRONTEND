import * as React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export const COLORS = ["#145c3f", "#25a872", "#0284c7", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

/** Standard chart tooltip adhering to shadcn styling with subtle blur and clean border */
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs">
      {label && <p className="font-bold text-slate-800 mb-1">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name || "Value"}:
            </span>
            <span className="font-bold tabular-nums text-slate-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Scope labels for unit-head dashboards (SERVICOM, Stock Verification, SOC/Zones) */
export function getUnitHeadScope(
  unitName: string,
  defaultStateId?: string | null,
  defaultZoneId?: string | null,
) {
  if (defaultStateId) {
    return {
      short: "State",
      headline: `${unitName} — state view`,
      drillSubtitle: `Filtered to one state within ${unitName}`,
    };
  }
  if (defaultZoneId) {
    return {
      short: "Zonal",
      headline: `${unitName} — zonal view`,
      drillSubtitle: `All states in zone under ${unitName}`,
    };
  }
  return {
    short: "National",
    headline: `${unitName} — unit head overview`,
    drillSubtitle: `Aggregated across all states & zones under ${unitName}`,
  };
}

export function ClickableKpi({
  label, value, icon, onClick, drillable = true, hint, detail,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  onClick?: () => void;
  drillable?: boolean;
  hint?: string;
  detail?: string;
}) {
  const Tag = drillable && onClick ? "button" : "div";
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <Tag
        type={Tag === "button" ? "button" : undefined}
        onClick={onClick}
        className={`rounded-sm p-3.5 border bg-white border-[#d4e8dc] text-left w-full h-full flex flex-col shadow-2xs ${
          drillable && onClick ? "cursor-pointer hover:border-[#1a7a52] hover:shadow-xs transition-colors group" : ""
        }`}
      >
        <div className="mb-1.5 shrink-0">{icon}</div>
        <p className="text-2xl font-black text-slate-900 shrink-0 tabular-nums">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1 leading-tight shrink-0">{label}</p>
        {detail ? (
          <p className="text-xs font-medium text-slate-500 mt-1 leading-tight shrink-0">{detail}</p>
        ) : (
          <span className="block min-h-[14px] shrink-0" aria-hidden />
        )}
        {drillable && onClick && (
          <p className="text-[10px] text-[#1a7a52] font-semibold mt-auto pt-1.5 flex items-center gap-0.5 shrink-0">
            {hint || "Open"} <ChevronRight className="w-3 h-3" />
          </p>
        )}
      </Tag>
    </motion.div>
  );
}

/** Equal-height KPI used by the SERVICOM, SVU, and complaint dashboards. */
export function DashKpi({
  label, value, detail, onClick,
}: {
  label: string;
  value: string | number;
  detail?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      className={`h-full min-h-[92px] rounded-sm border border-[#d4e8dc] bg-white p-3.5 text-left flex flex-col shadow-2xs ${
        onClick ? "cursor-pointer hover:border-[#1a7a52] hover:shadow-xs transition-colors group" : ""
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 leading-tight break-words">{value}</p>
      {detail ? (
        <p className="mt-auto pt-1.5 text-xs font-medium text-slate-500 leading-snug">{detail}</p>
      ) : null}
      {onClick ? (
        <p className="text-[10px] font-semibold text-[#1a7a52] mt-1 flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
          View records <ChevronRight className="w-3 h-3" />
        </p>
      ) : null}
    </Tag>
  );
}

export function DashChartCard({
  title, subtitle, action, children, className = "", minHeight = "min-h-[280px]",
  bodyClassName = "p-3.5 flex-1 min-h-[220px] flex flex-col w-full",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minHeight?: string;
  /** Override the chart body when the card holds a table instead of a plot. */
  bodyClassName?: string;
}) {
  return (
    <div className={`rounded-sm border border-[#d4e8dc] bg-white flex flex-col shadow-2xs overflow-hidden ${minHeight} ${className}`}>
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

export function DrillHint({ onClick, label = "View details" }: { onClick?: () => void; label?: string }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick}
      className="text-[10px] font-bold text-[#145c3f] px-2.5 py-1 rounded-md bg-[#e8f5ee] hover:bg-[#d4e8dc] transition-colors flex items-center gap-1">
      {label} <ChevronRight className="w-3 h-3" />
    </button>
  );
}
