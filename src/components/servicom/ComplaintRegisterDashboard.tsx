/**
 * Complaint Register dashboard — SERVICOM / Enforcement officers.
 * Spec: volume, sources, issue patterns, resolution performance, SLA, escalation.
 */
import * as React from "react";
import { RefreshCw, Loader2, Filter as FilterIcon, X, Calendar, Tag, ChevronRight, MapPin } from "lucide-react";
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
import { DashKpi, DashChartCard } from "@/components/dashboard/dashboardUi";
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

function volumeLabel(row: { name?: string; count?: number } | null | undefined) {
  if (!row?.name) return "—";
  return `${row.name} (${row.count})`;
}

function KpiCard({
  label,
  value,
  detail,
  onClick,
  accent = "border-l-slate-300",
}: {
  label: string;
  value: string | number;
  detail?: string;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-sm border border-slate-200/90 bg-white p-4 transition-all hover:shadow-md hover:border-[#1a7a52] hover:bg-emerald-50/20 border-l-4 ${accent} flex flex-col justify-between min-h-[96px] w-full`}
    >
      <div className="flex items-center justify-between gap-1.5 w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate leading-none">
          {label}
        </span>
        {onClick && (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
        )}
      </div>
      <div className="mt-2 w-full">
        <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-tight truncate">
          {value}
        </p>
        {detail && (
          <p className="text-xs text-slate-500 truncate leading-none mt-1.5">
            {detail}
          </p>
        )}
      </div>
    </button>
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

  const drillCtx = React.useMemo(() => ({
    subtitle: excludeServicom ? "State Complaints register" : "Complaint register",
    breadcrumbs: [excludeServicom ? "State Office" : "SERVICOM", "Complaint register"],
  }), [excludeServicom]);

  const openComplaints = React.useCallback((title: string, extra?: Record<string, string>) => {
    const crumbs = [...drillCtx.breadcrumbs, title];
    if (extra?.state_id || extra?.state_code) {
      drill.openDrill(
        { segment: "complaints", record_segment: "complaints", ...extra },
        { title, subtitle: drillCtx.subtitle, breadcrumbs: crumbs },
        { resetStack: true },
      );
      return;
    }
    if (extra?.zone_id || extra?.zonal_code) {
      drill.openDrill(
        { segment: "state_breakdown", record_segment: "complaints", ...extra },
        { title: `${title} — by State`, subtitle: drillCtx.subtitle, breadcrumbs: [...crumbs, "By State"] },
        { resetStack: true },
      );
      return;
    }
    drill.openRecordDrill("complaints", title, drillCtx, extra);
  }, [drill, drillCtx]);

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
  const activeStateName = activeStateObj?.description || defaultStateId || "State Office";
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
    <div className="p-3.5 bg-white">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        <Filter label="Reporting Year">
          <Select
            value={year}
            onValueChange={(v) => { setYear(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm">
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
            <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Specific Date">
          <Input
            className="h-8.5 text-xs bg-white border-[#d4e8dc] rounded-sm"
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
    </div>
  ) : (
    <div className="p-3.5 space-y-3 bg-white">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Filter label="Reporting Year">
          <Select
            value={year}
            onValueChange={(v) => { setYear(v); if (v !== "all") setDate(""); }}
          >
            <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm">
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
            <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Filter>

        <Filter label="Specific Date">
          <Input
            className="h-8.5 text-xs bg-white border-[#d4e8dc] rounded-sm"
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
          <Filter label="Location Level">
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
              <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm">
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
          <Filter label="Location Level">
            <div className="h-8.5 px-3 flex items-center text-xs bg-slate-100/70 border border-[#d4e8dc] rounded-sm text-slate-600 font-medium">
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
              <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm" displayValue={zoneLabel}>
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
            <div className="h-8.5 px-3 flex items-center text-xs bg-slate-100/70 border border-[#d4e8dc] rounded-sm text-slate-400">
              HQ (N/A)
            </div>
          </Filter>
        )}

        {locationLevel !== "hq" ? (
          <Filter label="State">
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm" displayValue={stateLabel}>
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
            <div className="h-8.5 px-3 flex items-center text-xs bg-slate-100/70 border border-[#d4e8dc] rounded-sm text-slate-400">
              HQ (N/A)
            </div>
          </Filter>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
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
    </div>
  );

  const body = loading ? (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading complaint dashboard…
    </div>
  ) : (
    <>
      {/* 5-Column Responsive KPI Grid (Spacious, comfortably padded, high visual clarity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard
          label="Received"
          value={data?.received ?? 0}
          detail="In current filter"
          accent="border-l-[#1a7a52]"
          onClick={() => openComplaints("Complaints received")}
        />
        <KpiCard
          label="Avg Resolution"
          value={data?.average_resolution != null ? `${data.average_resolution}d` : "—"}
          detail="Mean days to close"
          accent="border-l-blue-500"
          onClick={() => openComplaints("Closed complaints — resolution time", { kpi: "closed" })}
        />
        <KpiCard
          label="Within SLA"
          value={data?.resolved_within_sla != null ? `${data.resolved_within_sla}%` : "—"}
          detail={`${data?.resolved_within_sla_count ?? 0} met target`}
          accent="border-l-emerald-600"
          onClick={() => openComplaints("Resolved within SLA", { kpi: "within_sla" })}
        />
        <KpiCard
          label="Pending"
          value={data?.pending ?? 0}
          detail="Active / open"
          accent="border-l-amber-500"
          onClick={() => openComplaints("Pending complaints", { kpi: "pending" })}
        />
        <KpiCard
          label="Overdue"
          value={data?.overdue_percent != null ? `${data.overdue_percent}%` : "—"}
          detail="Past target date"
          accent="border-l-rose-500"
          onClick={() => openComplaints("Overdue / open complaints", { kpi: "overdue" })}
        />
        <KpiCard
          label="Beyond SLA"
          value={data?.beyond_sla_percent != null ? `${data.beyond_sla_percent}%` : "—"}
          detail="Closed past target"
          accent="border-l-orange-500"
          onClick={() => openComplaints("Resolved beyond SLA", { kpi: "beyond_sla" })}
        />
        <KpiCard
          label="Repeat Rate"
          value={data?.repeat_rate != null ? `${data.repeat_rate}%` : "—"}
          detail="Recurring issues"
          accent="border-l-purple-500"
          onClick={() => openComplaints("Repeat complaints", { kpi: "repeat" })}
        />
        <KpiCard
          label="Top Category"
          value={data?.top_category || "—"}
          detail="Most frequent"
          accent="border-l-indigo-400"
          onClick={() => openComplaints(
            data?.top_category ? `Category: ${data.top_category}` : "Complaints by category",
            data?.top_category ? { category: data.top_category } : undefined,
          )}
        />
        <KpiCard
          label="Top Complainant"
          value={data?.top_type || "—"}
          detail="Respondent type"
          accent="border-l-cyan-500"
          onClick={() => openComplaints(
            data?.top_type ? `Type: ${data.top_type}` : "Complaints by type",
            data?.top_type ? { type: data.top_type } : undefined,
          )}
        />
        <KpiCard
          label="Top Route"
          value={data?.top_route || "—"}
          detail="Intake channel"
          accent="border-l-teal-500"
          onClick={() => openComplaints(
            data?.top_route ? `Route: ${data.top_route}` : "Complaints by route",
            data?.top_route ? { route: data.top_route } : undefined,
          )}
        />

        {/* National / Multi-State comparison cards — hidden for single state view */}
        {!isSingleState && (
          <>
            <KpiCard
              label="Highest State"
              value={volumeLabel(data?.highest_state)}
              detail="Max volume"
              accent="border-l-emerald-500"
              onClick={() => openComplaints(
                data?.highest_state?.name ? `State: ${data.highest_state.name}` : "Complaints by state",
                data?.highest_state?.code
                  ? { state_id: String(data.highest_state.code), state_code: String(data.highest_state.code) }
                  : undefined,
              )}
            />
            <KpiCard
              label="Lowest State"
              value={volumeLabel(data?.lowest_state)}
              detail="Min volume"
              accent="border-l-slate-400"
              onClick={() => openComplaints(
                data?.lowest_state?.name ? `State: ${data.lowest_state.name}` : "Complaints by state",
                data?.lowest_state?.code
                  ? { state_id: String(data.lowest_state.code), state_code: String(data.lowest_state.code) }
                  : undefined,
              )}
            />
            <KpiCard
              label="Highest Zone"
              value={volumeLabel(data?.highest_zone)}
              detail="Max volume"
              accent="border-l-blue-400"
              onClick={() => openComplaints(
                data?.highest_zone?.name ? `Zone: ${data.highest_zone.name}` : "Complaints by zone",
                data?.highest_zone?.code
                  ? { zone_id: String(data.highest_zone.code), zonal_code: String(data.highest_zone.code) }
                  : undefined,
              )}
            />
            <KpiCard
              label="Lowest Zone"
              value={volumeLabel(data?.lowest_zone)}
              detail="Min volume"
              accent="border-l-slate-400"
              onClick={() => openComplaints(
                data?.lowest_zone?.name ? `Zone: ${data.lowest_zone.name}` : "Complaints by zone",
                data?.lowest_zone?.code
                  ? { zone_id: String(data.lowest_zone.code), zonal_code: String(data.lowest_zone.code) }
                  : undefined,
              )}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <CountChart title="Complaints by programs" data={data?.by_domain} empty="No complaints in this filter." />
        <CountChart title="Complaints by respondent (complainant type)" data={data?.by_complainant} empty="No complainant types recorded." />
        <CountChart title="Complaints by resolution" data={data?.by_outcome} empty="No closed complaints in this filter." />
        <CountChart title="Top recurring issues" data={data?.top_issues} empty="No issue categories yet." />
        {!isSingleState && <CountChart title="Complaints by state" data={data?.by_state} empty="No state volumes yet." />}
        {!isSingleState && <CountChart title="Complaints by zone" data={data?.by_zone} empty="No zone volumes yet." />}
        {!isSingleState && <DaysChart title="Average resolution time by state" data={data?.avg_resolution_by_state} />}
        {!isSingleState && <DaysChart title="Average resolution time by zone" data={data?.avg_resolution_by_zone} />}
        <CountChart title="Open complaints by status" data={data?.open_by_status} empty="No open complaints." className="xl:col-span-2" />
      </div>
    </>
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

  const displayTitle = title || (excludeServicom ? "State Office Complaints Analytics" : "Complaint Register Analytics");
  const displaySubtitle = subtitle || (excludeServicom
    ? "Volume, sources, issue patterns, and resolution performance for state-level complaints"
    : "Volume, sources, issue patterns, resolution performance, SLA compliance and escalation");

  const stateCoordinatorBanner = stateLocked ? (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 border border-[#d4e8dc] px-4 py-3 rounded-sm shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-sm bg-[#1a7a52] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-[#0f3d2e] tracking-tight">
              {activeStateName} State Complaints Dashboard
            </h3>
            <Badge variant="outline" className="border-[#1a7a52] text-[#1a7a52] bg-emerald-50 text-[10px] font-bold">
              State Office
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolution performance, SLA tracking, and complaint patterns for {activeStateName} State
          </p>
        </div>
      </div>
      <Badge className="bg-[#1a7a52] text-white font-bold text-xs px-2.5 py-1 rounded-sm shrink-0">
        {activeStateName} State
      </Badge>
    </div>
  ) : null;

  if (embedded) {
    return (
      <div className="space-y-4">
        {stateCoordinatorBanner}
        <div className="rounded-sm border border-[#d4e8dc] bg-white shadow-2xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 bg-[#f4f7f5] border-b border-[#d4e8dc]">
            <div className="flex items-center gap-2.5">
              <FilterIcon className="w-4 h-4 text-[#1a7a52]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    {displayTitle}
                  </span>
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-[#1a7a52] text-white text-[10px] font-bold px-1.5 py-0 rounded-full">
                      {activeFiltersCount} Active
                    </Badge>
                  )}
                </div>
                {subtitle && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{displaySubtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-sm px-2"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={load}
                disabled={loading}
                className="h-7 gap-1.5 text-xs rounded-sm border-slate-300 text-slate-700 hover:bg-[#f4f7f5]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>
          {filters}
        </div>
        {body}
        {drillPanel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stateCoordinatorBanner}
      <div className="rounded-sm border border-[#d4e8dc] bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 bg-[#f4f7f5] border-b border-[#d4e8dc]">
          <div className="flex items-center gap-2.5">
            <FilterIcon className="w-4 h-4 text-[#1a7a52]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {displayTitle}
                </span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-[#1a7a52] text-white text-[10px] font-bold px-1.5 py-0 rounded-full">
                    {activeFiltersCount} Active
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {displaySubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-sm px-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="h-7 gap-1.5 text-xs rounded-sm border-slate-300 text-slate-700 hover:bg-[#f4f7f5]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
        {filters}
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
            <Bar dataKey="days" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashChartCard>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate block">
        {label}
      </Label>
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
      <SelectTrigger className="h-8.5 text-xs bg-white hover:bg-slate-50 border-[#d4e8dc] rounded-sm" displayValue={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
