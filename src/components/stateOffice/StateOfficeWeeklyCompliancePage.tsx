import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useListSearch } from "./useListSearch";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { RegisterStatsCards } from "./RegisterStatsCards";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Plus, Eye, RefreshCw, Loader2, Pencil, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { RootState } from "@/src/store/store";
import { stateOfficeWeeklyComplianceApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import {
  WEEKLY_COMPLIANCE_SECTIONS,
  WEEKLY_WEEKS_OF_MONTH,
  currentIsoWeek, formatIsoWeek, weeklyBreaches, weeklyComplianceScore,
  isoWeekFromYearMonthWeek, yearMonthWeekFromIso,
  type WeeklyAnswer, type WeeklyIndicators,
} from "./weeklyComplianceConfig";

/** Same NHIA field chrome as HCF Customer Satisfaction Survey */
const inputStyling =
  "h-11 w-full rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1a7a52] transition-colors";

type Geo = { id?: number | string; code?: string; zonal_code?: string; description?: string };

/** Zone PK is zonal_code. */
function zoneIdOf(o: Geo) {
  return String(o.zonal_code ?? o.id ?? "");
}
/** State PK is code — never prefer zonal_code (that is the parent zone). */
function stateIdOf(o: Geo) {
  return String(o.code ?? o.id ?? "");
}

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  embedded?: boolean;
  onChromeChange?: (chrome: {
    mode: "list" | "form" | "detail";
    title?: string;
    onInnerBack?: () => void;
    actions?: React.ReactNode;
  } | null) => void;
}

type FormState = {
  zone_id: string;
  state_id: string;
  facility_id: string;
  facility_name: string;
  nhia_code: string;
  facility_type: string;
  facility_type_other: string;
  facility_address: string;
  reporting_week: string;
  compliance_officer: string;
  designation_staff_id: string;
  submission_date: string;
  indicators: WeeklyIndicators;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (
  defaultZoneId?: string | null,
  defaultStateId?: string | null,
  officer?: { name?: string; staffId?: string },
): FormState => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  facility_id: "",
  facility_name: "",
  nhia_code: "",
  facility_type: "",
  facility_type_other: "",
  facility_address: "",
  reporting_week: currentIsoWeek(),
  compliance_officer: officer?.name ?? "",
  designation_staff_id: officer?.staffId ?? "",
  submission_date: today(),
  indicators: {},
});

const rowToForm = (row: any): FormState => ({
  zone_id: String(row.zonal_code ?? row.zone_id ?? ""),
  state_id: String(row.state_code ?? row.state_id ?? ""),
  facility_id: row.facility_id ?? "",
  facility_name: row.facility_name ?? "",
  nhia_code: row.nhia_code ?? "",
  facility_type: row.facility_type ?? "",
  facility_type_other: row.facility_type_other ?? "",
  facility_address: row.facility_address ?? "",
  reporting_week: row.reporting_week ?? currentIsoWeek(),
  compliance_officer: row.compliance_officer ?? "",
  designation_staff_id: row.designation_staff_id ?? "",
  submission_date: row.submission_date?.slice?.(0, 10) ?? today(),
  indicators: row.indicators ?? {},
});

function pickGeoLabel(options: Geo[], value: string, fallback: string, idOf: (o: Geo) => string = zoneIdOf) {
  if (!value) return fallback;
  return options.find((o) => idOf(o) === value)?.description ?? fallback;
}

function matchFacilityType(raw?: string | null) {
  const v = (raw ?? "").toLowerCase();
  if (!v) return "";
  if (v.includes("faith") || v.includes("mission")) return "Faith-Based";
  if (v.includes("private")) return "Private";
  if (v.includes("public") || v.includes("government") || v.includes("federal") || v.includes("state")) return "Public";
  return "";
}

function ScoreBadge({ indicators }: { indicators: WeeklyIndicators }) {
  const score = weeklyComplianceScore(indicators);
  if (!score) return <span className="text-xs text-slate-400">—</span>;
  const tone = score.pct >= 80
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : score.pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200";
  return <Badge variant="outline" className={tone}>{score.pct}% ({score.compliant}/{score.answered})</Badge>;
}

function YesNo({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value?: string;
  onChange: (v: WeeklyAnswer) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="shrink-0">
      <legend className="sr-only">{name}</legend>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {([
          { value: "yes" as const, label: "Yes" },
          { value: "no" as const, label: "No" },
        ]).map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-sm border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                checked
                  ? "border-[#1a7a52] bg-[#e8f5ee] text-[#1a7a52] shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#1a7a52] hover:bg-[#f4f7f5]"
              } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  checked ? "border-[#1a7a52]" : "border-slate-300"
                }`}
              >
                {checked && <span className="h-1.5 w-1.5 rounded-full bg-[#1a7a52]" />}
              </span>
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function StateOfficeWeeklyCompliancePage({ onBack, defaultStateId, defaultZoneId, embedded = false, onChromeChange }: Props) {
  const { canCreate } = useStateOfficeAccess();
  const user = useSelector((s: RootState) => s.auth.user) as any;
  const officer = React.useMemo(() => ({
    name: user?.name ?? "",
    staffId: [user?.designation, user?.staff_id ?? user?.username].filter(Boolean).join(" / "),
  }), [user]);

  const [mode, setMode] = React.useState<"list" | "form" | "view">("list");
  const [editingId, setEditingId] = React.useState<number | string | null>(null);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [allRows, setRows] = React.useState<any[]>([]);
  const { search, setSearch, matchesSearch } = useListSearch();
  const rows = React.useMemo(() => allRows.filter(matchesSearch), [allRows, matchesSearch]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState<FormState>(() => emptyForm(defaultZoneId, defaultStateId, officer));
  const [periodParts, setPeriodParts] = React.useState(() => yearMonthWeekFromIso(currentIsoWeek()));

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<any[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear,
    month: filterMonth,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeWeeklyComplianceApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load weekly compliance reports", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters]);

  React.useEffect(() => { if (mode === "list") load(); }, [load, mode]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => { if (defaultZoneId) setFilterZone(defaultZoneId); }, [defaultZoneId]);
  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    if (!zid) { setDashboardStates([]); return; }
    stockApi.getStates(zid).then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);
  React.useEffect(() => {
    if (!f.zone_id) {
      setStates([]);
      return;
    }
    let cancelled = false;
    stockApi.getStates(f.zone_id).then((r) => {
      if (cancelled) return;
      setStates(r.data || []);
      // Keep locked/default state if it exists in the fetched list
      if (defaultStateId && (r.data || []).some((s: any) => stateIdOf(s) === String(defaultStateId))) {
        setF((p) => (p.state_id ? p : { ...p, state_id: String(defaultStateId) }));
      }
    }).catch(() => { if (!cancelled) setStates([]); });
    return () => { cancelled = true; };
  }, [f.zone_id, defaultStateId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const setIndicator = (key: string, patch: { answer?: WeeklyAnswer; remarks?: string }) =>
    setF((p) => ({ ...p, indicators: { ...p.indicators, [key]: { ...p.indicators[key], ...patch } } }));

  const openNew = () => {
    setEditingId(null);
    setSelected(null);
    const next = emptyForm(defaultZoneId, defaultStateId, officer);
    setF(next);
    setPeriodParts(yearMonthWeekFromIso(next.reporting_week));
    setMode("form");
  };

  const openView = React.useCallback(async (id: number | string) => {
    setMode("view");
    setSelected(null);
    try {
      const res = await stateOfficeWeeklyComplianceApi.get(id);
      setSelected(res.data);
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
      setMode("list");
    }
  }, []);

  const listColumns = React.useMemo((): ColumnDef<any>[] => [
    {
      id: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-primary">{row.original.reference_id || row.original.id}</span>
      ),
    },
    { id: "facility", header: "Facility", cell: ({ row }) => <span className="text-sm font-medium">{row.original.facility_name}</span> },
    { id: "nhia_code", header: "NHIA Code", cell: ({ row }) => <span className="text-xs">{row.original.nhia_code || "—"}</span> },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => {
        const r = row.original;
        return <span className="text-xs">{r.facility_type === "Other" ? (r.facility_type_other || "Other") : (r.facility_type || "—")}</span>;
      },
    },
    { id: "week", header: "Reporting Week", cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatIsoWeek(row.original.reporting_week)}</span> },
    { id: "officer", header: "Compliance Officer", cell: ({ row }) => <span className="text-xs">{row.original.compliance_officer || "—"}</span> },
    { id: "score", header: "Score", cell: ({ row }) => <ScoreBadge indicators={row.original.indicators} /> },
    {
      id: "breaches",
      header: "Breaches",
      cell: ({ row }) => {
        const breaches = weeklyBreaches(row.original.indicators).length;
        return breaches > 0
          ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{breaches}</Badge>
          : <span className="text-xs text-slate-400">0</span>;
      },
    },
    { id: "state", header: "State", cell: ({ row }) => <span className="text-xs">{row.original.state?.description ?? "—"}</span> },
    {
      id: "view",
      header: "View",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8"
          onClick={(e) => { e.stopPropagation(); void openView(row.original.reference_id || row.original.id); }}
        >
          <Eye className="w-3.5 h-3.5" /> View
        </Button>
      ),
    },
  ], [openView]);

  const openEdit = (row: any) => {
    setEditingId(row.reference_id || row.id);
    const next = rowToForm(row);
    setF(next);
    setPeriodParts(yearMonthWeekFromIso(next.reporting_week));
    setMode("form");
  };

  const backToList = React.useCallback(() => {
    setSelected(null);
    setEditingId(null);
    setMode("list");
  }, []);

  const leaveForm = React.useCallback(() => {
    // Form/Cancel/header back always stay in Weekly Compliance — never leave the hub.
    if (editingId && selected && String(selected.reference_id || selected.id) === String(editingId)) {
      setMode("view");
      return;
    }
    backToList();
  }, [editingId, selected, backToList]);

  const leaveFormRef = React.useRef(leaveForm);
  leaveFormRef.current = leaveForm;
  const backToListRef = React.useRef(backToList);
  backToListRef.current = backToList;

  const unanswered = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators)
    .filter((ind) => !f.indicators[ind.key]?.answer);

  const handleSave = async () => {
    if (!f.zone_id || !f.state_id) return toast.error("Zone and state are required.");
    if (!f.facility_name.trim()) return toast.error("Name of healthcare facility is required.");
    if (!f.reporting_week) return toast.error("Reporting week is required.");
    if (unanswered.length) return toast.error(`Answer Yes or No for all indicators (${unanswered.length} remaining).`);

    setSaving(true);
    try {
      const payload = {
        ...f,
        zone_id: f.zone_id,
        state_id: f.state_id,
        zonal_code: f.zone_id,
        state_code: f.state_id,
        facility_type_other: f.facility_type === "Other" ? f.facility_type_other : null,
        status: "submitted",
      };
      if (editingId) {
        const res = await stateOfficeWeeklyComplianceApi.update(editingId, payload);
        toast.success("Weekly compliance report updated");
        setSelected(res.data);
        setMode("view");
      } else {
        await stateOfficeWeeklyComplianceApi.create(payload);
        toast.success("Weekly compliance report submitted");
        backToList();
      }
    } catch (err: any) {
      toast.error("Failed to save report", { description: err.message });
    } finally { setSaving(false); }
  };

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
              <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openNew}>
                <Plus className="w-4 h-4" /> New Report
              </Button>
            )}
          </>
        ),
      });
      return;
    }
    if (mode === "form") {
      const answered = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators)
        .filter((ind) => f.indicators[ind.key]?.answer === "yes" || f.indicators[ind.key]?.answer === "no").length;
      const total = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators).length;
      onChromeChange({
        mode: "form",
        title: editingId ? "Edit Weekly Compliance Report" : "Weekly Compliance Report",
        onInnerBack: () => leaveFormRef.current(),
        actions: (
          <Badge variant="outline" className="text-xs font-bold border border-[#1a7a52] text-[#1a7a52] shrink-0 bg-[#f4f7f5] rounded-sm">
            {answered} / {total} answered
          </Badge>
        ),
      });
      return;
    }
    if (mode === "view") {
      onChromeChange({
        mode: "detail",
        title: selected?.facility_name ?? "Weekly Compliance Report",
        onInnerBack: () => backToListRef.current(),
        actions: selected && canCreate ? (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={() => openEdit(selected)}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
        ) : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, onChromeChange, mode, loading, canCreate, editingId, selected, f.indicators]);

  React.useEffect(() => () => onChromeChange?.(null), [onChromeChange]);

  if (mode === "form") {
    let questionNumber = 1;
    const answeredCount = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators)
      .filter((ind) => f.indicators[ind.key]?.answer === "yes" || f.indicators[ind.key]?.answer === "no").length;
    const totalIndicators = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators).length;

    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-4 min-w-0">
              <Button type="button" variant="ghost" size="icon" onClick={() => leaveForm()} className="rounded-full shrink-0" aria-label="Back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
                {editingId ? "Edit Weekly Compliance Report" : "Weekly Compliance Report"}
              </h2>
            </div>
            <Badge variant="outline" className="text-xs font-bold border border-[#1a7a52] text-[#1a7a52] shrink-0 bg-[#f4f7f5] rounded-sm">
              {answeredCount} / {totalIndicators} answered
            </Badge>
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="w-full px-3 md:px-4 py-3 space-y-3 pb-8">
            <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
              <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
                <CardTitle className="text-sm font-bold text-slate-800">Report Details</CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Zone *</Label>
                    <Select
                      value={f.zone_id}
                      disabled={zoneLocked}
                      onValueChange={(v) => setF((p) => ({
                        ...p,
                        zone_id: v,
                        state_id: stateLocked ? p.state_id : "",
                        facility_id: "",
                        facility_name: "",
                        nhia_code: "",
                      }))}
                    >
                      <SelectTrigger displayValue={pickGeoLabel(zones, f.zone_id, "Select zone", zoneIdOf)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((z) => {
                          const id = zoneIdOf(z);
                          return <SelectItem key={id} value={id}>{z.description}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">State *</Label>
                    <Select
                      value={f.state_id}
                      disabled={stateLocked || !f.zone_id}
                      onValueChange={(v) => setF((p) => ({
                        ...p,
                        state_id: v,
                        facility_id: "",
                        facility_name: "",
                        nhia_code: "",
                      }))}
                    >
                      <SelectTrigger displayValue={pickGeoLabel(states, f.state_id, f.zone_id ? "Select state" : "Select zone first", stateIdOf)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => {
                          const id = stateIdOf(s);
                          return <SelectItem key={id} value={id}>{s.description}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Year *</Label>
                    <Select
                      value={periodParts.year}
                      onValueChange={(y) => {
                        setPeriodParts((p) => {
                          const next = { ...p, year: y };
                          set("reporting_week", isoWeekFromYearMonthWeek(next.year, next.month, next.weekOfMonth));
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger displayValue={periodParts.year}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {buildReportingYearOptions().map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Month *</Label>
                    <Select
                      value={periodParts.month}
                      onValueChange={(m) => {
                        setPeriodParts((p) => {
                          const next = { ...p, month: m };
                          set("reporting_week", isoWeekFromYearMonthWeek(next.year, next.month, next.weekOfMonth));
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger displayValue={monthLabel(periodParts.month)}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Reporting Week *</Label>
                    <Select
                      value={periodParts.weekOfMonth}
                      onValueChange={(w) => {
                        setPeriodParts((p) => {
                          const next = { ...p, weekOfMonth: w };
                          set("reporting_week", isoWeekFromYearMonthWeek(next.year, next.month, next.weekOfMonth));
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger
                        displayValue={WEEKLY_WEEKS_OF_MONTH.find((w) => w.value === periodParts.weekOfMonth)?.label ?? "Select week"}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKLY_WEEKS_OF_MONTH.map((w) => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Date of Submission</Label>
                    <input
                      type="date"
                      value={f.submission_date}
                      max={today()}
                      onChange={(e) => set("submission_date", e.target.value)}
                      className={inputStyling}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                    <Label className="text-xs font-bold text-slate-700">Name of Healthcare Facility *</Label>
                    <AccreditedProviderSelect
                      type="hcp"
                      stateId={f.state_id || undefined}
                      value={f.facility_id}
                      displayName={f.facility_name || undefined}
                      placeholder={f.facility_name || (f.state_id ? "Search accredited facility" : "Select a state first")}
                      disabled={!f.state_id}
                      onChange={(p) => setF((prev) => ({
                        ...prev,
                        facility_id: p?.id ?? "",
                        facility_name: p?.name ?? "",
                        // Still captured for the payload — not shown on the form
                        nhia_code: p?.code ?? "",
                        facility_address: p?.address ?? "",
                        facility_type: matchFacilityType(p?.facility_type) || "",
                        facility_type_other: "",
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {WEEKLY_COMPLIANCE_SECTIONS.map((section) => {
              const start = questionNumber;
              questionNumber += section.indicators.length;
              const sectionAnswered = section.indicators.filter(
                (ind) => f.indicators[ind.key]?.answer === "yes" || f.indicators[ind.key]?.answer === "no",
              ).length;
              return (
                <Card key={section.key} className="rounded-sm border border-slate-200/80 shadow-xs overflow-hidden bg-white p-0 gap-0">
                  <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        {section.title}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-bold border-[#1a7a52] text-[#1a7a52] bg-white">
                        {sectionAnswered} / {section.indicators.length} Answered
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-1 md:p-2">
                    <div className="space-y-3">
                      {section.indicators.map((ind, i) => {
                        const n = start + i;
                        const val = f.indicators[ind.key]?.answer ?? "";
                        return (
                          <div
                            key={ind.key}
                            className={`rounded-sm border p-2 transition-colors ${
                              val
                                ? "border-slate-300 bg-white shadow-xs"
                                : "border-slate-200 bg-[#f4f7f5]"
                            }`}
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#e8f5ee] text-xs font-bold text-[#1a7a52]">
                                  {n}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800 leading-snug">{ind.label}</p>
                                </div>
                                {val ? (
                                  <CheckCircle2 className="w-5 h-5 text-[#1a7a52] shrink-0 md:hidden" />
                                ) : null}
                              </div>
                              <div className="shrink-0 md:pl-0 pl-10">
                                <YesNo
                                  name={`wc-${ind.key}`}
                                  value={f.indicators[ind.key]?.answer}
                                  onChange={(v) => setIndicator(ind.key, { answer: v })}
                                />
                              </div>
                            </div>
                            <div className="mt-2 md:pl-10">
                              <input
                                value={f.indicators[ind.key]?.remarks ?? ""}
                                onChange={(e) => setIndicator(ind.key, { remarks: e.target.value })}
                                placeholder={section.remarksLabel}
                                className={inputStyling}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                Compliance score: <ScoreBadge indicators={f.indicators} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => leaveForm()}
                  className="rounded-sm border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="bg-[#1a7a52] hover:bg-[#145c3f] text-white font-bold gap-2 rounded-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingId ? "Save Changes" : "Submit Report"}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode === "view") {
    const r = selected;
    const breaches = r ? weeklyBreaches(r.indicators) : [];
    let questionNumber = 1;
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        {!embedded && (
          <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-4 min-w-0">
              <Button variant="ghost" size="icon" onClick={backToList} className="rounded-full shrink-0" aria-label="Back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">{r?.facility_name ?? "Weekly Compliance Report"}</h2>
            </div>
            {r && canCreate && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-sm border-[#1a7a52] text-[#1a7a52] font-bold text-xs gap-2"
                onClick={() => openEdit(r)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>
        )}
        <ScrollArea className="flex-1">
          {!r ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="w-full px-3 md:px-4 py-3 space-y-3 pb-8">
              <Card className="rounded-sm border border-slate-200/80 shadow-xs bg-white overflow-hidden p-0 gap-0">
                <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-slate-800">Report Details</CardTitle>
                    <ScoreBadge indicators={r.indicators} />
                  </div>
                </CardHeader>
                <CardContent className="p-2 md:p-3">
                  {r.reference_id && (
                    <div className="mb-3 pb-3 border-b border-slate-100">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Report Reference</p>
                      <p className="text-base font-mono font-bold text-[#1a7a52] mt-0.5">#{r.reference_id}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <InfoField label="Facility" value={r.facility_name} />
                    <InfoField label="Zone" value={r.zone?.description} />
                    <InfoField label="State" value={r.state?.description} />
                    <InfoField label="NHIA Code" value={r.nhia_code} />
                    <InfoField
                      label="Facility Type"
                      value={r.facility_type === "Other" ? `Other — ${r.facility_type_other ?? ""}` : r.facility_type}
                    />
                    <InfoField label="Reporting Week" value={formatIsoWeek(r.reporting_week)} />
                    <InfoField label="Date of Submission" value={r.submission_date} />
                    <InfoField label="Compliance Officer" value={r.compliance_officer} />
                    <InfoField label="Designation / Staff ID" value={r.designation_staff_id} />
                    <InfoField label="Facility Address" value={r.facility_address} />
                  </div>
                  {breaches.length > 0 && (
                    <div className="mt-4 rounded-sm border border-rose-200 bg-rose-50/50 p-3 space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                        Non-compliance flagged ({breaches.length})
                      </p>
                      <ul className="list-disc pl-5 text-sm text-rose-800 space-y-0.5">
                        {breaches.map((b) => <li key={b.key}>{b.label}</li>)}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {WEEKLY_COMPLIANCE_SECTIONS.map((section) => {
                const start = questionNumber;
                questionNumber += section.indicators.length;
                return (
                  <Card key={section.key} className="rounded-sm border border-slate-200/80 shadow-xs overflow-hidden bg-white p-0 gap-0">
                    <CardHeader className="border-b border-slate-200 bg-[#f4f7f5] py-2 px-2 md:px-3 rounded-none m-0">
                      <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 md:p-2">
                      <div className="space-y-3">
                        {section.indicators.map((ind, i) => {
                          const n = start + i;
                          const v = r.indicators?.[ind.key] ?? {};
                          const val = v.answer ?? "";
                          const breach = val === (ind.yesIsBreach ? "yes" : "no");
                          return (
                            <div
                              key={ind.key}
                              className={`rounded-sm border p-2 transition-colors ${
                                val ? "border-slate-300 bg-white shadow-xs" : "border-slate-200 bg-[#f4f7f5]"
                              }`}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#e8f5ee] text-xs font-bold text-[#1a7a52]">
                                    {n}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800 leading-snug">{ind.label}</p>
                                    {v.remarks ? (
                                      <p className="text-xs text-slate-500 mt-1">{section.remarksLabel}: {v.remarks}</p>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 md:pl-0 pl-10">
                                  {val ? (
                                    <Badge
                                      className={
                                        breach
                                          ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                                          : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                                      }
                                    >
                                      {val === "yes" ? "Yes" : "No"}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-slate-400">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-slate-50/30"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 gap-3">
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Weekly Compliance Reports</h2>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canCreate && (
              <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openNew}>
                <Plus className="w-4 h-4" /> New Report
              </Button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <RegisterStatsCards
            loading={loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              { label: "Total", value: rows.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              {
                label: "With breaches",
                value: rows.filter((r) => weeklyBreaches(r.indicators).length > 0).length,
                tone: "text-rose-700 bg-rose-50/80 border-rose-100",
              },
              {
                label: "No breaches",
                value: rows.filter((r) => weeklyBreaches(r.indicators).length === 0).length,
                tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
              },
              {
                label: "Avg score",
                value: rows.length
                  ? Math.round(
                      rows.reduce((sum, r) => sum + weeklyComplianceScore(r.indicators), 0) / rows.length,
                    )
                  : 0,
                tone: "text-teal-800 bg-teal-50/80 border-teal-100",
              },
            ]}
          />

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); }}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone", zoneIdOf)}>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => {
                      const id = zoneIdOf(z);
                      return <SelectItem key={id} value={id}>{z.description}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger size="sm" className="w-full" displayValue={
                    stateLocked
                      ? pickGeoLabel(dashboardStates, filterState, "State", stateIdOf)
                      : (filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State", stateIdOf))
                  }>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => {
                      const id = stateIdOf(s);
                      return <SelectItem key={id} value={id}>{s.description}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger size="sm" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger size="sm" className="w-full" displayValue={monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="WEEKLY COMPLIANCE REGISTER"
            columns={listColumns}
            data={rows}
            loading={loading}
            searchPlaceholder="Search compliance reports..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage="No weekly compliance reports for this period."
            onRowClick={(r) => void openView(r.reference_id || r.id)}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
