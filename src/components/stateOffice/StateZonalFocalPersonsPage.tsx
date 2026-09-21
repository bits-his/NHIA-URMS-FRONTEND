import * as React from "react";
import {
  Plus, RefreshCw, Loader2, Pencil, Eye, Save, Users, ArrowLeft, Mail, Phone, MapPin, BadgeCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateZonalFocalPersonApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string; zonal_id?: number };
type RecordRow = {
  id: number;
  reporting_year: number;
  zone_id: number;
  state_id: number;
  domain: string;
  officer_name: string;
  designation: string;
  email: string | null;
  phone: string | null;
  state_display_id?: string;
  zone_display_id?: string;
  zone?: Geo;
  state?: Geo;
};

type Mode = "list" | "create" | "edit" | "view";

export const FOCAL_DOMAINS = [
  { value: "planning_cell_rep", label: "Planning Cell Rep" },
  { value: "data_reporting_officer", label: "Data & Reporting Officer" },
  { value: "cemonc", label: "CEMONC" },
  { value: "ffp", label: "FFP" },
  { value: "procurement_officer", label: "Procurement Officer" },
  { value: "actu", label: "ACTU" },
  { value: "servicom", label: "SERVICOM" },
  { value: "complaint_officer", label: "Complaint Officer" },
];

export const FOCAL_DESIGNATIONS = [
  { value: "director", label: "Director" },
  { value: "deputy_director", label: "Deputy Director" },
  { value: "assistant_director", label: "Assistant Director" },
  { value: "assistant_chief_officer", label: "Assistant Chief Officer" },
  { value: "chief_officer", label: "Chief Officer" },
  { value: "principal_officer", label: "Principal Officer" },
  { value: "senior_officer", label: "Senior Officer" },
  { value: "officer_i", label: "Officer I" },
  { value: "officer_ii", label: "Officer II" },
  { value: "principal_confidential_secretary", label: "Principal Confidential Secretary" },
  { value: "senior_confidential_secretary", label: "Senior Confidential Secretary" },
];

const emptyForm = (year: string, zoneId?: string | null, stateId?: string | null) => ({
  reporting_year: year,
  zone_id: zoneId ?? "",
  state_id: stateId ?? "",
  domain: "",
  officer_name: "",
  designation: "",
  email: "",
  phone: "",
});

type FormState = ReturnType<typeof emptyForm>;

function displayStateId(stateId: string | number | null | undefined) {
  if (!stateId) return "—";
  return `ST-${String(stateId).padStart(3, "0")}`;
}
function displayZoneId(zoneId: string | number | null | undefined) {
  if (!zoneId) return "—";
  return `ZN-${String(zoneId).padStart(2, "0")}`;
}
function labelOf(opts: { value: string; label: string }[], value: string) {
  return opts.find((o) => o.value === value)?.label ?? (value || "Select");
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words">{value || "—"}</div>
    </div>
  );
}

export default function StateZonalFocalPersonsPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const { canCreate, createOnly } = useCreateReviewAccess();
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const currentYear = yearOptions[0] || String(new Date().getFullYear());

  const [mode, setMode] = React.useState<Mode>(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [rows, setRows] = React.useState<RecordRow[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [detail, setDetail] = React.useState<RecordRow | null>(null);

  const [zones, setZones] = React.useState<Geo[]>([]);
  const [formStates, setFormStates] = React.useState<Geo[]>([]);
  const [f, setF] = React.useState<FormState>(emptyForm(currentYear, defaultZoneId, defaultStateId));

  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [filterDomain, setFilterDomain] = React.useState("all");
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
      const res = await stateZonalFocalPersonApi.list({
        year: filterYear !== "all" ? filterYear : undefined,
        zone_id: (filterZone !== "all" ? filterZone : defaultZoneId) || undefined,
        state_id: apiStateId || defaultStateId || undefined,
        domain: filterDomain !== "all" ? filterDomain : undefined,
      });
      setRows(res.data || []);
    } catch (err: any) {
      toast.error("Failed to load focal persons", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterZone, apiStateId, defaultZoneId, defaultStateId, filterDomain, createOnly]);

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

  const fillForm = (row: RecordRow) => {
    setEditingId(row.id);
    setF({
      reporting_year: String(row.reporting_year),
      zone_id: String(row.zone_id),
      state_id: String(row.state_id),
      domain: row.domain || "",
      officer_name: row.officer_name || "",
      designation: row.designation || "",
      email: row.email || "",
      phone: row.phone || "",
    });
  };

  const openView = (row: RecordRow) => { fillForm(row); setDetail(row); setMode("view"); };

  const handleSave = async () => {
    if (!f.reporting_year || !f.zone_id || !f.state_id) {
      toast.error("Year, zone, and state are required.");
      return;
    }
    if (!f.domain || !f.officer_name.trim() || !f.designation) {
      toast.error("Domain, name of office, and designation are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        reporting_year: Number(f.reporting_year),
        zone_id: Number(f.zone_id),
        state_id: Number(f.state_id),
        domain: f.domain,
        officer_name: f.officer_name.trim(),
        designation: f.designation,
        email: f.email || null,
        phone: f.phone || null,
      };
      if (mode === "edit" && editingId) {
        await stateZonalFocalPersonApi.update(editingId, payload);
        toast.success("Focal person updated");
      } else {
        await stateZonalFocalPersonApi.create(payload);
        toast.success("Focal person saved");
      }
      if (createOnly && mode === "create") remountCreateForm();
      else {
        setMode("list");
        load();
      }
    } catch (err: any) {
      toast.error("Could not save record", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const counts = React.useMemo(() => ({
    total: rows.length,
    year: rows.filter((r) => String(r.reporting_year) === currentYear).length,
    domains: new Set(rows.map((r) => r.domain)).size,
    states: new Set(rows.map((r) => r.state_id)).size,
  }), [rows, currentYear]);

  const hasFilters = filterYear !== "all" || filterZone !== "all" || stateFilterActive || filterDomain !== "all";
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <Label>Zone ID <span className="text-[10px] font-normal text-slate-400">(auto-generated)</span></Label>
              <div className="h-10 flex items-center px-3 rounded-md border border-input bg-slate-50 text-sm font-mono font-bold text-primary">
                {displayZoneId(f.zone_id)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>State <span className="text-red-500">*</span></Label>
              <Select value={f.state_id} onValueChange={(v) => setField("state_id", v)} disabled={lockStateField}>
                <SelectTrigger className={`w-full ${lockStateField ? "opacity-70 bg-slate-50" : ""}`} displayValue={f.zone_id ? stateLabel : "Select Zone first"}>
                  <SelectValue placeholder={f.zone_id ? "Select State" : "Select Zone first"} />
                </SelectTrigger>
                <SelectContent>
                  {formStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State ID <span className="text-[10px] font-normal text-slate-400">(auto-generated)</span></Label>
              <div className="h-10 flex items-center px-3 rounded-md border border-input bg-slate-50 text-sm font-mono font-bold text-primary">
                {displayStateId(f.state_id)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Year <span className="text-red-500">*</span></Label>
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
          <CardTitle className="text-xl font-bold text-[#145c3f]">Focal Person Details</CardTitle>
          <CardDescription>One record per domain, state office, and reporting year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Domain <span className="text-red-500">*</span></Label>
              <Select value={f.domain} onValueChange={(v) => setField("domain", v)} disabled={readOnly}>
                <SelectTrigger className={`w-full ${readOnly ? "opacity-70 bg-slate-50" : ""}`} displayValue={labelOf(FOCAL_DOMAINS, f.domain)}>
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent>
                  {FOCAL_DOMAINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name of Office <span className="text-red-500">*</span></Label>
              <Input disabled={readOnly} value={f.officer_name} onChange={(e) => setField("officer_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Designation <span className="text-red-500">*</span></Label>
              <Select value={f.designation} onValueChange={(v) => setField("designation", v)} disabled={readOnly}>
                <SelectTrigger className={`w-full ${readOnly ? "opacity-70 bg-slate-50" : ""}`} displayValue={labelOf(FOCAL_DESIGNATIONS, f.designation)}>
                  <SelectValue placeholder="Select Designation" />
                </SelectTrigger>
                <SelectContent>
                  {FOCAL_DESIGNATIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" disabled={readOnly} value={f.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input type="tel" disabled={readOnly} value={f.phone} onChange={(e) => setField("phone", e.target.value)} />
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
            <h2 className="text-xl font-bold tracking-tight">Focal Person</h2>
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
                  <h3 className="mt-1 text-2xl font-bold">{f.officer_name || "—"}</h3>
                  <p className="mt-1 text-sm text-white/80">{labelOf(FOCAL_DESIGNATIONS, f.designation)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{labelOf(FOCAL_DOMAINS, f.domain)}</span>
                    <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-bold">{displayStateId(f.state_id)}</span>
                    <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-bold">{displayZoneId(f.zone_id)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#145c3f]">Location</CardTitle>
                  <CardDescription>State and zonal office assignment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoField label="Zone" value={<span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{zoneName}</span>} />
                    <InfoField label="Zone ID" value={<span className="font-mono text-primary">{displayZoneId(f.zone_id)}</span>} />
                    <InfoField label="State" value={stateName} />
                    <InfoField label="State ID" value={<span className="font-mono text-primary">{displayStateId(f.state_id)}</span>} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#145c3f]">Role & Contact</CardTitle>
                  <CardDescription>Domain, designation, and contact details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoField
                      label="Domain"
                      value={<span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-primary" />{labelOf(FOCAL_DOMAINS, f.domain)}</span>}
                    />
                    <InfoField label="Designation" value={labelOf(FOCAL_DESIGNATIONS, f.designation)} />
                    <InfoField label="Name of Office" value={f.officer_name || "—"} />
                    <InfoField
                      label="E-mail"
                      value={f.email ? <a className="inline-flex items-center gap-1.5 text-primary hover:underline" href={`mailto:${f.email}`}><Mail className="w-3.5 h-3.5" />{f.email}</a> : "—"}
                    />
                    <InfoField
                      label="Phone Number"
                      value={f.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />{f.phone}</span> : "—"}
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
            {mode === "edit" ? "Edit Focal Person" : "New Focal Person"}
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">{formBody}</div>
        </ScrollArea>
        <div className="sticky bottom-0 z-30 bg-white border-t border-border/50 px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={mode === "edit" ? () => setMode("view") : leaveForm}>Cancel</Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-xl font-bold tracking-tight">State/Zonal Focal Persons Register</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Record
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
              { label: "Domains", value: counts.domains, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
              { label: "States covered", value: counts.states, color: "bg-slate-50 border-slate-200", text: "text-slate-600" },
            ].map((c) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}>
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {!zoneLocked && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterZone} onValueChange={(v) => { setFilterZone(v); if (showStateFilter) setFilterState(ALL_STATES); }}>
                  <SelectTrigger className="w-full" displayValue={filterZoneLabel}><SelectValue placeholder="All Zones" /></SelectTrigger>
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
                  <SelectTrigger className="w-full" displayValue={filterStateLabel}><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATES}>All States</SelectItem>
                    {filterStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 min-w-[120px]">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="w-full" displayValue={filterDomain === "all" ? "All Domains" : labelOf(FOCAL_DOMAINS, filterDomain)}>
                  <SelectValue placeholder="All Domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {FOCAL_DOMAINS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={() => {
                setFilterYear("all");
                setFilterDomain("all");
                if (!zoneLocked) setFilterZone("all");
                if (showStateFilter) setFilterState(ALL_STATES);
              }}>Clear</Button>
            )}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading..." : `${rows.length} record${rows.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <Users className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No records match your filters" : "No focal persons found"}</p>
                  {!hasFilters && canCreate && (
                    <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={openCreate}>
                      <Plus className="w-4 h-4" /> New Record
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State ID</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone ID</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Domain</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Name of Office</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Designation</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">E-mail</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Phone Number</TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <motion.tr key={row.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                          <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{row.reporting_year}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{row.state?.description || "—"}</TableCell>
                          <TableCell><span className="font-mono text-xs font-bold text-primary">{row.state_display_id || displayStateId(row.state_id)}</span></TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{row.zone?.description || "—"}</TableCell>
                          <TableCell><span className="font-mono text-xs font-bold text-primary">{row.zone_display_id || displayZoneId(row.zone_id)}</span></TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{labelOf(FOCAL_DOMAINS, row.domain)}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-800 whitespace-nowrap">{row.officer_name}</TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{labelOf(FOCAL_DESIGNATIONS, row.designation)}</TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{row.email || "—"}</TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">{row.phone || "—"}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10" onClick={() => openView(row)}>
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
