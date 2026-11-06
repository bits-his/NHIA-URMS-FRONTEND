/**
 * Complaint Register dashboard — SERVICOM / Enforcement officers.
 * Spec: volume, sources, issue patterns, resolution performance, SLA, escalation.
 */
import * as React from "react";
import { RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { servicomApi } from "@/lib/api";
import { zonesApi, statesApi } from "@/lib/adminApi";
import { DashChartCard } from "@/components/dashboard/dashboardUi";
import DashboardDrillPanel from "@/components/dashboard/DashboardDrillPanel";
import { useDashboardDrill } from "@/components/dashboard/useDashboardDrill";
import {
  COMPLAINT_DOMAINS, COMPLAINT_CATEGORIES, COMPLAINT_TYPES, PRIORITY_RATINGS,
  TRANSMISSION_ROUTES, COMPLAINT_STATUSES,
} from "./complaintRegisterConstants";

interface Props {
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  lockLocation?: boolean;
  /** When true, omit outer card chrome (used as a section inside SERVICOM dashboard or State Office). */
  embedded?: boolean;
  /** When true, exclude SERVICOM complaints and hide SERVICOM channel from filters (for State Office). */
  excludeServicom?: boolean;
  /** When true, restrict to SERVICOM-only channel. */
  servicomOnly?: boolean;
  /** Optional custom title for header */
  title?: string;
  subtitle?: string;
}

const currentYear = new Date().getFullYear();
const YEARS = ["all", ...Array.from({ length: 5 }, (_, i) => String(currentYear - i))];
const MONTHS = [
  { value: "all", label: "All months" },
  { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
  { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
];

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center px-4 text-center">
      <p className="text-xs text-slate-500">{message}</p>
    </div>
  );
}

export default function ComplaintRegisterDashboard({
  defaultStateId,
  defaultZoneId,
  lockLocation = false,
  embedded = false,
  excludeServicom = false,
  servicomOnly = false,
  title,
  subtitle,
}: Props) {
  const zoneLocked = lockLocation && !!defaultZoneId && !defaultStateId;
  const stateLocked = lockLocation && !!defaultStateId;
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [year, setYear] = React.useState(String(currentYear));
  const [month, setMonth] = React.useState("all");
  const [mainTab, setMainTab] = React.useState<"overview" | "analysis">("overview");
  const [date, setDate] = React.useState("");
  const [locationLevel, setLocationLevel] = React.useState<"all" | "hq" | "zone" | "state">(
    stateLocked ? "state" : zoneLocked ? "zone" : "all",
  );
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterState, setFilterState] = React.useState(defaultStateId ?? "all");
  const [domain, setDomain] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [route, setRoute] = React.useState(servicomOnly ? "SERVICOM" : "all");
  const [status, setStatus] = React.useState("all");

  const availableRoutes = React.useMemo(() => {
    if (excludeServicom) {
      return TRANSMISSION_ROUTES.filter((r) => r.value.toUpperCase() !== "SERVICOM");
    }
    if (servicomOnly) {
      return TRANSMISSION_ROUTES.filter((r) => r.value.toUpperCase() === "SERVICOM");
    }
    return TRANSMISSION_ROUTES;
  }, [excludeServicom, servicomOnly]);

  React.useEffect(() => {
    statesApi.list().then((r) => setStates(r.data || [])).catch(() => setStates([]));
    if (!stateLocked) {
      zonesApi.list().then((r) => setZones(r.data || [])).catch(() => setZones([]));
    }
  }, [stateLocked]);

  React.useEffect(() => {
    if (stateLocked) return;
    const zoneArg = filterZone === "all" ? undefined : filterZone;
    statesApi.list(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, stateLocked]);

  const scope = React.useMemo(() => {
    const isHq = locationLevel === "hq";
    const zonal = !isHq
      ? (zoneLocked ? defaultZoneId : (filterZone !== "all" ? filterZone : undefined))
      : undefined;
    const state = !isHq
      ? (stateLocked ? defaultStateId : (filterState !== "all" ? filterState : undefined))
      : undefined;

    return {
      location: isHq ? "hq" : undefined,
      state_code: state,
      zonal_code: zonal,
      state_id: state,
      zone_id: zonal,
      year: date ? undefined : (year === "all" ? undefined : year),
      month: date ? undefined : (month === "all" ? undefined : month),
      date: date || undefined,
      domain: domain === "all" ? undefined : domain,
      priority: priority === "all" ? undefined : priority,
      category: category === "all" ? undefined : category,
      type: type === "all" ? undefined : type,
      route: servicomOnly ? "SERVICOM" : (route === "all" ? undefined : route),
      exclude_servicom: excludeServicom ? "1" : undefined,
      exclude_route: excludeServicom ? "SERVICOM" : undefined,
      channel: servicomOnly ? "servicom" : (excludeServicom ? "state" : undefined),
      status: status === "all" ? undefined : status,
    };
  }, [
    locationLevel, defaultStateId, defaultZoneId, filterState, filterZone,
    year, month, date, domain, priority, category, type, route, status,
    excludeServicom, servicomOnly, stateLocked, zoneLocked,
  ]);

  const drill = useDashboardDrill(
    (params) => servicomApi.getDashboardDrill(params),
    {
      state_id: scope.state_id,
      zone_id: scope.zone_id,
      state_code: scope.state_code,
      zonal_code: scope.zonal_code,
      year: scope.year,
      month: scope.month,
      date: scope.date,
      location: scope.location,
      domain: scope.domain,
      priority: scope.priority,
      category: scope.category,
      type: scope.type,
      route: scope.route,
      exclude_servicom: scope.exclude_servicom,
      exclude_route: scope.exclude_route,
      channel: scope.channel,
      status: scope.status,
    },
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await servicomApi.getComplaintsDashboard(scope);
      setData(res.data);
    } catch (err: any) {
      toast.error("Failed to load complaint dashboard", { description: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  React.useEffect(() => { load(); }, [load]);

  const zoneLabel = filterZone === "all"
    ? "All zones"
    : (zones.find((z) => String(z.zonal_code) === filterZone)?.description || filterZone);
  const stateLabel = filterState === "all"
    ? "All states"
    : (states.find((s) => String(s.code) === filterState)?.description || filterState);

  const activeStateObj = states.find((s) => String(s.code) === defaultStateId || String(s.id) === defaultStateId);
  const isSingleState = stateLocked || (filterState !== "all" && filterState !== "");

  const clearFilters = () => {
    setYear(String(currentYear));
    setMonth("all");
    setDate("");
    if (!stateLocked && !zoneLocked) {
      setLocationLevel("all");
      setFilterZone("all");
      setFilterState("all");
    } else if (zoneLocked && !stateLocked) {
      setFilterState("all");
    }
    setDomain("all");
    setPriority("all");
    setCategory("all");
    setType("all");
    setRoute("all");
    setStatus("all");
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (year !== "all" && year !== String(currentYear)) count++;
    if (month !== "all") count++;
    if (date) count++;
    if (locationLevel !== "all" && !stateLocked && !zoneLocked) count++;
    if (filterZone !== "all" && !zoneLocked) count++;
    if (filterState !== "all" && !stateLocked) count++;
    if (domain !== "all") count++;
    if (priority !== "all") count++;
    if (category !== "all") count++;
    if (type !== "all") count++;
    if (route !== "all") count++;
    if (status !== "all") count++;
    return count;
  }, [year, month, date, locationLevel, filterZone, filterState, domain, priority, category, type, route, status, stateLocked, zoneLocked]);

  const filters = stateLocked ? (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Filter label="Reporting year">
          <Select
            value={year}
            onValueChange={(v) => { setYear(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger displayValue={year === "all" ? "All years" : year}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>{y === "all" ? "All Years" : y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Month">
          <Select
            value={month}
            onValueChange={(v) => { setMonth(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger displayValue={MONTHS.find((m) => m.value === month)?.label ?? month}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Specific date">
          <Input
            className="h-10 w-full rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 text-sm font-medium text-slate-800"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) {
                setYear("all");
                setMonth("all");
              }
            }}
          />
        </Filter>

        <Filter label="Program">
          <Choice value={domain} onChange={setDomain} allLabel="All Programs" options={COMPLAINT_DOMAINS} />
        </Filter>
        <Filter label="Priority">
          <Choice value={priority} onChange={setPriority} allLabel="All Priorities" options={PRIORITY_RATINGS} />
        </Filter>
        <Filter label="Category">
          <Choice value={category} onChange={setCategory} allLabel="All Categories" options={COMPLAINT_CATEGORIES} />
        </Filter>
        <Filter label="Type">
          <Choice value={type} onChange={setType} allLabel="All Types" options={COMPLAINT_TYPES} />
        </Filter>
        <Filter label="Route">
          <Choice value={route} onChange={setRoute} allLabel={servicomOnly ? "SERVICOM" : "All Routes"} options={availableRoutes} />
        </Filter>
        <Filter label="Status">
          <Choice value={status} onChange={setStatus} allLabel="All Statuses" options={COMPLAINT_STATUSES} />
        </Filter>
    </div>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Filter label="Reporting year">
          <Select
            value={year}
            onValueChange={(v) => { setYear(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger displayValue={year === "all" ? "All years" : year}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={y}>{y === "all" ? "All Years" : y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Month">
          <Select
            value={month}
            onValueChange={(v) => { setMonth(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger displayValue={MONTHS.find((m) => m.value === month)?.label ?? month}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Specific date">
          <Input
            className="h-10 w-full rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 text-sm font-medium text-slate-800"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value) {
                setYear("all");
                setMonth("all");
              }
            }}
          />
        </Filter>

        {!zoneLocked ? (
          <Filter label="Location">
            <Select
              value={locationLevel}
              onValueChange={(v: "all" | "hq" | "zone" | "state") => {
                setLocationLevel(v);
                if (v === "hq" || v === "all") {
                  setFilterZone("all");
                  setFilterState("all");
                }
                if (v === "zone") setFilterState("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="hq">HQ</SelectItem>
                <SelectItem value="zone">Zone</SelectItem>
                <SelectItem value="state">State</SelectItem>
              </SelectContent>
            </Select>
          </Filter>
        ) : (
          <Filter label="Location">
            <div className="h-10 px-3.5 flex items-center text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm text-slate-600">
              Zone Locked
            </div>
          </Filter>
        )}

        {locationLevel !== "hq" ? (
          <Filter label={`Zone ${zoneLocked ? "• Locked" : ""}`}>
            <Select
              value={filterZone}
              onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}
              disabled={zoneLocked}
            >
              <SelectTrigger displayValue={zoneLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.zonal_code} value={String(z.zonal_code)}>{z.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
        ) : (
          <Filter label="Zone">
            <div className="h-10 px-3.5 flex items-center text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm text-slate-400">
              HQ (N/A)
            </div>
          </Filter>
        )}

        {locationLevel !== "hq" ? (
          <Filter label="State">
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger displayValue={stateLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.code} value={String(s.code)}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
        ) : (
          <Filter label="State">
            <div className="h-10 px-3.5 flex items-center text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm text-slate-400">
              HQ (N/A)
            </div>
          </Filter>
        )}
        <Filter label="Program">
          <Choice value={domain} onChange={setDomain} allLabel="All Programs" options={COMPLAINT_DOMAINS} />
        </Filter>
        <Filter label="Priority">
          <Choice value={priority} onChange={setPriority} allLabel="All Priorities" options={PRIORITY_RATINGS} />
        </Filter>
        <Filter label="Category">
          <Choice value={category} onChange={setCategory} allLabel="All Categories" options={COMPLAINT_CATEGORIES} />
        </Filter>
        <Filter label="Type">
          <Choice value={type} onChange={setType} allLabel="All Types" options={COMPLAINT_TYPES} />
        </Filter>
        <Filter label="Route">
          <Choice value={route} onChange={setRoute} allLabel={servicomOnly ? "SERVICOM" : "All Routes"} options={availableRoutes} />
        </Filter>
        <Filter label="Status">
          <Choice value={status} onChange={setStatus} allLabel="All Statuses" options={COMPLAINT_STATUSES} />
        </Filter>
    </div>
  );

  const body = loading ? (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading complaint dashboard…
    </div>
  ) : mainTab === "analysis" ? (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
      <CountChart title="Complaints by respondent (complainant type)" data={data?.by_complainant} empty="No complainant types recorded." />
      <CountChart title="Top recurring issues" data={data?.top_issues} empty="No issue categories yet." />
      {!isSingleState && <CountChart title="Complaints by state" data={data?.by_state} empty="No state volumes yet." />}
      {!isSingleState && <CountChart title="Complaints by zone" data={data?.by_zone} empty="No zone volumes yet." />}
      {!isSingleState && <DaysChart title="Average resolution time by state" data={data?.avg_resolution_by_state} />}
      {!isSingleState && <DaysChart title="Average resolution time by zone" data={data?.avg_resolution_by_zone} />}
    </div>
  ) : (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
      <CountChart title="Complaints by programs" data={data?.by_domain} empty="No complaints in this filter." />
      <CountChart title="Complaints by resolution" data={data?.by_outcome} empty="No closed complaints in this filter." />
      <CountChart title="Open complaints by status" data={data?.open_by_status} empty="No open complaints." className="xl:col-span-2" />
    </div>
  );

  const drillPanel = (
    <DashboardDrillPanel
      open={drill.open}
      context={drill.context}
      rows={drill.rows}
      loading={drill.loading}
      onClose={drill.close}
      onBack={drill.canGoBack ? drill.back : undefined}
      onRowClick={drill.handleNestedRow}
      onStatClick={drill.handleStatClick}
    />
  );

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div className="border-b border-[#d4e8dc] pb-1.5">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="rounded-lg border border-[#d4e8dc] bg-white p-3.5 shadow-2xs space-y-3">
        {filters}
        {(activeFiltersCount > 0 || !embedded) && (
          <div className="flex justify-end gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-sm px-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
            {!embedded && (
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="h-8 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Sync</span>
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-[#d4e8dc] bg-white p-1 shadow-2xs w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setMainTab("overview")}
          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
            mainTab === "overview"
              ? "bg-[#145c3f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setMainTab("analysis")}
          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
            mainTab === "analysis"
              ? "bg-[#145c3f] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Activity analysis
        </button>
      </div>
      {body}
      {drillPanel}
    </div>
  );
}

function CountChart({
  title, data, empty, className = "",
}: {
  title: string;
  data?: { name: string; count: number }[];
  empty: string;
  className?: string;
}) {
  const rows = data ?? [];
  return (
    <DashChartCard title={title} className={className}>
      {rows.length === 0 ? <ChartEmpty message={empty} /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1a7a52" radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashChartCard>
  );
}

function DaysChart({ title, data }: { title: string; data?: { name: string; days: number | null }[] }) {
  const rows = (data ?? []).filter((row) => row.days != null);
  return (
    <DashChartCard title={title}>
      {rows.length === 0 ? <ChartEmpty message="No closed cases with a resolution time." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ left: 4, right: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => [`${value} days`, "Average"]} />
            <Bar dataKey="days" fill="#1a7a52" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashChartCard>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

function Choice({
  value, onChange, allLabel, options,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  const label = value === "all" ? allLabel : (options.find((o) => o.value === value)?.label || value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger displayValue={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
