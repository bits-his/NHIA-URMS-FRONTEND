import * as React from "react";
import {
  Plus, RefreshCw, Loader2, Pencil, Eye, Save, Paperclip, Building2, ArrowLeft, Mail, Phone, MapPin, User,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { apiFileUrl, stateZonalOfficeProfileApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string; zonal_id?: number };
type Profile = {
  id: number;
  reporting_year: number;
  zone_id: number;
  state_id: number;
  staff_strength: number | null;
  coordinator_name: string | null;
  coordinator_phone: string | null;
  coordinator_email: string | null;
  office_address: string | null;
  office_email: string | null;
  enrolment_target: number | null;
  annual_budget: number | null;
  aop_original_name: string | null;
  aop_file_path: string | null;
  state_display_id?: string;
  zone_display_id?: string;
  zone?: Geo;
  state?: Geo;
};

type Mode = "list" | "create" | "edit" | "view";

const emptyForm = (year: string, zoneId?: string | null, stateId?: string | null) => ({
  reporting_year: year,
  zone_id: zoneId ?? "",
  state_id: stateId ?? "",
  staff_strength: "",
  coordinator_name: "",
  coordinator_phone: "",
  coordinator_email: "",
  office_address: "",
  office_email: "",
  enrolment_target: "",
  annual_budget: "",
  remove_aop: "",
});

type FormState = ReturnType<typeof emptyForm>;

function money(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-NG");
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words">{value || "—"}</div>
    </div>
  );
}

export default function StateZonalOfficeProfilePage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const { canCreate, createOnly } = useCreateReviewAccess();
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const currentYear = yearOptions[0] || String(new Date().getFullYear());

  const [mode, setMode] = React.useState<Mode>(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [rows, setRows] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<Profile | null>(null);
  const [existingAop, setExistingAop] = React.useState<{ name: string; path: string } | null>(null);
  const [aopFile, setAopFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [zones, setZones] = React.useState<Geo[]>([]);
  const [formStates, setFormStates] = React.useState<Geo[]>([]);
  const [f, setF] = React.useState<FormState>(emptyForm(currentYear, defaultZoneId, defaultStateId));

  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const {
    showStateFilter, filterState, setFilterState, apiStateId, stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const [filterStates, setFilterStates] = React.useState<Geo[]>([]);

  React.useEffect(() => {
    stockApi.getZones().then((r) => setZones(r.data || [])).catch(() => setZones([]));
  }, []);

  React.useEffect(() => {
    const zid = filterZone !== "all" ? filterZone : defaultZoneId;
    const req = zid ? stockApi.getStates(zid) : stockApi.getStates();
    req.then((r) => setFilterStates(r.data || [])).catch(() => setFilterStates([]));
  }, [filterZone, defaultZoneId]);

  React.useEffect(() => {
    if (!f.zone_id) { setFormStates([]); return; }
    stockApi.getStates(f.zone_id).then((r) => setFormStates(r.data || [])).catch(() => setFormStates([]));
  }, [f.zone_id]);

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateZonalOfficeProfileApi.list({
        year: filterYear !== "all" ? filterYear : undefined,
        zone_id: (filterZone !== "all" ? filterZone : defaultZoneId) || undefined,
        state_id: apiStateId || defaultStateId || undefined,
      });
      setRows(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load office profiles", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterZone, apiStateId, defaultZoneId, defaultStateId, createOnly]);

  React.useEffect(() => { if (!createOnly) load(); }, [load, createOnly]);

  const setField = (key: keyof FormState, value: string) => {
    setF((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "zone_id" && !stateLocked) next.state_id = "";
      return next;
    });
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setExistingAop(null);
    setAopFile(null);
    setF(emptyForm(
      filterYear !== "all" ? filterYear : currentYear,
      defaultZoneId || (filterZone !== "all" ? filterZone : ""),
      defaultStateId || (filterState !== ALL_STATES ? filterState : ""),
    ));
    setMode("create");
  };

  const leaveForm = () => {
    if (createOnly) {
      onBack();
      return;
    }
    setMode("list");
  };

  const remountCreateForm = () => {
    openCreate();
    setFormKey((k) => k + 1);
  };

  const fillForm = (row: Profile) => {
    setEditingId(row.id);
    setExistingAop(row.aop_file_path ? { name: row.aop_original_name || "AOP", path: row.aop_file_path } : null);
    setAopFile(null);
    setF({
      reporting_year: String(row.reporting_year),
      zone_id: String(row.zone_id),
      state_id: String(row.state_id),
      staff_strength: row.staff_strength != null ? String(row.staff_strength) : "",
      coordinator_name: row.coordinator_name || "",
      coordinator_phone: row.coordinator_phone || "",
      coordinator_email: row.coordinator_email || "",
      office_address: row.office_address || "",
      office_email: row.office_email || "",
      enrolment_target: row.enrolment_target != null ? String(row.enrolment_target) : "",
      annual_budget: row.annual_budget != null ? String(row.annual_budget) : "",
      remove_aop: "",
    });
  };

  const openView = (row: Profile) => { fillForm(row); setDetail(row); setMode("view"); };

  const handleSave = async () => {
    if (!f.reporting_year || !f.zone_id || !f.state_id) {
      toast.error("Year, zone, and state are required.");
      return;
    }
    setSaving(true);
    try {
      await stateZonalOfficeProfileApi.save({
        reporting_year: f.reporting_year,
        zone_id: f.zone_id,
        state_id: f.state_id,
        staff_strength: f.staff_strength,
        coordinator_name: f.coordinator_name,
        coordinator_phone: f.coordinator_phone,
        coordinator_email: f.coordinator_email,
        office_address: f.office_address,
        office_email: f.office_email,
        enrolment_target: f.enrolment_target,
        annual_budget: f.annual_budget,
        remove_aop: f.remove_aop || undefined,
      }, aopFile, mode === "edit" ? editingId : null);
      toast.success(mode === "edit" ? "Profile updated" : "Profile saved");
      if (createOnly && mode === "create") remountCreateForm();
      else {
        setMode("list");
        load();
      }
    } catch (err: any) {
      toast.error("Could not save profile", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const counts = React.useMemo(() => ({
    total: rows.length,
    withAop: rows.filter((r) => r.aop_file_path).length,
    states: new Set(rows.map((r) => r.state_id)).size,
    year: rows.filter((r) => String(r.reporting_year) === currentYear).length,
  }), [rows, currentYear]);

  const hasFilters = filterYear !== "all" || filterZone !== "all" || stateFilterActive;
  const filterZoneLabel = filterZone === "all"
    ? "All Zones"
    : (zones.find((z) => String(z.id) === filterZone)?.description ?? filterZone);
  const filterStateLabel = filterState === ALL_STATES
    ? "All States"
    : (filterStates.find((s) => String(s.id) === filterState)?.description ?? filterState);
  const zoneLabel = zones.find((z) => String(z.id) === f.zone_id)?.description ?? "Select Zone";
  const stateLabel = formStates.find((s) => String(s.id) === f.state_id)?.description ?? "Select State";
  const readOnly = mode === "view";
  const lockGeo = readOnly || zoneLocked;
  const lockStateField = readOnly || stateLocked || !f.zone_id;

  const formBody = (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Zone <span className="text-red-500">*</span></Label>
              <Select value={f.zone_id} onValueChange={(v) => setField("zone_id", v)} disabled={lockGeo}>
                <SelectTrigger className={`w-full ${lockGeo ? "opacity-70 bg-slate-50" : ""}`} displayValue={zoneLabel}>
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State <span className="text-red-500">*</span></Label>
              <Select value={f.state_id} onValueChange={(v) => setField("state_id", v)} disabled={lockStateField}>
                <SelectTrigger className={`w-full ${lockStateField ? "opacity-70 bg-slate-50" : ""}`} displayValue={stateLabel}>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {formStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reporting Year <span className="text-red-500">*</span></Label>
              <Select value={f.reporting_year} onValueChange={(v) => setField("reporting_year", v)} disabled={readOnly}>
                <SelectTrigger className={`w-full ${readOnly ? "opacity-70 bg-slate-50" : ""}`} displayValue={f.reporting_year}>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-[#145c3f]">Coordinator & Staff</CardTitle>
          <CardDescription>One row per office and reporting year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Staff Strength</Label>
              <Input type="number" min={0} placeholder="Whole number" disabled={readOnly} value={f.staff_strength} onChange={(e) => setField("staff_strength", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State Coordinator Name</Label>
              <Input disabled={readOnly} value={f.coordinator_name} onChange={(e) => setField("coordinator_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Coordinator Phone Number</Label>
              <Input type="tel" disabled={readOnly} value={f.coordinator_phone} onChange={(e) => setField("coordinator_phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Coordinator E-mail</Label>
              <Input type="email" disabled={readOnly} value={f.coordinator_email} onChange={(e) => setField("coordinator_email", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-[#145c3f]">Office, Targets & AOP</CardTitle>
          <CardDescription>Record enrolment target and annual budget as numeric values; attach the approved AOP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Office Address</Label>
              <Input disabled={readOnly} value={f.office_address} onChange={(e) => setField("office_address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Office E-mail</Label>
              <Input type="email" disabled={readOnly} value={f.office_email} onChange={(e) => setField("office_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Enrolment Target</Label>
              <Input type="number" min={0} disabled={readOnly} value={f.enrolment_target} onChange={(e) => setField("enrolment_target", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Annual Budget (NGN)</Label>
              <Input type="number" min={0} step="0.01" disabled={readOnly} value={f.annual_budget} onChange={(e) => setField("annual_budget", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>AOP (attachment)</Label>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAopFile(file);
                  if (file) setField("remove_aop", "");
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                    {aopFile ? "Replace file" : "Upload / attach"}
                  </Button>
                )}
                {aopFile && <span className="text-xs text-slate-600 truncate max-w-[180px]">{aopFile.name}</span>}
                {!aopFile && existingAop && f.remove_aop !== "true" ? (
                  <>
                    <a className="text-xs text-primary underline truncate max-w-[180px]" href={apiFileUrl(existingAop.path)} target="_blank" rel="noreferrer">
                      {existingAop.name}
                    </a>
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-rose-600 hover:bg-rose-50" onClick={() => { setField("remove_aop", "true"); setExistingAop(null); }}>
                        Remove
                      </Button>
                    )}
                  </>
                ) : (
                  readOnly && !aopFile ? <span className="text-sm text-slate-400">No AOP attached</span> : null
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (mode === "view") {
    const zoneName = detail?.zone?.description || zones.find((z) => String(z.id) === f.zone_id)?.description || "—";
    const stateName = detail?.state?.description || formStates.find((s) => String(s.id) === f.state_id)?.description || "—";
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMode(createOnly ? "create" : "list")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight">Office Profile</h2>
          </div>
          {canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={() => setMode("edit")}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
                <div className="bg-gradient-to-r from-[#145c3f] to-[#1a7a54] px-6 py-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Reporting year {f.reporting_year}</p>
                  <h3 className="mt-1 text-2xl font-bold">{stateName}</h3>
                  <p className="mt-1 text-sm text-white/80">{zoneName}</p>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#145c3f]">Coordinator & Staff</CardTitle>
                  <CardDescription>State coordinator contacts and staff strength</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoField label="Staff Strength" value={f.staff_strength || "—"} />
                    <InfoField
                      label="Coordinator Name"
                      value={<span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" />{f.coordinator_name || "—"}</span>}
                    />
                    <InfoField
                      label="Phone"
                      value={f.coordinator_phone ? <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />{f.coordinator_phone}</span> : "—"}
                    />
                    <InfoField
                      label="E-mail"
                      value={f.coordinator_email ? <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={`mailto:${f.coordinator_email}`}><Mail className="w-3.5 h-3.5" />{f.coordinator_email}</a> : "—"}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#145c3f]">Office, Targets & AOP</CardTitle>
                  <CardDescription>Location, enrolment target, budget, and approved AOP</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField
                      label="Office Address"
                      value={<span className="inline-flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />{f.office_address || "—"}</span>}
                    />
                    <InfoField
                      label="Office E-mail"
                      value={f.office_email ? <a className="text-primary hover:underline" href={`mailto:${f.office_email}`}>{f.office_email}</a> : "—"}
                    />
                    <InfoField label="Enrolment Target" value={f.enrolment_target || "—"} />
                    <InfoField label="Annual Budget (NGN)" value={money(f.annual_budget)} />
                    <InfoField
                      label="AOP attachment"
                      value={
                        existingAop && f.remove_aop !== "true" ? (
                          <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={apiFileUrl(existingAop.path)} target="_blank" rel="noreferrer">
                            <Paperclip className="w-3.5 h-3.5" /> {existingAop.name}
                          </a>
                        ) : "None attached"
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode !== "list") {
    return (
      <div key={formKey} className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <h2 className="text-xl font-bold tracking-tight">
            {mode === "edit" ? "Edit Office Profile" : "New Office Profile"}
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">
            {formBody}
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={mode === "edit" ? () => setMode("view") : leaveForm}>Cancel</Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === "edit" ? "Update Profile" : "Save Profile"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-xl font-bold tracking-tight">State/Zonal Office Profile</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" /> New Profile
          </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total", value: counts.total, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
              { label: `${currentYear} records`, value: counts.year, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
              { label: "With AOP", value: counts.withAop, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
              { label: "States covered", value: counts.states, color: "bg-slate-50 border-slate-200", text: "text-slate-600" },
            ].map((c) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}
              >
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {!zoneLocked && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); if (showStateFilter) setFilterState(ALL_STATES); }}>
                  <SelectTrigger className="w-full" displayValue={filterZoneLabel}>
                    <SelectValue placeholder="All Zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showStateFilter && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full" displayValue={filterStateLabel}>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATES}>All States</SelectItem>
                    {filterStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 min-w-[120px]">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 gap-1 shrink-0"
                onClick={() => {
                  setFilterYear("all");
                  if (!zoneLocked) setFilterZone("all");
                  if (showStateFilter) setFilterState(ALL_STATES);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading..." : `${rows.length} profile${rows.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <Building2 className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No profiles match your filters" : "No office profiles found"}</p>
                  {!hasFilters && canCreate && (
                    <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={openCreate}>
                      <Plus className="w-4 h-4" /> New Profile
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Staff</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Coordinator</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Enrolment Target</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Annual Budget</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">AOP</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <motion.tr
                          key={row.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0"
                        >
                          <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{row.reporting_year}</TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{row.zone?.description || "—"}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{row.state?.description || "—"}</TableCell>
                          <TableCell className="text-sm text-slate-600 text-right tabular-nums">{row.staff_strength ?? "—"}</TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            <div>{row.coordinator_name || "—"}</div>
                            <div className="text-xs text-slate-400">{row.coordinator_email || row.coordinator_phone || ""}</div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 text-right tabular-nums">{row.enrolment_target ?? "—"}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-800 text-right tabular-nums">{money(row.annual_budget)}</TableCell>
                          <TableCell>
                            {row.aop_file_path ? (
                              <a
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                href={apiFileUrl(row.aop_file_path)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Paperclip className="w-3 h-3" /> {row.aop_original_name || "AOP"}
                              </a>
                            ) : (
                              <Badge className="text-[10px] px-2 py-0.5 border bg-slate-100 text-slate-500 border-slate-200">None</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                              onClick={() => openView(row)}
                            >
                              <Eye className="w-3.5 h-3.5" />
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
