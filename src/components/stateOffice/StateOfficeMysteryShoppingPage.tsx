import * as React from "react";
import {
  ArrowLeft, Plus, Eye, Pencil, RefreshCw, Loader2, Search, Save, Mail, Building2, CalendarDays,
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
import { stateOfficeMysteryShoppingApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import HcfFacilitySelect from "../servicom/HcfFacilitySelect";
import {
  ENROLLEE_ITEMS, ENROLLEE_MAX, ENROLLEE_SCALE, FACILITY_TYPES, OBSERVATION_ITEMS, OBS_MAX,
  STEPS, labelOf, mapHcfFacilityType, optionLabel, sumScoreMap, type ScoreMap,
} from "./mysteryShoppingConfig";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string };
type Mode = "list" | "create" | "edit" | "view";

type FormState = {
  zone_id: string;
  state_id: string;
  email: string;
  mystery_shopper_name: string;
  facility_name: string;
  facility_hcf_id: string;
  facility_nhia_code: string;
  facility_type: string;
  facility_email: string;
  visit_date: string;
  observations: ScoreMap;
  enrollee_card_1: ScoreMap;
  enrollee_card_2: ScoreMap;
  enrollee_card_3: ScoreMap;
  key_strengths: string;
  gaps_identified: string;
  recommendation: string;
  follow_up_action_plan: string;
};

const emptyScores = (): ScoreMap => ({});

const emptyForm = (defaultZoneId?: string | null, defaultStateId?: string | null): FormState => ({
  zone_id: defaultZoneId ?? "",
  state_id: defaultStateId ?? "",
  email: "",
  mystery_shopper_name: "",
  facility_name: "",
  facility_hcf_id: "",
  facility_nhia_code: "",
  facility_type: "",
  facility_email: "",
  visit_date: new Date().toISOString().slice(0, 10),
  observations: emptyScores(),
  enrollee_card_1: emptyScores(),
  enrollee_card_2: emptyScores(),
  enrollee_card_3: emptyScores(),
  key_strengths: "",
  gaps_identified: "",
  recommendation: "",
  follow_up_action_plan: "",
});

function pickGeoLabel(options: Geo[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function asScoreMap(v: unknown): ScoreMap {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) || {}; } catch { return {}; }
  }
  if (typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, String(val ?? "")]));
  }
  return {};
}

function rowToForm(row: any, fallbackZone?: string | null, fallbackState?: string | null): FormState {
  return {
    zone_id: row?.zone_id ? String(row.zone_id) : (fallbackZone ?? ""),
    state_id: row?.state_id ? String(row.state_id) : (fallbackState ?? ""),
    email: row?.email ?? "",
    mystery_shopper_name: row?.mystery_shopper_name ?? "",
    facility_name: row?.facility_name ?? "",
    facility_hcf_id: "",
    facility_nhia_code: row?.facility_nhia_code ?? "",
    facility_type: row?.facility_type ?? "",
    facility_email: row?.facility_email ?? "",
    visit_date: row?.visit_date ? String(row.visit_date).slice(0, 10) : "",
    observations: asScoreMap(row?.observations),
    enrollee_card_1: asScoreMap(row?.enrollee_card_1),
    enrollee_card_2: asScoreMap(row?.enrollee_card_2),
    enrollee_card_3: asScoreMap(row?.enrollee_card_3),
    key_strengths: row?.key_strengths ?? "",
    gaps_identified: row?.gaps_identified ?? "",
    recommendation: row?.recommendation ?? "",
    follow_up_action_plan: row?.follow_up_action_plan ?? "",
  };
}

function ScorePills({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string; score: number }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              active
                ? "border-[#145c3f] bg-[#145c3f] text-white"
                : "border-[#d4e8dc] bg-white text-slate-700 hover:bg-[#f0fdf7]"
            }`}
          >
            {opt.label} <span className="opacity-70">({opt.score})</span>
          </button>
        );
      })}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  return (
    <Badge className="bg-[#145c3f] hover:bg-[#145c3f] text-white font-mono">
      {score} / {max}
    </Badge>
  );
}

export default function StateOfficeMysteryShoppingPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const [mode, setMode] = React.useState<Mode>("list");
  const [step, setStep] = React.useState(0);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [detailMeta, setDetailMeta] = React.useState<{ zone?: string; state?: string; reference?: string }>({});
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);
  const [f, setF] = React.useState<FormState>(emptyForm(defaultZoneId, defaultStateId));

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const apiFilters = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear,
    month: filterMonth,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const obsScore = sumScoreMap(f.observations);
  const cardScores = [sumScoreMap(f.enrollee_card_1), sumScoreMap(f.enrollee_card_2), sumScoreMap(f.enrollee_card_3)];

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeMysteryShoppingApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load mystery shopping visits", { description: err.message });
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
    if (!f.zone_id) { setStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [f.zone_id]);

  const openCreate = () => {
    setF(emptyForm(defaultZoneId, defaultStateId));
    setEditingId(null);
    setStep(0);
    setMode("create");
  };

  const openView = (row: any) => {
    setF(rowToForm(row, defaultZoneId, defaultStateId));
    setEditingId(row.id);
    setDetailMeta({
      zone: row.zone?.description,
      state: row.state?.description,
      reference: row.reference_id,
    });
    setMode("view");
  };

  const openEdit = () => {
    setStep(0);
    setMode("edit");
  };

  const validateStep = (page: number) => {
    if (page === 0) {
      if (!f.email.trim()) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Enter a valid email.";
      if (!f.zone_id || !f.state_id) return "Zone and state are required.";
      if (!f.facility_name.trim()) return "Name of facility is required.";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validateStep(0);
    if (err) { toast.error(err); setStep(0); return; }
    setSaving(true);
    try {
      const payload = {
        ...f,
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
        facility_type: f.facility_type || null,
        reporting_year: f.visit_date ? new Date(f.visit_date).getFullYear() : Number(filterYear),
        reporting_month: f.visit_date ? new Date(f.visit_date).getMonth() + 1 : Number(filterMonth),
        status: "submitted",
      };
      if (mode === "edit" && editingId) {
        await stateOfficeMysteryShoppingApi.update(editingId, payload);
        toast.success("Mystery shopping visit updated");
      } else {
        await stateOfficeMysteryShoppingApi.create(payload);
        toast.success("Mystery shopping visit recorded");
      }
      setMode("list");
    } catch (e: any) {
      toast.error("Failed to save visit", { description: e.message });
    } finally { setSaving(false); }
  };

  const setObs = (key: string, value: string) =>
    setF((p) => ({ ...p, observations: { ...p.observations, [key]: value } }));
  const setCard = (card: "enrollee_card_1" | "enrollee_card_2" | "enrollee_card_3", key: string, value: string) =>
    setF((p) => ({ ...p, [card]: { ...p[card], [key]: value } }));

  const goNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const textareaCls = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[110px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const stepper = (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-[#145c3f]">
        <span>Page {step + 1} of {STEPS.length}</span>
        <span>{STEPS[step]}</span>
      </div>
      <div className="h-2 rounded-full bg-[#d4e8dc] overflow-hidden">
        <div className="h-full bg-[#145c3f] transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="hidden md:grid grid-cols-6 gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => { if (i === 0 || !validateStep(0)) setStep(i); }}
            className={`truncate rounded-md px-2 py-1 text-[10px] font-semibold ${
              i === step ? "bg-[#145c3f] text-white" : i < step ? "bg-[#f0fdf7] text-[#145c3f]" : "bg-slate-100 text-slate-500"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>
    </div>
  );

  const enrolleeCardForm = (cardKey: "enrollee_card_1" | "enrollee_card_2" | "enrollee_card_3", index: number) => (
    <Card className="rounded-2xl border-[#d4e8dc]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-[#145c3f]">Enrollee Experience Score Card {index}</CardTitle>
            <CardDescription>0 = Poor, 1 = Good, 2 = Excellent</CardDescription>
          </div>
          <ScoreBadge score={cardScores[index - 1]} max={ENROLLEE_MAX} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {ENROLLEE_ITEMS.map((item) => (
          <div key={item.key} className="space-y-2 border-b border-[#d4e8dc] pb-4 last:border-0 last:pb-0">
            <Label className="text-sm font-semibold text-slate-800">{item.label}</Label>
            <ScorePills
              value={f[cardKey][item.key] ?? ""}
              options={ENROLLEE_SCALE}
              onChange={(v) => setCard(cardKey, item.key, v)}
            />
          </div>
        ))}
        <div className="rounded-xl bg-[#f0fdf7] border border-[#d4e8dc] px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#145c3f]">Enrollee Experience Score</span>
          <span className="font-mono text-lg font-bold text-[#145c3f]">{cardScores[index - 1]} / {ENROLLEE_MAX}</span>
        </div>
      </CardContent>
    </Card>
  );

  const formBody = (
    <div className="space-y-4">
      {stepper}
      {step === 0 && (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#145c3f]">General Information</CardTitle>
            <CardDescription>Facility visit header</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mystery Shoppers Name</Label>
              <Input value={f.mystery_shopper_name} onChange={(e) => setF((p) => ({ ...p, mystery_shopper_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Zone *</Label>
              <Select value={f.zone_id} disabled={zoneLocked} onValueChange={(v) => setF((p) => ({
                ...p,
                zone_id: v,
                state_id: stateLocked ? p.state_id : "",
                facility_hcf_id: "",
                facility_name: "",
                facility_nhia_code: "",
                facility_type: "",
                facility_email: "",
              }))}>
                <SelectTrigger displayValue={pickGeoLabel(zones, f.zone_id, "Zone")}><SelectValue /></SelectTrigger>
                <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={f.state_id} disabled={stateLocked || !f.zone_id} onValueChange={(v) => setF((p) => ({
                ...p,
                state_id: v,
                facility_hcf_id: "",
                facility_name: "",
                facility_nhia_code: "",
                facility_type: "",
                facility_email: "",
              }))}>
                <SelectTrigger displayValue={pickGeoLabel(states, f.state_id, f.zone_id ? "State" : "Select zone first")}><SelectValue /></SelectTrigger>
                <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Name of Facility *</Label>
              <HcfFacilitySelect
                stateId={f.state_id || undefined}
                value={f.facility_hcf_id}
                placeholder="Select healthcare facility (HCF)"
                onChange={(fac) => {
                  if (!fac) {
                    setF((p) => ({
                      ...p,
                      facility_hcf_id: "",
                      facility_name: "",
                      facility_nhia_code: "",
                      facility_type: "",
                      facility_email: "",
                    }));
                    return;
                  }
                  const nhia = (fac.code || fac.facility_code || "").trim();
                  const mappedType = mapHcfFacilityType(fac.facility_type, fac.service_applied_for);
                  const email = (fac.email || "").trim();
                  setF((p) => ({
                    ...p,
                    facility_hcf_id: fac.id,
                    facility_name: fac.name,
                    facility_nhia_code: nhia || p.facility_nhia_code,
                    facility_type: mappedType || p.facility_type,
                    facility_email: email || p.facility_email,
                  }));
                }}
              />
              {!f.facility_hcf_id && f.facility_name ? (
                <p className="text-xs text-amber-700">Saved facility: {f.facility_name}. Select from the list to refresh NHIA code, type, and email.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Facility NHIA Code</Label>
              <Input value={f.facility_nhia_code} onChange={(e) => setF((p) => ({ ...p, facility_nhia_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Facility Type</Label>
              <Select value={f.facility_type} onValueChange={(v) => setF((p) => ({ ...p, facility_type: v }))}>
                <SelectTrigger displayValue={labelOf(FACILITY_TYPES, f.facility_type)}><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{FACILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Facility email</Label>
              <Input type="email" value={f.facility_email} onChange={(e) => setF((p) => ({ ...p, facility_email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date of visit</Label>
              <Input type="date" value={f.visit_date} onChange={(e) => setF((p) => ({ ...p, visit_date: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base text-[#145c3f]">Observations</CardTitle>
                <CardDescription>Standard expectations scored 0–2</CardDescription>
              </div>
              <ScoreBadge score={obsScore} max={OBS_MAX} />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {OBSERVATION_ITEMS.map((item) => (
              <div key={item.key} className="space-y-2 border-b border-[#d4e8dc] pb-4 last:border-0 last:pb-0">
                <Label className="text-sm font-semibold text-slate-800">{item.label}</Label>
                <ScorePills value={f.observations[item.key] ?? ""} options={item.options} onChange={(v) => setObs(item.key, v)} />
              </div>
            ))}
            <div className="rounded-xl bg-[#f0fdf7] border border-[#d4e8dc] px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#145c3f]">Standard Expectations Score</span>
              <span className="font-mono text-lg font-bold text-[#145c3f]">{obsScore} / {OBS_MAX}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && enrolleeCardForm("enrollee_card_1", 1)}
      {step === 3 && enrolleeCardForm("enrollee_card_2", 2)}
      {step === 4 && enrolleeCardForm("enrollee_card_3", 3)}

      {step === 5 && (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#145c3f]">Remarks</CardTitle>
            <CardDescription>Narrative findings and follow-up</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Key Strengths</Label><textarea className={textareaCls} value={f.key_strengths} onChange={(e) => setF((p) => ({ ...p, key_strengths: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Gaps Identified</Label><textarea className={textareaCls} value={f.gaps_identified} onChange={(e) => setF((p) => ({ ...p, gaps_identified: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Recommendation</Label><textarea className={textareaCls} value={f.recommendation} onChange={(e) => setF((p) => ({ ...p, recommendation: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Follow-up Action Plan</Label><textarea className={textareaCls} value={f.follow_up_action_plan} onChange={(e) => setF((p) => ({ ...p, follow_up_action_plan: e.target.value }))} /></div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (mode === "view") {
    const stateName = detailMeta.state || pickGeoLabel(states.length ? states : dashboardStates, f.state_id, "—");
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
            <h2 className="text-xl font-bold tracking-tight">View Mystery Shopping</h2>
          </div>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openEdit}><Pencil className="w-4 h-4" /> Edit</Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <div className="bg-[#145c3f] text-white px-6 py-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/70">{detailMeta.reference || "Mystery shopping visit"}</p>
                  <h3 className="text-2xl font-bold">{f.facility_name || "Facility"}</h3>
                  <p className="text-sm text-white/80 mt-1">{stateName} · {safeDate(f.visit_date)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-white text-[#145c3f] hover:bg-white">Std {obsScore}/{OBS_MAX}</Badge>
                  <Badge className="bg-orange-action hover:bg-orange-action text-white">Enrollee {cardScores.reduce((a, b) => a + b, 0)}/{ENROLLEE_MAX * 3}</Badge>
                </div>
              </div>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoField label="Email" value={f.email ? <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={`mailto:${f.email}`}><Mail className="w-3.5 h-3.5" />{f.email}</a> : "—"} />
                <InfoField label="Mystery Shoppers Name" value={f.mystery_shopper_name} />
                <InfoField label="State" value={stateName} />
                <InfoField label="Name of Facility" value={<span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary" />{f.facility_name}</span>} />
                <InfoField label="Facility NHIA Code" value={f.facility_nhia_code} />
                <InfoField label="Facility Type" value={labelOf(FACILITY_TYPES, f.facility_type)} />
                <InfoField label="Facility email" value={f.facility_email} />
                <InfoField label="Date of visit" value={<span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-primary" />{safeDate(f.visit_date)}</span>} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-[#145c3f]">Observations</CardTitle>
                <ScoreBadge score={obsScore} max={OBS_MAX} />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {OBSERVATION_ITEMS.map((item) => (
                  <InfoField key={item.key} label={item.label} value={optionLabel(OBSERVATION_ITEMS, item.key, f.observations[item.key])} />
                ))}
                <InfoField label="Standard Expectations Score" value={`${obsScore} / ${OBS_MAX}`} />
              </CardContent>
            </Card>

            {[f.enrollee_card_1, f.enrollee_card_2, f.enrollee_card_3].map((card, i) => (
              <Card key={i} className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base text-[#145c3f]">Enrollee Experience Score Card {i + 1}</CardTitle>
                  <ScoreBadge score={cardScores[i]} max={ENROLLEE_MAX} />
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {ENROLLEE_ITEMS.map((item) => (
                    <InfoField key={item.key} label={item.label} value={labelOf(ENROLLEE_SCALE, card[item.key])} />
                  ))}
                  <InfoField label="Enrollee Experience Score" value={`${cardScores[i]} / ${ENROLLEE_MAX}`} />
                </CardContent>
              </Card>
            ))}

            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2"><CardTitle className="text-base text-[#145c3f]">Remarks</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField label="Key Strengths" value={f.key_strengths} />
                <InfoField label="Gaps Identified" value={f.gaps_identified} />
                <InfoField label="Recommendation" value={f.recommendation} />
                <InfoField label="Follow-up Action Plan" value={f.follow_up_action_plan} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode !== "list") {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
            <h2 className="text-xl font-bold tracking-tight">{mode === "edit" ? "Edit Mystery Shopping" : "New Mystery Shopping"}</h2>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">{formBody}</div>
        </ScrollArea>
        <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setMode(mode === "edit" ? "view" : "list")}>Cancel</Button>
            {step < STEPS.length - 1 ? (
              <Button className="bg-orange-action hover:bg-orange-600" onClick={goNext}>Next</Button>
            ) : (
              <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {mode === "edit" ? "Update" : "Save Visit"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-xl font-bold tracking-tight">Mystery Shopping</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Visit
          </Button>
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
                <Search className="w-4 h-4" />
                {loading ? "Loading..." : `${rows.length} visit(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold">Reference</TableHead>
                        <TableHead className="text-xs font-bold">Facility</TableHead>
                        <TableHead className="text-xs font-bold">Date</TableHead>
                        <TableHead className="text-xs font-bold">Shopper</TableHead>
                        <TableHead className="text-xs font-bold">Std Score</TableHead>
                        <TableHead className="text-xs font-bold">Enrollee</TableHead>
                        <TableHead className="text-xs font-bold">State</TableHead>
                        <TableHead className="text-xs font-bold w-16">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((v, i) => (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-slate-100">
                          <TableCell className="font-mono text-xs font-bold text-primary">{v.reference_id}</TableCell>
                          <TableCell className="text-sm">{v.facility_name}</TableCell>
                          <TableCell className="text-xs">{safeDate(v.visit_date)}</TableCell>
                          <TableCell className="text-xs">{v.mystery_shopper_name || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{v.standard_expectations_score ?? 0}/{OBS_MAX}</TableCell>
                          <TableCell className="text-xs font-mono">{(v.enrollee_score_1 || 0) + (v.enrollee_score_2 || 0) + (v.enrollee_score_3 || 0)}/{ENROLLEE_MAX * 3}</TableCell>
                          <TableCell className="text-xs">{v.state?.description ?? "—"}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openView(v)}>
                              <Eye className="w-4 h-4 text-[#145c3f]" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
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
