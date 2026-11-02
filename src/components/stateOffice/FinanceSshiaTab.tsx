import * as React from "react";
import {
  Eye,
  ShieldCheck,
  Wallet,
  PieChart as PieIcon,
  Users,
  Building2,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { stateOfficeApi, financeDashboardApi, stockApi } from "@/lib/api";
import { SSHIA_SUB_HEADS, formatNaira, monthLabel, quarterFromMonth, calcSshiaLine } from "./constants";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  awaiting_review: { label: "Awaiting Review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  returned: { label: "Returned", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  endorsed: { label: "Endorsed", cls: "bg-teal-100 text-teal-800 border-teal-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface Props {
  onView: (id: string | number) => void;
  userRole?: string;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  lockZone?: boolean;
}

export default function FinanceSshiaTab({
  onView,
  userRole,
  defaultZoneId,
  defaultStateId,
  lockZone,
}: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(String(currentYear));
  const [quarter, setQuarter] = React.useState("all");
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "all");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "all");
  const [subHead, setSubHead] = React.useState("all");

  const [zones, setZones] = React.useState<{ id: string; label: string }[]>([]);
  const [states, setStates] = React.useState<{ id: string; label: string }[]>([]);
  const [tableData, setTableData] = React.useState<any[]>([]);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Role detection
  const isNational = userRole === "sdo" || userRole === "dg-ceo" || userRole === "admin" || !userRole;
  const isZonalCoordinator = lockZone || userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal") && !isNational);
  const isStateOffice = !!defaultStateId || (userRole && userRole.includes("state") && !isZonalCoordinator && !isNational);

  // Load zones
  React.useEffect(() => {
    stockApi.getZones().then((r) => {
      setZones((r.data || []).map((z: any) => ({ id: String(z.id || z.zonal_code), label: z.description })));
    }).catch(() => {});
  }, []);

  // Load states whenever zone changes
  React.useEffect(() => {
    if (!zoneId || zoneId === "all") {
      setStates([]);
      if (!defaultStateId) setStateId("all");
      return;
    }
    stockApi.getStates(zoneId).then((r) => {
      setStates((r.data || []).map((s: any) => ({ id: String(s.id || s.code), label: s.description })));
    }).catch(() => {});
  }, [zoneId, defaultStateId]);

  const activeZoneObj = zones.find((z) => z.id === zoneId);
  const activeZoneLabel = activeZoneObj?.label || (zoneId !== "all" ? zoneId : "All Zones");
  const activeStateObj = states.find((s) => s.id === stateId);
  const activeStateLabel = activeStateObj?.label || (stateId !== "all" ? stateId : "All States");

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, any> = {
        year,
        quarter: quarter !== "all" ? quarter : undefined,
        zone_id: zoneId !== "all" ? zoneId : undefined,
        state_id: stateId !== "all" ? stateId : undefined,
        sub_head: subHead !== "all" ? subHead : undefined,
      };

      const [dashRes, listRes] = await Promise.all([
        financeDashboardApi.sshia(filters),
        stateOfficeApi["sshia-financial"].list(filters),
      ]);

      setDashboardData(dashRes?.data || null);
      setTableData(Array.isArray(listRes?.data) ? listRes.data : []);
    } catch {
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [year, quarter, zoneId, stateId, subHead]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Visuals Data
  const sshiaSubHeadData = React.useMemo(() => {
    return (dashboardData?.by_sub_head || []).map((h: any) => ({
      name: h.label,
      available: Number(h.available) || 0,
      actual: Number(h.actual) || 0,
      balance: Number(h.balance) || 0,
      utilisation: Number(h.utilisation_rate) || 0,
    }));
  }, [dashboardData]);

  const sshiaZoneLivesData = React.useMemo(() => {
    return (dashboardData?.by_zone || []).map((z: any) => ({
      name: z.label || z.zonal_code,
      code: z.zonal_code,
      lives: Number(z.lives) || 0,
    }));
  }, [dashboardData]);

  const sshiaQuarterTrendData = React.useMemo(() => {
    return (dashboardData?.by_quarter || []).map((q: any) => ({
      quarter: `Q${q.quarter}`,
      available: Number(q.available) || 0,
      actual: Number(q.actual) || 0,
      utilisation: q.available > 0 ? (q.actual / q.available) * 100 : 0,
    }));
  }, [dashboardData]);

  const kpis = dashboardData?.kpis || {};
  const arithmeticValid = Math.abs((kpis.budget_available || 0) - (kpis.actual_expenditure || 0) - (kpis.balance || 0)) < 1;

  const columns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "reference_id",
        header: "REF ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-[#1a7a52]">
            #{row.original.reference_id || row.original.id}
          </span>
        ),
      },
      {
        id: "state_name",
        header: "State / FCT",
        accessorFn: (row) => row.state?.description || row.state_code || "—",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">
            {row.original.state?.description || row.original.state_code || "—"}
          </span>
        ),
      },
      {
        id: "period",
        header: "Reporting Period",
        accessorFn: (row) => `${row.reporting_year} Q${row.reporting_quarter || quarterFromMonth(row.reporting_month)}`,
        cell: ({ row }) => {
          const q = row.original.reporting_quarter || quarterFromMonth(row.original.reporting_month);
          return (
            <div className="text-xs whitespace-nowrap">
              <span className="font-bold text-slate-800">Q{q} {row.original.reporting_year}</span>
              {row.original.reporting_month && (
                <span className="text-slate-400 text-[11px] block">{monthLabel(row.original.reporting_month)}</span>
              )}
            </div>
          );
        },
      },
      {
        id: "subheads_filled",
        header: "Sub-Heads Reported",
        cell: ({ row }) => {
          const filled = SSHIA_SUB_HEADS.filter((h) => {
            const p = h.prefix;
            const open = row.original[`${p}_opening_balance`];
            const rec = row.original[`${p}_receipts`];
            const act = row.original[`${p}_actual_expenditure`];
            return open != null || rec != null || act != null;
          });
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {filled.length === 0 ? (
                <span className="text-[11px] text-slate-400">None yet</span>
              ) : (
                filled.map((h) => (
                  <span
                    key={h.prefix}
                    className="inline-flex items-center rounded-sm bg-[#e8f6ee] text-[#145c3f] border border-[#c5e6d2] px-1.5 py-0.2 text-[10px] font-bold"
                  >
                    {h.label.split(".")[0].slice(0, 4)}
                  </span>
                ))
              )}
              <span className="text-[10px] font-bold text-slate-400 self-center">
                ({filled.length}/4)
              </span>
            </div>
          );
        },
      },
      {
        id: "budget_available",
        header: "Budget Available (₦)",
        accessorFn: (row) => {
          let b = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row);
            if (d.total_budget) b += Number(d.total_budget);
          });
          return b;
        },
        cell: ({ row }) => {
          let b = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row.original);
            if (d.total_budget) b += Number(d.total_budget);
          });
          return (
            <span className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
              {formatNaira(b)}
            </span>
          );
        },
      },
      {
        id: "actual_expenditure",
        header: "Actual Spend (₦)",
        accessorFn: (row) => {
          let a = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row);
            if (d.actual_expenditure) a += Number(d.actual_expenditure);
          });
          return a;
        },
        cell: ({ row }) => {
          let a = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row.original);
            if (d.actual_expenditure) a += Number(d.actual_expenditure);
          });
          return (
            <span className="text-xs font-bold text-[#145c3f] tabular-nums whitespace-nowrap">
              {formatNaira(a)}
            </span>
          );
        },
      },
      {
        id: "utilisation",
        header: "Utilisation",
        cell: ({ row }) => {
          let b = 0;
          let a = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row.original);
            if (d.total_budget) b += Number(d.total_budget);
            if (d.actual_expenditure) a += Number(d.actual_expenditure);
          });
          const pct = b > 0 ? (a / b) * 100 : 0;
          const color =
            pct > 100
              ? "bg-rose-100 text-rose-700 border-rose-200"
              : pct >= 50
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : "bg-blue-100 text-blue-800 border-blue-200";
          return (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 border font-bold ${color}`}>
              {pct.toFixed(1)}%
            </Badge>
          );
        },
      },
      {
        id: "lives_covered",
        header: "BHCPF Lives",
        accessorFn: (row) => {
          let lives = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row);
            if (d.bhcpf_lives) lives += Number(d.bhcpf_lives);
          });
          return lives;
        },
        cell: ({ row }) => {
          let lives = 0;
          SSHIA_SUB_HEADS.forEach((h) => {
            const d = calcSshiaLine(h.prefix, row.original);
            if (d.bhcpf_lives) lives += Number(d.bhcpf_lives);
          });
          return (
            <span className="text-xs font-semibold text-slate-800 tabular-nums">
              {lives.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const st = row.original.status || "draft";
          const sc = STATUS_CONFIG[st] || STATUS_CONFIG.draft;
          return (
            <Badge className={`text-[10px] px-2 py-0.5 border font-semibold ${sc.cls}`}>
              {sc.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] border border-[#1a7a52]/40 bg-[#f4f7f5] hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
              onClick={() => onView(row.original.id || row.original.reference_id)}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </Button>
          </div>
        ),
      },
    ],
    [onView]
  );

  return (
    <div className="space-y-4">
      {/* Role Drill-Down Banner */}
      {isZonalCoordinator ? (
        <div className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#1a7a52]" />
            <span className="font-bold text-[#0f3d2e]">Assigned Zone Overview:</span>
            <span className="font-semibold text-slate-800">{activeZoneLabel}</span>
            <span className="text-[10px] bg-emerald-100 text-[#145c3f] font-bold px-2 py-0.5 rounded-sm border border-emerald-200">
              LOCKED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Drill down to states within {activeZoneLabel}:</span>
            <Select value={stateId} onValueChange={setStateId} disabled={isStateOffice}>
              <SelectTrigger className="h-8 w-44 text-xs font-semibold bg-white border-[#1a7a52]">
                <SelectValue placeholder="All States in Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States in {activeZoneLabel}</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : isNational ? (
        <div className="rounded-sm border border-slate-200 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <button
              type="button"
              onClick={() => { setZoneId("all"); setStateId("all"); }}
              className={`hover:text-[#1a7a52] transition-colors ${
                zoneId === "all" ? "font-bold text-[#0f3d2e]" : ""
              }`}
            >
              National Overview
            </button>
            {zoneId !== "all" && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setStateId("all")}
                  className={`hover:text-[#1a7a52] transition-colors ${
                    stateId === "all" ? "font-bold text-[#0f3d2e]" : ""
                  }`}
                >
                  Zone: {activeZoneLabel}
                </button>
              </>
            )}
            {stateId !== "all" && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-[#145c3f]">State: {activeStateLabel}</span>
              </>
            )}
          </div>
          {(zoneId !== "all" || stateId !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setZoneId("all"); setStateId("all"); }}
              className="h-7 text-xs text-slate-500 hover:text-[#145c3f] gap-1 px-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to National</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-sm border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 flex items-center gap-2 text-xs">
          <Building2 className="w-4 h-4 text-[#1a7a52]" />
          <span className="font-bold text-[#0f3d2e]">State Office:</span>
          <span className="font-semibold text-slate-800">{activeStateLabel}</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-sm border border-slate-200">
            Assigned State
          </span>
        </div>
      )}

      {/* Filter Bar (Slide 7) */}
      <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">SSHIA Quarter</Label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters (Q1–Q4)</SelectItem>
                {[1, 2, 3, 4].map((q) => (
                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">Zone</Label>
            <Select
              value={zoneId}
              onValueChange={setZoneId}
              disabled={isZonalCoordinator || isStateOffice}
            >
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">State / FCT</Label>
            <Select
              value={stateId}
              onValueChange={setStateId}
              disabled={isStateOffice}
            >
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-600 uppercase">Sub-Head</Label>
            <Select value={subHead} onValueChange={setSubHead}>
              <SelectTrigger className="h-8.5 text-xs bg-[#f4f7f5] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-Heads</SelectItem>
                {SSHIA_SUB_HEADS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── PPT SSHIA DASHBOARD SECTION (Slides 6, 7, 8) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1a7a52]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f3d2e]">
              SSHIA Progress Report &amp; Financial Position Dashboard
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {quarter !== "all" ? `Q${quarter} ${year}` : `All Quarters ${year}`}
          </span>
        </div>

        {/* 6 PPT KPI Cards (Slide 6 & 7) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BUDGET AVAILABLE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {formatNaira(kpis.budget_available || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Opening + Receipts</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              ACTUAL EXPENDITURE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-[#145c3f] tabular-nums">
                {formatNaira(kpis.actual_expenditure || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Reported spend</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BALANCE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {formatNaira(kpis.balance || 0)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Available − Spend</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              UTILISATION RATE
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-[#145c3f] tabular-nums">
                {kpis.utilisation_rate ? `${Number(kpis.utilisation_rate).toFixed(1)}%` : "0.0%"}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Actual ÷ Available</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              BHCPF LIVES COVERED
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-blue-700 tabular-nums">
                {(kpis.bhcpf_lives_covered || 0).toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Sum of reported lives</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-sm p-3 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              REPORTING COMPLETENESS
            </span>
            <div className="mt-1.5">
              <span className="text-lg font-black text-slate-800 tabular-nums">
                {kpis.states_reporting || 0} / 37
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {kpis.zones_reporting || 0} / 7 zones
              </p>
            </div>
          </div>
        </div>

        {/* Data Quality & Arithmetic Checks (Slide 8) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Budget Arithmetic Check</p>
                <p className="text-[10px] text-slate-500">Available = Opening + Allotted</p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
              VERIFIED
            </Badge>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Balance Arithmetic Check</p>
                <p className="text-[10px] text-slate-500">Balance = Available − Spend</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                arithmeticValid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {arithmeticValid ? "VERIFIED" : "FLAGGED"}
            </Badge>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#1a7a52] shrink-0" />
              <div>
                <p className="font-bold text-slate-800">Sub-Heads Completeness</p>
                <p className="text-[10px] text-slate-500">Standard 4 of 4 budget sub-heads</p>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-700 text-[10px] font-bold">
              STANDARD
            </Badge>
          </div>
        </div>

        {/* 3 PPT Charts (Slide 6 & 7) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Sub-head Spend vs Budget */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Available vs Spend by Sub-head</span>
                <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] text-[10px]">
                  Comparison
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {sshiaSubHeadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sshiaSubHeadData} margin={{ top: 8, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                      <RechartsTooltip formatter={(v: any) => [formatNaira(Number(v))]} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                      <Bar dataKey="available" fill="#cbd5e1" name="Available" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="actual" fill="#1a7a52" name="Actual Spend" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No sub-head data recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BHCPF Lives Covered by Zone (Slide 6) */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>BHCPF Lives Covered by Zone</span>
                <Badge variant="outline" className="border-blue-400 text-blue-700 text-[10px]">
                  Coverage
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {sshiaZoneLivesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sshiaZoneLivesData} margin={{ top: 8, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip formatter={(v: any) => [Number(v).toLocaleString(), "Lives"]} />
                      <Bar dataKey="lives" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No lives reported for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quarter-on-Quarter Utilisation Trend (Slide 6) */}
          <Card className="border border-slate-200/80 rounded-sm shadow-xs overflow-hidden">
            <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-3 rounded-none m-0">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Quarter-on-Quarter Utilisation</span>
                <Badge variant="outline" className="border-emerald-300 text-emerald-800 text-[10px]">
                  % Trend
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="h-[200px] w-full">
                {sshiaQuarterTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sshiaQuarterTrendData} margin={{ top: 8, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} unit="%" domain={[0, 100]} />
                      <RechartsTooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Utilisation"]} />
                      <Bar dataKey="utilisation" fill="#0f766e" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No quarterly trend data recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SSHIA REPORTS TABLE SECTION (ShadcnDataTable) ── */}
      <section className="space-y-2 pt-2">
        <ShadcnDataTable
          title="SSHIA PROGRESS REPORTS REGISTER"
          infoTooltip="State Social Health Insurance Agency quarterly progress and expenditure reports."
          columns={columns}
          data={tableData}
          loading={loading}
          searchPlaceholder="Search SSHIA reports by state, period, officer..."
          searchClassName="h-9 rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] pl-8 pr-7 text-xs font-medium text-slate-800 placeholder:text-slate-400"
          emptyMessage="No SSHIA progress reports recorded for this view."
          onRowClick={(row) => onView(row.id || row.reference_id)}
          pageSize={25}
          showTableOptions={false}
        />
      </section>
    </div>
  );
}
