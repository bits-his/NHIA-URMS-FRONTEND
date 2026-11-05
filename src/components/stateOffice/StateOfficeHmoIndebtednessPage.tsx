import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useListSearch } from "./useListSearch";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { RegisterStatsCards } from "./RegisterStatsCards";
import {
  ArrowLeft, Plus, Eye, Pencil, RefreshCw, Loader2, Save, Trash2,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { RootState } from "@/src/store/store";
import { stateOfficeHmoIndebtednessApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import HcfFacilitySelect from "../servicom/HcfFacilitySelect";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";

/** Same field chrome as HCF Customer Satisfaction / Weekly Compliance */
const inputStyling =
  "h-11 w-full rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a7a52] transition-colors";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  /** When true, hide page chrome (hub provides header/tabs). */
  embedded?: boolean;
  onChromeChange?: (chrome: {
    mode: "list" | "form" | "detail";
    title?: string;
    onInnerBack?: () => void;
    actions?: React.ReactNode;
  } | null) => void;
}

type Geo = { id?: number | string; code?: string; zonal_code?: string; description: string };
type Mode = "list" | "create" | "edit" | "view";
type Line = {
  _key: string;
  hmo_name: string;
  facility_name: string;
  hcf_code: string;
  nhia_cap: string;
  nhia_ffs: string;
  phi: string;
  hmo_id?: string;
  facility_id?: string;
};

const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): Line => ({
  _key: uid(),
  hmo_name: "",
  facility_name: "",
  hcf_code: "",
  nhia_cap: "",
  nhia_ffs: "",
  phi: "",
});

/** Zone PK is zonal_code. */
function zoneIdOf(o: Geo) {
  return String(o.zonal_code ?? o.id ?? "");
}
/** State PK is code — never prefer zonal_code (that is the parent zone). */
function stateIdOf(o: Geo) {
  return String(o.code ?? o.id ?? "");
}
function money(v: string | number | null | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function naira(v: string | number | null | undefined) {
  return money(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function lineTotal(l: { nhia_cap?: string | number; nhia_ffs?: string | number; phi?: string | number }) {
  return money(l.nhia_cap) + money(l.nhia_ffs) + money(l.phi);
}
function pickGeoLabel(options: Geo[], value: string, fallback: string, idOf: (o: Geo) => string = zoneIdOf) {
  if (!value) return fallback;
  return options.find((o) => idOf(o) === value)?.description ?? fallback;
}

export default function StateOfficeHmoIndebtednessPage({ defaultStateId, defaultZoneId, embedded = false, onChromeChange }: Props) {
  const { canCreate } = useStateOfficeAccess();
  const user = useSelector((s: RootState) => s.auth.user) as any;
  const officerName = String(user?.name || "").trim();
  const [mode, setMode] = React.useState<Mode>("list");
  const [formKey] = React.useState(0);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | string | null>(null);
  const [refId, setRefId] = React.useState<string | null>(null);
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [periodYear, setPeriodYear] = React.useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = React.useState(String(new Date().getMonth() + 1));
  const [lines, setLines] = React.useState<Line[]>([]);
  const [entry, setEntry] = React.useState<Line>(emptyLine());
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [submittedBy, setSubmittedBy] = React.useState("");
  const [expandedHmos, setExpandedHmos] = React.useState<Record<string, boolean>>({});
  const [viewHmoName, setViewHmoName] = React.useState("");
  const [viewSheets, setViewSheets] = React.useState<any[]>([]);
  const [loadingViewSheets, setLoadingViewSheets] = React.useState(false);

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear !== "all" ? filterYear : undefined,
    month: filterMonth !== "all" ? filterMonth : undefined,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeHmoIndebtednessApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load collation sheets", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => { if (defaultZoneId) setFilterZone(defaultZoneId); }, [defaultZoneId]);
  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    const request = zid ? stockApi.getStates(zid) : stockApi.getStates();
    request.then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);
  React.useEffect(() => {
    if (!zoneId) { setStates([]); return; }
    stockApi.getStates(zoneId).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [zoneId]);

  const { search, setSearch, matchesSearch } = useListSearch();
  const hmoRows = React.useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      stateId: string;
      stateName: string;
      periods: string[];
      hcfCount: number;
      total: number;
      latest: any;
    }>();
    for (const row of rows) {
      const byHmo = new Map<string, any[]>();
      for (const line of row.lines ?? []) {
        const name = String(line.hmo_name || "").trim() || "Unassigned HMO";
        if (!byHmo.has(name)) byHmo.set(name, []);
        byHmo.get(name)!.push(line);
      }
      const stateId = String(row.state_id);
      const stateName = row.state?.description ?? "—";
      const period = `${monthLabel(row.reporting_month)} ${row.reporting_year}`;
      for (const [name, hmoLines] of byHmo) {
        const key = `${name.toLowerCase()}::${stateId}`;
        const total = hmoLines.reduce((sum: number, line: any) => sum + money(line.total), 0);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            key,
            name,
            stateId,
            stateName,
            periods: [period],
            hcfCount: hmoLines.length,
            total,
            latest: row,
          });
        } else {
          if (!existing.periods.includes(period)) existing.periods.push(period);
          existing.hcfCount += hmoLines.length;
          existing.total += total;
          const newer =
            Number(row.reporting_year) > Number(existing.latest.reporting_year)
            || (Number(row.reporting_year) === Number(existing.latest.reporting_year)
              && Number(row.reporting_month) >= Number(existing.latest.reporting_month));
          if (newer) existing.latest = row;
        }
      }
    }
    return Array.from(map.values()).filter(matchesSearch).sort((a, b) =>
      a.stateName.localeCompare(b.stateName) || a.name.localeCompare(b.name),
    );
  }, [rows, matchesSearch]);

  const sheetTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const applyRow = (row: any, focusHmo?: string) => {
    setEditingId(row.reference_id || row.id);
    setRefId(row.reference_id);
    setZoneId(String(row.zonal_code ?? row.zone_id ?? ""));
    setStateId(String(row.state_code ?? row.state_id ?? ""));
    setPeriodYear(String(row.reporting_year));
    setPeriodMonth(String(row.reporting_month));
    setSubmittedBy(row.submitted_by ?? "");
    const mapped: Line[] = (row.lines ?? []).map((l: any) => ({
      _key: uid(),
      hmo_name: l.hmo_name ?? "",
      facility_name: l.facility_name ?? "",
      hcf_code: l.hcf_code ?? "",
      nhia_cap: String(l.nhia_cap ?? ""),
      nhia_ffs: String(l.nhia_ffs ?? ""),
      phi: String(l.phi ?? ""),
    }));
    setLines(mapped);
    setEntry(emptyLine());
    setEditingKey(null);
    const focus = (focusHmo || viewHmoName || "").trim();
    if (focus) setViewHmoName(focus);
    const open: Record<string, boolean> = {};
    mapped.forEach((l) => {
      const name = l.hmo_name.trim();
      if (!name) return;
      if (!focus || name.toLowerCase() === focus.toLowerCase()) open[name] = true;
    });
    setExpandedHmos(open);
  };

  const viewSiblingSheets = React.useMemo(() => {
    const needle = viewHmoName.trim().toLowerCase();
    if (!needle || !stateId) return [] as any[];
    const source = viewSheets.length ? viewSheets : rows;
    return source.filter((r) =>
      String(r.state_id) === stateId
      && (r.lines ?? []).some((l: any) => String(l.hmo_name || "").trim().toLowerCase() === needle),
    );
  }, [viewSheets, rows, viewHmoName, stateId]);

  const viewPeriodOptions = React.useMemo(() => {
    const set = new Set<string>();
    viewSiblingSheets.forEach((r) => set.add(`${r.reporting_year}-${r.reporting_month}`));
    return Array.from(set)
      .map((key) => {
        const [year, month] = key.split("-");
        return { key, year, month, label: `${monthLabel(month)} ${year}` };
      })
      .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.month) - Number(a.month));
  }, [viewSiblingSheets]);

  const switchViewPeriod = (nextYear: string, nextMonth: string) => {
    const match = viewSiblingSheets.find((r) =>
      String(r.state_id) === stateId
      && String(r.reporting_year) === nextYear
      && String(r.reporting_month) === nextMonth,
    );
    if (match) {
      applyRow(match, viewHmoName);
      return;
    }
    toast.message("No collation for this HMO in the selected period.");
  };

  const openHmoView = async (sheet: any, hmoName: string) => {
    applyRow(sheet, hmoName);
    setViewHmoName(hmoName);
    setMode("view");
    setLoadingViewSheets(true);
    try {
      const res = await stateOfficeHmoIndebtednessApi.list({
        zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
        state_id: String(sheet.state_id),
      });
      const needle = hmoName.trim().toLowerCase();
      setViewSheets((res.data ?? []).filter((r: any) =>
        String(r.state_id) === String(sheet.state_id)
        && (r.lines ?? []).some((l: any) => String(l.hmo_name || "").trim().toLowerCase() === needle),
      ));
    } catch {
      setViewSheets([sheet]);
    } finally {
      setLoadingViewSheets(false);
    }
  };

  const listColumns = React.useMemo((): ColumnDef<(typeof hmoRows)[number]>[] => [
    { id: "hmo", header: "HMO", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{row.original.name}</span> },
    { id: "state", header: "State", cell: ({ row }) => <span className="text-xs">{row.original.stateName}</span> },
    {
      id: "period",
      header: "Period",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className="text-xs text-slate-500">
            {item.periods.length === 1 ? item.periods[0] : `${item.periods[0]} · ${item.periods.length} periods`}
          </span>
        );
      },
    },
    { id: "hcfs", header: "HCFs", cell: ({ row }) => <span className="text-xs">{row.original.hcfCount}</span> },
    { id: "total", header: "Total", cell: ({ row }) => <span className="text-xs font-mono font-semibold">₦{naira(row.original.total)}</span> },
    {
      id: "view",
      header: "View",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-[#145c3f]"
          onClick={(e) => { e.stopPropagation(); void openHmoView(row.original.latest, row.original.name); }}
        >
          <Eye className="w-4 h-4" /> View
        </Button>
      ),
    },
  ], [openHmoView]);

  const linesByHmo = React.useMemo(() => {
    const map = new Map<string, Line[]>();
    const focus = viewHmoName.trim().toLowerCase();
    lines.forEach((l) => {
      const key = l.hmo_name.trim() || "Unassigned HMO";
      if (mode === "view" && focus && key.toLowerCase() !== focus) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });
    return Array.from(map.entries());
  }, [lines, viewHmoName, mode]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setRefId(null);
    setZoneId(defaultZoneId ?? "");
    setStateId(defaultStateId ?? "");
    setPeriodYear(filterYear !== "all" ? filterYear : String(new Date().getFullYear()));
    setPeriodMonth(filterMonth !== "all" ? filterMonth : String(new Date().getMonth() + 1));
    setSubmittedBy("");
    setLines([]);
    setEntry(emptyLine());
    setEditingKey(null);
    setMode("create");
  };

  const resetEntry = () => {
    setEntry(emptyLine());
    setEditingKey(null);
  };

  const saveEntry = (): boolean => {
    if (!entry.hmo_name.trim()) { toast.error("Select an HMO"); return false; }
    if (!entry.facility_name.trim()) { toast.error("Select a facility (HCF)"); return false; }
    const next = editingKey
      ? lines.map((l) => (l._key === editingKey ? { ...entry, _key: editingKey } : l))
      : [...lines, { ...entry, _key: uid() }];
    setLines(next);
    setExpandedHmos((p) => ({ ...p, [entry.hmo_name.trim()]: true }));
    resetEntry();
    return true;
  };

  const editEntry = (key: string) => {
    const l = lines.find((x) => x._key === key);
    if (!l) return;
    setEntry({ ...l });
    setEditingKey(key);
  };

  const backToList = React.useCallback(() => {
    setViewHmoName("");
    setViewSheets([]);
    setEditingId(null);
    setMode("list");
  }, []);

  const leaveForm = () => {
    if (mode === "edit") {
      setMode("view");
      return;
    }
    backToList();
  };

  const handleSave = async () => {
    if (!zoneId || !stateId) {
      toast.error("Zone and state are required.");
      return;
    }
    const valid = lines.filter((l) => l.hmo_name.trim() && l.facility_name.trim());
    if (!valid.length) {
      toast.error("Add at least one HMO–facility entry.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        zone_id: zoneId,
        state_id: stateId,
        zonal_code: zoneId,
        state_code: stateId,
        reporting_year: Number(periodYear),
        reporting_month: Number(periodMonth),
        submitted_by: officerName || submittedBy || undefined,
        status: "submitted",
        lines: valid.map((l) => ({
          hmo_name: l.hmo_name,
          facility_name: l.facility_name,
          hcf_code: l.hcf_code,
          nhia_cap: money(l.nhia_cap),
          nhia_ffs: money(l.nhia_ffs),
          phi: money(l.phi),
        })),
      };
      if (mode === "edit" && editingId) {
        await stateOfficeHmoIndebtednessApi.update(editingId, payload);
        toast.success("Collation sheet updated");
      } else {
        await stateOfficeHmoIndebtednessApi.create(payload);
        toast.success("Collation sheet saved");
      }
      backToList();
    } catch (e: any) {
      toast.error("Failed to save sheet", { description: e.message });
    } finally { setSaving(false); }
  };

  const headerFields = (
    <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
      <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-800">Collation Sheet Details</CardTitle>
          {refId ? (
            <Badge variant="outline" className="text-[10px] font-bold border-[#1a7a52] text-[#1a7a52] bg-white font-mono">
              #{refId}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Zone *</Label>
            <Select value={zoneId} disabled={zoneLocked} onValueChange={(v) => { setZoneId(v); if (!stateLocked) setStateId(""); }}>
              <SelectTrigger displayValue={pickGeoLabel(zones, zoneId, "Select zone", zoneIdOf)}><SelectValue /></SelectTrigger>
              <SelectContent>{zones.map((z) => { const id = zoneIdOf(z); return <SelectItem key={id} value={id}>{z.description}</SelectItem>; })}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">State *</Label>
            <Select value={stateId} disabled={stateLocked || !zoneId} onValueChange={setStateId}>
              <SelectTrigger displayValue={pickGeoLabel(states, stateId, zoneId ? "Select state" : "Select zone first", stateIdOf)}><SelectValue /></SelectTrigger>
              <SelectContent>{states.map((s) => { const id = stateIdOf(s); return <SelectItem key={id} value={id}>{s.description}</SelectItem>; })}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Year *</Label>
            <Select value={periodYear} onValueChange={setPeriodYear}>
              <SelectTrigger displayValue={periodYear}><SelectValue /></SelectTrigger>
              <SelectContent>{buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Month *</Label>
            <Select value={periodMonth} onValueChange={setPeriodMonth}>
              <SelectTrigger displayValue={monthLabel(periodMonth)}><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const entryForm = (
    <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
      <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Alleged Indebtedness Entry
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-bold border-[#1a7a52] text-[#1a7a52] bg-white">
            Sheet total ₦{naira(sheetTotal)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-3 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">HMO *</Label>
            <AccreditedProviderSelect
              type="hmo"
              value={entry.hmo_id}
              placeholder="Select HMO"
              onChange={(p) => setEntry((prev) => ({
                ...prev, hmo_id: p?.id ?? "", hmo_name: p?.name ?? "",
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Facility (HCF) *</Label>
            <HcfFacilitySelect
              stateId={stateId || undefined}
              value={entry.facility_id}
              fallbackLabel={entry.facility_name}
              includeCodeInLabel={false}
              placeholder={stateId ? "Select facility" : "Select a state first"}
              onChange={(f) => setEntry((prev) => ({
                ...prev,
                facility_id: f?.id ?? "",
                facility_name: f?.name ?? "",
                hcf_code: f?.code || f?.facility_code || prev.hcf_code,
              }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">NHIA CAP (₦)</Label>
            <input
              type="number" min={0} step="0.01"
              value={entry.nhia_cap}
              onChange={(e) => setEntry((prev) => ({ ...prev, nhia_cap: e.target.value }))}
              className={inputStyling}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">NHIA FFS (₦)</Label>
            <input
              type="number" min={0} step="0.01"
              value={entry.nhia_ffs}
              onChange={(e) => setEntry((prev) => ({ ...prev, nhia_ffs: e.target.value }))}
              className={inputStyling}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">PHI (₦)</Label>
            <input
              type="number" min={0} step="0.01"
              value={entry.phi}
              onChange={(e) => setEntry((prev) => ({ ...prev, phi: e.target.value }))}
              className={inputStyling}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Line total</Label>
            <div className="h-11 flex items-center rounded-sm border-2 border-[#d4e8dc] bg-[#f4f7f5] px-3.5 text-sm font-bold font-mono text-[#1a7a52]">
              ₦{naira(lineTotal(entry))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-[#d4e8dc]">
          {editingKey && (
            <Button type="button" variant="outline" className="rounded-sm border-slate-300" onClick={resetEntry}>Cancel edit</Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-sm border-[#1a7a52] text-[#1a7a52] hover:bg-[#e8f5ee]"
            onClick={() => {
              if (saveEntry()) toast.success(editingKey ? "Entry updated" : "Entry added");
            }}
          >
            <Plus className="w-4 h-4" /> {editingKey ? "Update entry" : "Add entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const addedEntries = lines.length > 0 ? (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-600">
        Added entries · {linesByHmo.length} HMO{linesByHmo.length === 1 ? "" : "s"} · {lines.length} HCF{lines.length === 1 ? "" : "s"}
      </p>
      {linesByHmo.map(([hmo, hcfLines]) => {
        const open = expandedHmos[hmo] !== false;
        const hmoTotal = hcfLines.reduce((s, l) => s + lineTotal(l), 0);
        return (
          <Card key={hmo} className="rounded-sm border border-slate-200/80 shadow-xs overflow-hidden bg-white p-0 gap-0">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[#f4f7f5] border-b border-slate-200 text-left"
              onClick={() => setExpandedHmos((p) => ({ ...p, [hmo]: !open }))}
            >
              <span className="text-sm font-bold text-slate-800 inline-flex items-center gap-2 min-w-0">
                {open ? <ChevronDown className="w-4 h-4 shrink-0 text-[#1a7a52]" /> : <ChevronRight className="w-4 h-4 shrink-0 text-[#1a7a52]" />}
                <span className="truncate">{hmo}</span>
              </span>
              <span className="text-[10px] font-bold text-[#1a7a52] shrink-0">
                {hcfLines.length} HCF{hcfLines.length === 1 ? "" : "s"} · ₦{naira(hmoTotal)}
              </span>
            </button>
            {open && (
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="text-xs font-bold">Facility (HCF)</TableHead>
                      <TableHead className="text-xs font-bold">Code</TableHead>
                      <TableHead className="text-xs font-bold text-right">CAP</TableHead>
                      <TableHead className="text-xs font-bold text-right">FFS</TableHead>
                      <TableHead className="text-xs font-bold text-right">PHI</TableHead>
                      <TableHead className="text-xs font-bold text-right">Total</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hcfLines.map((l) => (
                      <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                        <TableCell className="text-sm">{l.facility_name || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{l.hcf_code || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_cap)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_ffs)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.phi)}</TableCell>
                        <TableCell className="text-sm font-mono font-bold text-right text-[#145c3f]">₦{naira(lineTotal(l))}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]" onClick={() => editEntry(l._key)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                            onClick={() => {
                              setLines((prev) => prev.filter((x) => x._key !== l._key));
                              if (editingKey === l._key) resetEntry();
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  ) : null;

  React.useEffect(() => {
    if (!embedded || !onChromeChange) return;
    if (mode === "list") {
      onChromeChange({
        mode: "list",
        actions: (
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> New Collation Sheet
              </Button>
            )}
          </>
        ),
      });
      return;
    }
    onChromeChange({
      mode: mode === "view" ? "detail" : "form",
      title:
        mode === "view"
          ? (viewHmoName || "Collation Sheet")
          : mode === "edit"
            ? "Edit Collation Sheet"
            : "New Collation Sheet",
      onInnerBack: () => {
        if (mode === "view") backToList();
        else if (mode === "edit") setMode("view");
        else backToList();
      },
      actions: mode === "view" && canCreate ? (
        <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={() => setMode("edit")}>
          <Pencil className="w-4 h-4" /> Edit
        </Button>
      ) : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, onChromeChange, mode, loading, canCreate, viewHmoName, backToList]);

  React.useEffect(() => () => onChromeChange?.(null), [onChromeChange]);

  if (mode === "view") {
    const viewLines = linesByHmo.flatMap(([, hcfLines]) => hcfLines);
    const capTotal = viewLines.reduce((s, l) => s + money(l.nhia_cap), 0);
    const ffsTotal = viewLines.reduce((s, l) => s + money(l.nhia_ffs), 0);
    const phiTotal = viewLines.reduce((s, l) => s + money(l.phi), 0);
    const viewTotal = viewLines.reduce((s, l) => s + lineTotal(l), 0);
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={backToList}
                className="rounded-full shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">{viewHmoName || "Collation Sheet"}</h2>
            </div>
            {canCreate && (
              <Button className="bg-orange-action hover:bg-orange-600 gap-2 shrink-0" onClick={() => setMode("edit")}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="w-full px-3 md:px-4 py-3 space-y-3 pb-8">
            <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
              <CardContent className="p-2 md:p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Select
                    value={periodYear}
                    onValueChange={(y) => {
                      const sameMonth = viewPeriodOptions.find((p) => p.year === y && p.month === periodMonth);
                      const fallback = viewPeriodOptions.find((p) => p.year === y);
                      const next = sameMonth || fallback;
                      if (next) switchViewPeriod(next.year, next.month);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(viewPeriodOptions.map((p) => p.year))).map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Month</Label>
                  <Select
                    value={periodMonth}
                    onValueChange={(m) => switchViewPeriod(periodYear, m)}
                  >
                    <SelectTrigger displayValue={monthLabel(periodMonth)}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {viewPeriodOptions
                        .filter((p) => p.year === periodYear)
                        .map((p) => (
                          <SelectItem key={p.key} value={p.month}>{monthLabel(p.month)}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 bg-white border border-[#d4e8dc] rounded-xl px-4 py-3">
              <span><span className="text-slate-400">CAP</span> ₦{naira(capTotal)}</span>
              <span><span className="text-slate-400">FFS</span> ₦{naira(ffsTotal)}</span>
              <span><span className="text-slate-400">PHI</span> ₦{naira(phiTotal)}</span>
              <span className="font-semibold text-[#145c3f]">Total ₦{naira(viewTotal)}</span>
              {submittedBy ? <span className="text-slate-400">Prepared by {submittedBy}</span> : null}
            </div>

            <div className="space-y-3">
              {linesByHmo.map(([hmo, hcfLines]) => {
                const open = expandedHmos[hmo] !== false;
                const hmoCap = hcfLines.reduce((s, l) => s + money(l.nhia_cap), 0);
                const hmoFfs = hcfLines.reduce((s, l) => s + money(l.nhia_ffs), 0);
                const hmoPhi = hcfLines.reduce((s, l) => s + money(l.phi), 0);
                return (
                  <Card key={hmo} className="rounded-xl border border-slate-200 overflow-hidden shadow-none">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 text-left hover:bg-slate-100/80"
                      onClick={() => setExpandedHmos((p) => ({ ...p, [hmo]: !open }))}
                    >
                      <span className="font-medium text-slate-800 inline-flex items-center gap-2 min-w-0">
                        {open ? <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />}
                        <span className="truncate">{hmo}</span>
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {hcfLines.length} HCF{hcfLines.length === 1 ? "" : "s"} · ₦{naira(hmoCap + hmoFfs + hmoPhi)}
                      </span>
                    </button>
                    {open && (
                      <CardContent className="p-0 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs font-medium text-slate-500">Facility</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500">Code</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500 text-right">CAP</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500 text-right">FFS</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500 text-right">PHI</TableHead>
                              <TableHead className="text-xs font-medium text-slate-500 text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {hcfLines.map((l) => (
                              <TableRow key={l._key}>
                                <TableCell className="text-sm text-slate-700">{l.facility_name || "—"}</TableCell>
                                <TableCell className="text-xs font-mono text-slate-500">{l.hcf_code || "—"}</TableCell>
                                <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_cap)}</TableCell>
                                <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_ffs)}</TableCell>
                                <TableCell className="text-sm font-mono text-right">₦{naira(l.phi)}</TableCell>
                                <TableCell className="text-sm font-mono text-right text-slate-800">₦{naira(lineTotal(l))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div key={formKey} className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={mode === "edit" ? () => setMode("view") : leaveForm} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e]">HMO Indebtedness Collation</h2>
            </div>
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="w-full px-3 md:px-4 py-3 space-y-3 pb-8">
            {headerFields}
            {entryForm}
            {addedEntries}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={mode === "edit" ? () => setMode("view") : leaveForm}
                className="rounded-sm border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold gap-2 rounded-sm"
                onClick={() => {
                  const hasDraft = !!(
                    entry.hmo_name || entry.facility_name || entry.hcf_code
                    || entry.nhia_cap || entry.nhia_ffs || entry.phi
                  );
                  if (editingKey || hasDraft) {
                    if (!saveEntry()) return;
                  }
                  void handleSave();
                }}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {mode === "edit" ? "Update Sheet" : "Submit Sheet"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">HMO Indebtedness Collation</h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> New Collation Sheet
              </Button>
            )}
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="w-full px-3 md:px-4 py-3 space-y-3">
          <RegisterStatsCards
            loading={loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              { label: "HMOs", value: hmoRows.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              {
                label: "HCFs",
                value: hmoRows.reduce((sum, r) => sum + Number(r.hcfCount || 0), 0),
                tone: "text-slate-600 bg-white border-slate-200",
              },
              {
                label: "States",
                value: new Set(hmoRows.map((r) => r.stateId)).size,
                tone: "text-teal-800 bg-teal-50/80 border-teal-100",
              },
              {
                label: "Total (₦)",
                value: naira(hmoRows.reduce((sum, r) => sum + Number(r.total || 0), 0)),
                tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
              },
            ]}
          />

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); }}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone", zoneIdOf)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => { const id = zoneIdOf(z); return <SelectItem key={id} value={id}>{z.description}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger size="sm" className="w-full" displayValue={stateLocked ? pickGeoLabel(dashboardStates, filterState, "State", stateIdOf) : (filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State", stateIdOf))}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => { const id = stateIdOf(s); return <SelectItem key={id} value={id}>{s.description}</SelectItem>; })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="HMO INDEBTEDNESS REGISTER"
            columns={listColumns}
            data={hmoRows}
            loading={loading}
            searchPlaceholder="Search HMOs..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage="No HMO indebtedness for this period."
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
