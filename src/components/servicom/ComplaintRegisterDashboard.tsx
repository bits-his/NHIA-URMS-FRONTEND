/**
 * Complaint Register dashboard — SERVICOM / Enforcement officers.
 * Spec: volume, sources, issue patterns, resolution performance, SLA, escalation.
 */
import * as React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  /** When true, omit outer card chrome (used as a section inside SERVICOM dashboard). */
  embedded?: boolean;
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

export default function ComplaintRegisterDashboard({
  defaultStateId, defaultZoneId, lockLocation = false, embedded = false,
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
  const [route, setRoute] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  React.useEffect(() => {
    if (stateLocked) return;
    zonesApi.list().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, [stateLocked]);

  React.useEffect(() => {
    if (stateLocked) return;
    const zoneArg = filterZone === "all" ? undefined : filterZone;
    statesApi.list(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [filterZone, stateLocked]);

  const scope = React.useMemo(() => {
    const isHq = locationLevel === "hq";
    const zonal = !isHq
      ? (defaultZoneId || (filterZone !== "all" ? filterZone : undefined))
      : undefined;
    const state = !isHq
      ? (defaultStateId || (filterState !== "all" ? filterState : undefined))
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
      route: route === "all" ? undefined : route,
      status: status === "all" ? undefined : status,
    };
  }, [
    locationLevel, defaultStateId, defaultZoneId, filterState, filterZone,
    year, month, date, domain, priority, category, type, route, status,
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
      status: scope.status,
    },
  );

  const drillCtx = React.useMemo(() => ({
    subtitle: "Complaint register",
    breadcrumbs: ["SERVICOM", "Complaint register"],
  }), []);

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

  const filters = (
    <div className="space-y-3">
      <FilterGroup title="Period" note="Date / Month / Year">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Filter label="Year">
            <Select
              value={year}
              onValueChange={(v) => { setYear(v); if (v !== "all") setDate(""); }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y === "all" ? "All years" : y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Month">
            <Select
              value={month}
              onValueChange={(v) => { setMonth(v); if (v !== "all") setDate(""); }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Filter>
          <Filter label="Date">
            <Input
              className="h-9"
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
        </div>
      </FilterGroup>

      <FilterGroup title="Location" note="State / Zone / HQ">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {!stateLocked && !zoneLocked && (
            <Filter label="Level">
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
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  <SelectItem value="hq">HQ</SelectItem>
                  <SelectItem value="zone">Zone</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                </SelectContent>
              </Select>
            </Filter>
          )}
          {!stateLocked && locationLevel !== "hq" && (
            <Filter label="Zone">
              <Select
                value={filterZone}
                onValueChange={(v) => { setFilterZone(v); setFilterState("all"); }}
                disabled={zoneLocked}
              >
                <SelectTrigger className="h-9" displayValue={zoneLabel}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.zonal_code} value={String(z.zonal_code)}>{z.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
          )}
          {locationLevel !== "hq" && (
            <Filter label="State">
              <Select value={filterState} onValueChange={setFilterState} disabled={stateLocked}>
                <SelectTrigger className="h-9" displayValue={stateLabel}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={String(s.code)}>{s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Filter>
          )}
        </div>
      </FilterGroup>

      <FilterGroup title="Programs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-xl">
          <Filter label="Program">
            <Choice value={domain} onChange={setDomain} allLabel="All programs" options={COMPLAINT_DOMAINS} />
          </Filter>
        </div>
      </FilterGroup>

      <FilterGroup title="Case attributes" note="Priority, category, type, route, status">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          <Filter label="Priority">
            <Choice value={priority} onChange={setPriority} allLabel="All priorities" options={PRIORITY_RATINGS} />
          </Filter>
          <Filter label="Category">
            <Choice value={category} onChange={setCategory} allLabel="All categories" options={COMPLAINT_CATEGORIES} />
          </Filter>
          <Filter label="Type">
            <Choice value={type} onChange={setType} allLabel="All types" options={COMPLAINT_TYPES} />
          </Filter>
          <Filter label="Route">
            <Choice value={route} onChange={setRoute} allLabel="All routes" options={TRANSMISSION_ROUTES} />
          </Filter>
          <Filter label="Status">
            <Choice value={status} onChange={setStatus} allLabel="All statuses" options={COMPLAINT_STATUSES} />
          </Filter>
        </div>
      </FilterGroup>
    </div>
  );

  const body = loading ? (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading complaint dashboard…
    </div>
  ) : (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
        <DashKpi
          label="Complaints received"
          value={data?.received ?? 0}
          detail="In the current filter"
          onClick={() => openComplaints("Complaints received")}
        />
        <DashKpi
          label="Average resolution"
          value={data?.average_resolution != null ? `${data.average_resolution} days` : "—"}
          detail="Mean days to close"
          onClick={() => openComplaints("Closed complaints — resolution time", { kpi: "closed" })}
        />
        <DashKpi
          label="Resolved within SLA"
          value={data?.resolved_within_sla != null ? `${data.resolved_within_sla}%` : "—"}
          detail={`${data?.resolved_within_sla_count ?? 0} cases met the target`}
          onClick={() => openComplaints("Resolved within SLA", { kpi: "within_sla" })}
        />
        <DashKpi
          label="Pending complaints"
          value={data?.pending ?? 0}
          detail="Not resolved, closed, or withdrawn"
          onClick={() => openComplaints("Pending complaints", { kpi: "pending" })}
        />
        <DashKpi
          label="Top complaint category"
          value={data?.top_category || "—"}
          detail="Most common category"
          onClick={() => openComplaints(
            data?.top_category ? `Category: ${data.top_category}` : "Complaints by category",
            data?.top_category ? { category: data.top_category } : undefined,
          )}
        />
        <DashKpi
          label="Top complaint type"
          value={data?.top_type || "—"}
          detail="HCF, HMO, or enrollee"
          onClick={() => openComplaints(
            data?.top_type ? `Type: ${data.top_type}` : "Complaints by type",
            data?.top_type ? { type: data.top_type } : undefined,
          )}
        />
        <DashKpi
          label="Top transmission route"
          value={data?.top_route || "—"}
          detail="How the complaint arrived"
          onClick={() => openComplaints(
            data?.top_route ? `Route: ${data.top_route}` : "Complaints by route",
            data?.top_route ? { route: data.top_route } : undefined,
          )}
        />
        <DashKpi
          label="% overdue complaints"
          value={data?.overdue_percent != null ? `${data.overdue_percent}%` : "—"}
          detail="Open past the resolution target"
          onClick={() => openComplaints("Overdue / open complaints", { kpi: "overdue" })}
        />
        <DashKpi
          label="% resolution beyond SLA"
          value={data?.beyond_sla_percent != null ? `${data.beyond_sla_percent}%` : "—"}
          detail="Closed cases past the target"
          onClick={() => openComplaints("Resolved beyond SLA", { kpi: "beyond_sla" })}
        />
        <DashKpi
          label="Highest volume state"
          value={volumeLabel(data?.highest_state)}
          detail="Most complaints"
          onClick={() => openComplaints(
            data?.highest_state?.name ? `State: ${data.highest_state.name}` : "Complaints by state",
            data?.highest_state?.code
              ? { state_id: String(data.highest_state.code), state_code: String(data.highest_state.code) }
              : undefined,
          )}
        />
        <DashKpi
          label="Lowest volume state"
          value={volumeLabel(data?.lowest_state)}
          detail="Fewest complaints"
          onClick={() => openComplaints(
            data?.lowest_state?.name ? `State: ${data.lowest_state.name}` : "Complaints by state",
            data?.lowest_state?.code
              ? { state_id: String(data.lowest_state.code), state_code: String(data.lowest_state.code) }
              : undefined,
          )}
        />
        <DashKpi
          label="Highest volume zone"
          value={volumeLabel(data?.highest_zone)}
          detail="Most complaints"
          onClick={() => openComplaints(
            data?.highest_zone?.name ? `Zone: ${data.highest_zone.name}` : "Complaints by zone",
            data?.highest_zone?.code
              ? { zone_id: String(data.highest_zone.code), zonal_code: String(data.highest_zone.code) }
              : undefined,
          )}
        />
        <DashKpi
          label="Lowest volume zone"
          value={volumeLabel(data?.lowest_zone)}
          detail="Fewest complaints"
          onClick={() => openComplaints(
            data?.lowest_zone?.name ? `Zone: ${data.lowest_zone.name}` : "Complaints by zone",
            data?.lowest_zone?.code
              ? { zone_id: String(data.lowest_zone.code), zonal_code: String(data.lowest_zone.code) }
              : undefined,
          )}
        />
        <DashKpi
          label="Repeat complaint rate"
          value={data?.repeat_rate != null ? `${data.repeat_rate}%` : "—"}
          detail="Same complainant and facility or category"
          onClick={() => openComplaints("Repeat complaints", { kpi: "repeat" })}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <CountChart title="Complaints by programs" data={data?.by_domain} empty="No complaints in this filter." />
        <CountChart title="Complaints by respondent (complainant type)" data={data?.by_complainant} empty="No complainant types recorded." />
        <CountChart title="Complaints by resolution" data={data?.by_outcome} empty="No closed complaints in this filter." />
        <CountChart title="Top recurring issues" data={data?.top_issues} empty="No issue categories yet." />
        <CountChart title="Complaints by state" data={data?.by_state} empty="No state volumes yet." />
        <CountChart title="Complaints by zone" data={data?.by_zone} empty="No zone volumes yet." />
        <DaysChart title="Average resolution time by state" data={data?.avg_resolution_by_state} />
        <DaysChart title="Average resolution time by zone" data={data?.avg_resolution_by_zone} />
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

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        {filters}
        {body}
        {drillPanel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#d4e8dc] bg-white p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Complaint register</p>
            <p className="text-[11px] text-slate-500">
              Volume, sources, issue patterns, resolution performance, SLA compliance and escalation
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
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

function FilterGroup({
  title, note, children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e2efe8] bg-[#f8fbf9] px-3 py-2.5 space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#145c3f]">{title}</p>
        {note ? <p className="text-[10px] text-slate-500">{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <Label className="text-[11px] text-slate-500">{label}</Label>
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
      <SelectTrigger className="h-9" displayValue={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
