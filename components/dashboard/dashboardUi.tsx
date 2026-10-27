import * as React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export const COLORS = ["#25a872", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full">
      <Tag
        type={Tag === "button" ? "button" : undefined}
        onClick={onClick}
        className={`rounded-2xl p-4 border bg-white border-[#d4e8dc] text-left w-full h-full flex flex-col ${
          drillable && onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group" : ""
        }`}
      >
        <div className="mb-2 shrink-0">{icon}</div>
        <p className="text-xl font-black text-slate-800 shrink-0">{value}</p>
        <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-tight shrink-0">{label}</p>
        {detail ? (
          <p className="text-[10px] font-medium text-slate-500 mt-1 leading-tight shrink-0">{detail}</p>
        ) : (
          <span className="block min-h-[14px] shrink-0" aria-hidden />
        )}
        {drillable && onClick && (
          <p className="text-[9px] text-[#25a872] font-semibold mt-auto pt-1.5 flex items-center gap-0.5 shrink-0">
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
      className={`h-full min-h-[108px] rounded-xl border border-[#d4e8dc] bg-white p-4 text-left flex flex-col ${
        onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-[#1a7a52] transition-all group" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight min-h-[28px]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 leading-tight break-words">{value}</p>
      <p className="mt-auto pt-2 text-xs text-slate-500 leading-snug min-h-[32px]">{detail || " "}</p>
      {onClick ? (
        <p className="text-[10px] font-semibold text-[#1a7a52] mt-1 flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
          View records <ChevronRight className="w-3 h-3" />
        </p>
      ) : null}
    </Tag>
  );
}

export function DashChartCard({
  title, children, className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[#d4e8dc] bg-white p-4 flex flex-col min-h-[320px] ${className}`}>
      <p className="text-sm font-semibold text-slate-800 mb-3">{title}</p>
      <div className="flex-1 min-h-[240px]">{children}</div>
    </div>
  );
}

export function DrillHint({ onClick, label = "View details" }: { onClick?: () => void; label?: string }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick}
      className="text-[10px] font-bold text-[#145c3f] px-2.5 py-1 rounded-lg bg-[#e8f5ee] hover:bg-[#d4e8dc] transition-colors flex items-center gap-1">
      {label} <ChevronRight className="w-3 h-3" />
    </button>
  );
}
