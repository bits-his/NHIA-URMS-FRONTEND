import * as React from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft, Plus, Eye, RefreshCw, Loader2, ClipboardCheck, Pencil,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  WEEKLY_COMPLIANCE_SECTIONS, WEEKLY_FACILITY_TYPES,
  currentIsoWeek, formatIsoWeek, weeklyBreaches, weeklyComplianceScore,
  type WeeklyAnswer, type WeeklyIndicators,
} from "./weeklyComplianceConfig";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
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
  zone_id: row.zone_id != null ? String(row.zone_id) : "",
  state_id: row.state_id != null ? String(row.state_id) : "",
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

function pickGeoLabel(options: { id: number; description?: string }[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
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

function YesNo({ value, onChange, disabled }: { value?: string; onChange: (v: WeeklyAnswer) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {(["yes", "no"] as const).map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`h-8 w-14 rounded-md border text-xs font-semibold transition-colors ${
              on
                ? opt === "yes" ? "border-[#016630] bg-[#016630] text-white" : "border-slate-700 bg-slate-700 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            } disabled:opacity-60`}
          >
            {opt === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <p className="text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function StateOfficeWeeklyCompliancePage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const { canCreate, createOnly } = useStateOfficeAccess();
  const user = useSelector((s: RootState) => s.auth.user) as any;
  const officer = React.useMemo(() => ({
    name: user?.name ?? "",
    staffId: [user?.designation, user?.staff_id ?? user?.username].filter(Boolean).join(" / "),
  }), [user]);

  const [mode, setMode] = React.useState<"list" | "form" | "view">(createOnly ? "form" : "list");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [f, setF] = React.useState<FormState>(() => emptyForm(defaultZoneId, defaultStateId, officer));

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
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateOfficeWeeklyComplianceApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load weekly compliance reports", { description: err.message });
    } finally { setLoading(false); }
  }, [apiFilters, createOnly]);

  React.useEffect(() => { if (!createOnly && mode === "list") load(); }, [load, mode, createOnly]);
  React.useEffect(() => { stockApi.getZones().then((r) => setZones(r.data)).catch(() => {}); }, []);
  React.useEffect(() => { if (defaultZoneId) setFilterZone(defaultZoneId); }, [defaultZoneId]);
  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : (defaultZoneId || "");
    if (!zid) { setDashboardStates([]); return; }
    stockApi.getStates(zid).then((r) => setDashboardStates(r.data)).catch(() => setDashboardStates([]));
    if (!stateLocked) setFilterState("all");
  }, [filterZone, defaultZoneId, stateLocked, setFilterState]);
  React.useEffect(() => {
    if (!f.zone_id) return;
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => {});
  }, [f.zone_id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));
  const setIndicator = (key: string, patch: { answer?: WeeklyAnswer; remarks?: string }) =>
    setF((p) => ({ ...p, indicators: { ...p.indicators, [key]: { ...p.indicators[key], ...patch } } }));

  const openNew = () => {
    setEditingId(null);
    setF(emptyForm(defaultZoneId, defaultStateId, officer));
    setMode("form");
  };

  const openView = async (id: number) => {
    setMode("view");
    setSelected(null);
    try {
      const res = await stateOfficeWeeklyComplianceApi.get(id);
      setSelected(res.data);
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
      setMode("list");
    }
  };

  const openEdit = (row: any) => {
    setEditingId(row.id);
    setF(rowToForm(row));
    setMode("form");
  };

  const leaveForm = () => {
    if (createOnly) { onBack(); return; }
    if (editingId && selected?.id === editingId) { setMode("view"); return; }
    setMode("list");
  };

  const unanswered = WEEKLY_COMPLIANCE_SECTIONS.flatMap((s) => s.indicators)
    .filter((ind) => !f.indicators[ind.key]?.answer);

  const handleSave = async () => {
    if (!f.zone_id || !f.state_id) return toast.error("Zone and state are required.");
    if (!f.facility_name.trim()) return toast.error("Name of healthcare facility is required.");
    if (!f.reporting_week) return toast.error("Reporting week is required.");
    if (f.facility_type === "Other" && !f.facility_type_other.trim()) return toast.error("Specify the facility type.");
    if (unanswered.length) return toast.error(`Answer Yes or No for all indicators (${unanswered.length} remaining).`);

    setSaving(true);
    try {
      const payload = {
        ...f,
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
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
        if (createOnly) setF(emptyForm(defaultZoneId, defaultStateId, officer));
        else setMode("list");
      }
    } catch (err: any) {
      toast.error("Failed to save report", { description: err.message });
    } finally { setSaving(false); }
  };

  if (mode === "form") {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={leaveForm} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">
              {editingId ? "Edit Weekly Compliance Report" : "Weekly Compliance Report"}
            </h2>
            <p className="text-xs text-muted-foreground">To be completed by Compliance Officers deployed to Healthcare Facilities</p>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 pb-24 space-y-4">
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Section A: General Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zone *</Label>
                  <Select value={f.zone_id} disabled={zoneLocked} onValueChange={(v) => setF((p) => ({ ...p, zone_id: v, state_id: stateLocked ? p.state_id : "" }))}>
                    <SelectTrigger displayValue={pickGeoLabel(zones, f.zone_id, "Zone")}><SelectValue /></SelectTrigger>
                    <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={f.state_id} disabled={stateLocked} onValueChange={(v) => set("state_id", v)}>
                    <SelectTrigger displayValue={pickGeoLabel(states, f.state_id, "State")}><SelectValue /></SelectTrigger>
                    <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Name of Healthcare Facility *</Label>
                  <AccreditedProviderSelect
                    type="hcp"
                    stateId={f.state_id || undefined}
                    value={f.facility_id}
                    placeholder={f.facility_name || (f.state_id ? "Search accredited facility" : "Select a state first")}
                    disabled={!f.state_id}
                    onChange={(p) => setF((prev) => ({
                      ...prev,
                      facility_id: p?.id ?? "",
                      facility_name: p?.name ?? "",
                      nhia_code: p?.code ?? "",
                      facility_address: p?.address ?? prev.facility_address,
                      facility_type: matchFacilityType(p?.facility_type) || prev.facility_type,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>NHIA Code</Label>
                  <Input value={f.nhia_code} onChange={(e) => set("nhia_code", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Facility Type</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKLY_FACILITY_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set("facility_type", t)}
                        className={`h-9 rounded-md border px-3 text-sm transition-colors ${
                          f.facility_type === t ? "border-[#016630] bg-[#016630] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-[#016630]"
                        }`}
                      >
                        {t === "Other" ? "Other (Specify)" : t}
                      </button>
                    ))}
                  </div>
                  {f.facility_type === "Other" && (
                    <Input placeholder="Specify facility type" value={f.facility_type_other} onChange={(e) => set("facility_type_other", e.target.value)} />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Facility Address</Label>
                  <Input value={f.facility_address} onChange={(e) => set("facility_address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reporting Week *</Label>
                  <Input type="week" value={f.reporting_week} max={currentIsoWeek()} onChange={(e) => set("reporting_week", e.target.value)} />
                  <p className="text-xs text-slate-500">{formatIsoWeek(f.reporting_week)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Date of Submission</Label>
                  <Input type="date" value={f.submission_date} max={today()} onChange={(e) => set("submission_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Name of Compliance Officer</Label>
                  <Input value={f.compliance_officer} onChange={(e) => set("compliance_officer", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Designation / Staff ID</Label>
                  <Input value={f.designation_staff_id} onChange={(e) => set("designation_staff_id", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {WEEKLY_COMPLIANCE_SECTIONS.map((section) => (
              <Card key={section.key} className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                <CardHeader className="pb-2 border-b border-[#d4e8dc] bg-[#f8fdfb]">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold w-[45%]">Indicator</TableHead>
                          <TableHead className="text-xs font-bold w-[140px]">Yes / No</TableHead>
                          <TableHead className="text-xs font-bold">{section.remarksLabel}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.indicators.map((ind) => (
                          <TableRow key={ind.key}>
                            <TableCell className="text-sm whitespace-normal">{ind.label}</TableCell>
                            <TableCell>
                              <YesNo value={f.indicators[ind.key]?.answer} onChange={(v) => setIndicator(ind.key, { answer: v })} />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={f.indicators[ind.key]?.remarks ?? ""}
                                onChange={(e) => setIndicator(ind.key, { remarks: e.target.value })}
                                placeholder={section.remarksLabel}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 bg-white border-t px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            Compliance score: <ScoreBadge indicators={f.indicators} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={leaveForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-action hover:bg-orange-600">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingId ? "Save Changes" : "Submit Report"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "view") {
    const r = selected;
    const breaches = r ? weeklyBreaches(r.indicators) : [];
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">{r?.facility_name ?? "Weekly Compliance Report"}</h2>
              <p className="text-xs font-mono text-muted-foreground">{r?.reference_id}</p>
            </div>
          </div>
          {r && canCreate && (
            <Button variant="outline" className="gap-2" onClick={() => openEdit(r)}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          {!r ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="w-full px-4 md:px-6 py-4 space-y-4">
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Section A: General Information</CardTitle>
                  <ScoreBadge indicators={r.indicators} />
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Zone" value={r.zone?.description} />
                  <InfoField label="State" value={r.state?.description} />
                  <InfoField label="NHIA Code" value={r.nhia_code} />
                  <InfoField label="Facility Type" value={r.facility_type === "Other" ? `Other — ${r.facility_type_other ?? ""}` : r.facility_type} />
                  <div className="col-span-2"><InfoField label="Facility Address" value={r.facility_address} /></div>
                  <InfoField label="Reporting Week" value={formatIsoWeek(r.reporting_week)} />
                  <InfoField label="Date of Submission" value={r.submission_date} />
                  <InfoField label="Compliance Officer" value={r.compliance_officer} />
                  <InfoField label="Designation / Staff ID" value={r.designation_staff_id} />
                  <InfoField label="Submitted By" value={r.submitted_by} />
                </CardContent>
              </Card>

              {breaches.length > 0 && (
                <Card className="rounded-2xl border-rose-200 bg-rose-50/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-rose-700">Non-compliance flagged ({breaches.length})</CardTitle>
                    <CardDescription>Indicators answered in a way that indicates a breach.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 text-sm text-rose-800 space-y-0.5">
                      {breaches.map((b) => <li key={b.key}>{b.label}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {WEEKLY_COMPLIANCE_SECTIONS.map((section) => (
                <Card key={section.key} className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                  <CardHeader className="pb-2 border-b border-[#d4e8dc] bg-[#f8fdfb]">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold w-[45%]">Indicator</TableHead>
                          <TableHead className="text-xs font-bold w-[100px]">Answer</TableHead>
                          <TableHead className="text-xs font-bold">{section.remarksLabel}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.indicators.map((ind) => {
                          const v = r.indicators?.[ind.key] ?? {};
                          const breach = v.answer === (ind.yesIsBreach ? "yes" : "no");
                          return (
                            <TableRow key={ind.key}>
                              <TableCell className="text-sm whitespace-normal">{ind.label}</TableCell>
                              <TableCell>
                                {v.answer ? (
                                  <Badge variant="outline" className={breach ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                                    {v.answer === "yes" ? "Yes" : "No"}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-sm whitespace-normal">{v.remarks || "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <h2 className="text-xl font-bold tracking-tight truncate">Weekly Compliance Reports</h2>
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

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Zone</Label>
                <Select value={filterZone} disabled={zoneLocked} onValueChange={(v) => { setFilterZone(v); if (!stateLocked) setFilterState("all"); }}>
                  <SelectTrigger className="w-full" displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full" displayValue={
                    stateLocked
                      ? pickGeoLabel(dashboardStates, filterState, "State")
                      : (filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State"))
                  }>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                {loading ? "Loading..." : `${rows.length} report(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No weekly compliance reports for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        {["Reference", "Facility", "NHIA Code", "Type", "Reporting Week", "Compliance Officer", "Score", "Breaches", "State", ""].map((h) => (
                          <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        const breaches = weeklyBreaches(r.indicators).length;
                        return (
                          <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                            className="border-b border-slate-100">
                            <TableCell className="font-mono text-xs font-bold text-primary">{r.reference_id}</TableCell>
                            <TableCell className="text-sm font-medium">{r.facility_name}</TableCell>
                            <TableCell className="text-xs">{r.nhia_code || "—"}</TableCell>
                            <TableCell className="text-xs">{r.facility_type === "Other" ? (r.facility_type_other || "Other") : (r.facility_type || "—")}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{formatIsoWeek(r.reporting_week)}</TableCell>
                            <TableCell className="text-xs">{r.compliance_officer || "—"}</TableCell>
                            <TableCell><ScoreBadge indicators={r.indicators} /></TableCell>
                            <TableCell>
                              {breaches > 0
                                ? <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">{breaches}</Badge>
                                : <span className="text-xs text-slate-400">0</span>}
                            </TableCell>
                            <TableCell className="text-xs">{r.state?.description ?? "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => openView(r.id)}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
