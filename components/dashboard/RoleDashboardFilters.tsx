import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "@/src/components/monthly/reportingYears";
import { MONTHS, monthLabel } from "@/src/components/stateOffice/constants";

export type RoleDashboardScope = {
  year?: string;
  month?: string;
  zone_id?: string;
  state_id?: string;
};

export type RoleDashboardFiltersOptions = {
  /** Lock zone to user's assigned zone (zonal / state roles) */
  lockZoneId?: string | null;
  /** Lock state to user's assigned state */
  lockStateId?: string | null;
  showZone?: boolean;
  showState?: boolean;
  /** Client-side performance band filter */
  showBand?: boolean;
};

const currentYear = () => String(new Date().getFullYear());
const currentMonth = () => String(new Date().getMonth() + 1);

export function useRoleDashboardFilters(opts: RoleDashboardFiltersOptions = {}) {
  const {
    lockZoneId = null,
    lockStateId = null,
    showZone = false,
    showState = false,
    showBand = false,
  } = opts;

  const [year, setYear] = React.useState(currentYear);
  const [month, setMonth] = React.useState(currentMonth);
  const [zoneId, setZoneId] = React.useState(lockZoneId ? String(lockZoneId) : "all");
  const [stateId, setStateId] = React.useState(lockStateId ? String(lockStateId) : "all");
  const [band, setBand] = React.useState("all");
  const [zones, setZones] = React.useState<{ id: number | string; description: string }[]>([]);
  const [states, setStates] = React.useState<{ id: number | string; description: string }[]>([]);

  React.useEffect(() => {
    if (!showZone && !lockZoneId) return;
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, [showZone, lockZoneId]);

  React.useEffect(() => {
    if (!showState && !lockStateId) return;
    if (lockStateId) return;
    const zoneArg = lockZoneId
      ? String(lockZoneId)
      : (zoneId !== "all" ? zoneId : undefined);
    stockApi.getStates(zoneArg).then((r) => setStates(r.data || [])).catch(() => setStates([]));
  }, [showState, lockStateId, lockZoneId, zoneId]);

  React.useEffect(() => {
    if (lockZoneId) setZoneId(String(lockZoneId));
  }, [lockZoneId]);

  React.useEffect(() => {
    if (lockStateId) setStateId(String(lockStateId));
  }, [lockStateId]);

  const apiFilters = React.useMemo((): RoleDashboardScope => {
    const f: RoleDashboardScope = { year, month };
    if (lockZoneId) f.zone_id = String(lockZoneId);
    else if (showZone && zoneId !== "all") f.zone_id = zoneId;
    if (lockStateId) f.state_id = String(lockStateId);
    else if (showState && stateId !== "all") f.state_id = stateId;
    return f;
  }, [year, month, zoneId, stateId, lockZoneId, lockStateId, showZone, showState]);

  /** Drill API expects month as YYYY-MM */
  const drillScope = React.useMemo(() => ({
    zone_id: apiFilters.zone_id,
    state_id: apiFilters.state_id,
    month: `${year}-${String(month).padStart(2, "0")}`,
  }), [apiFilters.zone_id, apiFilters.state_id, year, month]);

  const years = React.useMemo(() => buildReportingYearOptions(), []);

  const isDirty = year !== currentYear()
    || month !== currentMonth()
    || (!lockZoneId && showZone && zoneId !== "all")
    || (!lockStateId && showState && stateId !== "all")
    || (showBand && band !== "all");

  const clear = () => {
    setYear(currentYear());
    setMonth(currentMonth());
    if (!lockZoneId) setZoneId("all");
    if (!lockStateId) setStateId("all");
    setBand("all");
  };

  return {
    year, setYear,
    month, setMonth,
    zoneId, setZoneId,
    stateId, setStateId,
    band, setBand,
    zones, states,
    years,
    apiFilters,
    drillScope,
    isDirty,
    clear,
    showZone: showZone && !lockZoneId,
    showState: showState && !lockStateId,
    showBand,
    lockZoneId,
    lockStateId,
  };
}

type FilterState = ReturnType<typeof useRoleDashboardFilters>;

/** Shared period / geo / band filter bar for role home dashboards */
export function RoleDashboardFilters({ filters }: { filters: FilterState }) {
  const {
    year, setYear, month, setMonth,
    zoneId, setZoneId, stateId, setStateId,
    band, setBand, zones, states, years,
    showZone, showState, showBand, isDirty, clear,
  } = filters;

  const zoneLabel = zoneId === "all"
    ? "All Zones"
    : (zones.find((z) => String(z.id) === zoneId)?.description ?? "Zone");
  const stateLabel = stateId === "all"
    ? "All States"
    : (states.find((s) => String(s.id) === stateId)?.description ?? "State");
  const bandLabel = band === "all" ? "All bands"
    : band === "performing" ? "Performing"
      : band === "lagging" ? "Lagging"
        : "Needs intervention";

  return (
    <div className="rounded-2xl border border-[#d4e8dc] bg-white p-3 md:p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-full" displayValue={year}>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-full" displayValue={monthLabel(month)}>
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showZone && (
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Zone</Label>
            <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setStateId("all"); }}>
              <SelectTrigger className="h-9 w-full" displayValue={zoneLabel}>
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showState && (
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">State</Label>
            <Select value={stateId} onValueChange={setStateId}>
              <SelectTrigger className="h-9 w-full" displayValue={stateLabel}>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showBand && (
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Performance band</Label>
            <Select value={band} onValueChange={setBand}>
              <SelectTrigger className="h-9 w-full" displayValue={bandLabel}>
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All bands</SelectItem>
                <SelectItem value="performing">Performing</SelectItem>
                <SelectItem value="lagging">Lagging</SelectItem>
                <SelectItem value="needs_intervention">Needs intervention</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {isDirty && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" className="h-9 text-slate-500 gap-1" onClick={clear}>
              <X className="w-3.5 h-3.5" /> Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
