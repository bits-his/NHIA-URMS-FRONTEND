import * as React from "react";
import {
  ArrowLeft, Plus, Eye, Pencil, RefreshCw, Loader2, Save, Trash2, Wallet, MapPin, CalendarDays,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeHmoIndebtednessApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import HcfFacilitySelect from "../servicom/HcfFacilitySelect";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";

interface Props {
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string };
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
function pickGeoLabel(options: Geo[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words">{value || "—"}</div>
    </div>
  );
}

export default function StateOfficeHmoIndebtednessPage({ onBack, defaultStateId, defaultZoneId }: Props) {
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [mode, setMode] = React.useState<Mode>(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [refId, setRefId] = React.useState<string | null>(null);
  const [zones, setZones] = React.useState<Geo[]>([]);
  const [states, setStates] = React.useState<Geo[]>([]);
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [periodYear, setPeriodYear] = React.useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = React.useState(String(new Date().getMonth() + 1));
  const [lines, setLines] = React.useState<Line[]>([emptyLine()]);
  const [submittedBy, setSubmittedBy] = React.useState("");

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

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateOfficeHmoIndebtednessApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load collation sheets", { description: err.message });
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
    if (!zoneId) { setStates([]); return; }
    stockApi.getStates(zoneId).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [zoneId]);

  const sheetTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  const applyRow = (row: any) => {
    setEditingId(row.id);
    setRefId(row.reference_id);
    setZoneId(String(row.zone_id));
    setStateId(String(row.state_id));
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
    setLines(mapped.length ? mapped : [emptyLine()]);
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setRefId(null);
    setZoneId(defaultZoneId ?? "");
    setStateId(defaultStateId ?? "");
    setPeriodYear(filterYear);
    setPeriodMonth(filterMonth);
    setSubmittedBy("");
    setLines([emptyLine()]);
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

  const handleSave = async () => {
    if (!zoneId || !stateId) {
      toast.error("Zone and state are required.");
      return;
    }
    const valid = lines.filter((l) => l.hmo_name.trim() && l.facility_name.trim());
    if (!valid.length) {
      toast.error("Add at least one HMO–facility row.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        zone_id: Number(zoneId),
        state_id: Number(stateId),
        reporting_year: Number(periodYear),
        reporting_month: Number(periodMonth),
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
      if (createOnly && mode === "create") remountCreateForm();
      else setMode("list");
    } catch (e: any) {
      toast.error("Failed to save sheet", { description: e.message });
    } finally { setSaving(false); }
  };

  const headerFields = (
    <Card className="rounded-2xl border-[#d4e8dc]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#145c3f]">HMO Indebtedness Collation Sheet</CardTitle>
        <CardDescription>Enforcement Department · Template 1</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Zone *</Label>
          <Select value={zoneId} disabled={zoneLocked} onValueChange={(v) => { setZoneId(v); if (!stateLocked) setStateId(""); }}>
            <SelectTrigger displayValue={pickGeoLabel(zones, zoneId, "Zone")}><SelectValue /></SelectTrigger>
            <SelectContent>{zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>State *</Label>
          <Select value={stateId} disabled={stateLocked || !zoneId} onValueChange={setStateId}>
            <SelectTrigger displayValue={pickGeoLabel(states, stateId, zoneId ? "State" : "Select zone first")}><SelectValue /></SelectTrigger>
            <SelectContent>{states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Period — Year</Label>
          <Select value={periodYear} onValueChange={setPeriodYear}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Period — Month</Label>
          <Select value={periodMonth} onValueChange={setPeriodMonth}>
            <SelectTrigger displayValue={monthLabel(periodMonth)}><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {refId ? (
          <div className="space-y-2">
            <Label>Sheet ID</Label>
            <Input value={refId} readOnly className="font-mono text-xs" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const linesTable = (
    <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base text-[#145c3f]">Alleged Indebtedness</CardTitle>
          <span className="text-sm font-bold text-[#145c3f]">Sheet total ₦{naira(sheetTotal)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold min-w-[180px]">HMO Name</TableHead>
              <TableHead className="text-xs font-bold min-w-[200px]">Name of Facility</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">HCF Code</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">NHIA CAP</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">NHIA FFS</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">PHI</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">Total</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l._key}>
                <TableCell className="align-top py-2">
                  <AccreditedProviderSelect
                    type="hmo"
                    value={l.hmo_id}
                    placeholder="Select HMO"
                    onChange={(p) => setLines((prev) => prev.map((x) => x._key === l._key ? {
                      ...x, hmo_id: p?.id ?? "", hmo_name: p?.name ?? "",
                    } : x))}
                  />
                </TableCell>
                <TableCell className="align-top py-2">
                  <HcfFacilitySelect
                    stateId={stateId || undefined}
                    value={l.facility_id}
                    placeholder="Select facility"
                    onChange={(f) => setLines((prev) => prev.map((x) => x._key === l._key ? {
                      ...x,
                      facility_id: f?.id ?? "",
                      facility_name: f?.name ?? "",
                      hcf_code: f?.code || f?.facility_code || x.hcf_code,
                    } : x))}
                  />
                </TableCell>
                <TableCell className="align-top py-2">
                  <Input className="h-9 font-mono text-xs" value={l.hcf_code} onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, hcf_code: e.target.value } : x))} />
                </TableCell>
                {(["nhia_cap", "nhia_ffs", "phi"] as const).map((key) => (
                  <TableCell key={key} className="align-top py-2">
                    <Input
                      className="h-9 font-mono text-xs"
                      type="number"
                      min={0}
                      step="0.01"
                      value={l[key]}
                      onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, [key]: e.target.value } : x))}
                    />
                  </TableCell>
                ))}
                <TableCell className="align-top py-2 text-sm font-mono font-bold text-[#145c3f]">₦{naira(lineTotal(l))}</TableCell>
                <TableCell className="align-top py-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines((prev) => prev.length <= 1 ? [emptyLine()] : prev.filter((x) => x._key !== l._key))}>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-[#d4e8dc]">
          <Button type="button" variant="outline" className="gap-2" onClick={() => setLines((p) => [...p, emptyLine()])}>
            <Plus className="w-4 h-4" /> Add row
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === "view") {
    const zoneName = pickGeoLabel(zones, zoneId, "—");
    const stateName = pickGeoLabel(states, stateId, "—");
    const period = `${monthLabel(periodMonth)} ${periodYear}`;
    const capTotal = lines.reduce((s, l) => s + money(l.nhia_cap), 0);
    const ffsTotal = lines.reduce((s, l) => s + money(l.nhia_ffs), 0);
    const phiTotal = lines.reduce((s, l) => s + money(l.phi), 0);
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode(createOnly ? "create" : "list")} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
            <h2 className="text-xl font-bold tracking-tight">View Collation Sheet</h2>
          </div>
          {canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={() => setMode("edit")}>
            <Pencil className="w-4 h-4" /> Edit
          </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <div className="bg-gradient-to-r from-[#145c3f] to-[#1a7a54] text-white px-6 py-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/70">HMO Indebtedness Collation · Template 1</p>
                  <h3 className="text-2xl font-bold mt-1">{stateName}</h3>
                  <p className="text-sm text-white/80 mt-1 inline-flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{zoneName}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{period}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-white/70">Sheet total</p>
                  <p className="font-mono text-2xl font-bold">₦{naira(sheetTotal)}</p>
                  {refId ? <p className="mt-1 font-mono text-xs text-white/80">{refId}</p> : null}
                </div>
              </div>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-[#f0fdf7]/40">
                <InfoField label="Sheet ID" value={<span className="font-mono">{refId}</span>} />
                <InfoField label="State" value={stateName} />
                <InfoField label="Period" value={period} />
                <InfoField label="Prepared by" value={submittedBy} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "NHIA CAP", value: capTotal },
                { label: "NHIA FFS", value: ffsTotal },
                { label: "PHI", value: phiTotal },
              ].map((item) => (
                <Card key={item.label} className="rounded-2xl border-[#d4e8dc] bg-white">
                  <CardContent className="py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 font-mono text-lg font-bold text-[#145c3f]">₦{naira(item.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
              <CardHeader className="pb-3 border-b bg-[#f0fdf7]">
                <CardTitle className="text-base text-[#145c3f]">Alleged Indebtedness</CardTitle>
                <CardDescription>{lines.length} HMO–facility row{lines.length === 1 ? "" : "s"}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="text-xs font-bold text-slate-500 w-10">#</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">HMO Name</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">Name of Facility</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500">HCF Code</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 text-right">NHIA CAP</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 text-right">NHIA FFS</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 text-right">PHI</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l, i) => (
                      <TableRow key={l._key} className="border-b border-[#d4e8dc]/70">
                        <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-800">{l.hmo_name || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-700">{l.facility_name || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">{l.hcf_code || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_cap)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.nhia_ffs)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.phi)}</TableCell>
                        <TableCell className="text-sm font-mono font-bold text-right text-[#145c3f]">₦{naira(lineTotal(l))}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-[#145c3f] hover:bg-[#145c3f]">
                      <TableCell colSpan={4} className="text-sm font-bold text-white">Grand total</TableCell>
                      <TableCell className="text-sm font-mono font-bold text-right text-white">₦{naira(capTotal)}</TableCell>
                      <TableCell className="text-sm font-mono font-bold text-right text-white">₦{naira(ffsTotal)}</TableCell>
                      <TableCell className="text-sm font-mono font-bold text-right text-white">₦{naira(phiTotal)}</TableCell>
                      <TableCell className="text-sm font-mono font-bold text-right text-white">₦{naira(sheetTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div key={formKey} className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={mode === "edit" ? () => setMode("view") : leaveForm} className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
            <h2 className="text-xl font-bold tracking-tight">
              {mode === "edit" ? "Edit Collation Sheet" : "New HMO Indebtedness Sheet"}
            </h2>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">
            {headerFields}
            {linesTable}
          </div>
        </ScrollArea>
        <div className="sticky bottom-0 z-30 bg-white border-t px-4 md:px-6 py-3 flex justify-end gap-3">
          <Button variant="outline" onClick={mode === "edit" ? () => setMode("view") : leaveForm}>Cancel</Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === "edit" ? "Update" : "Save Sheet"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <h2 className="text-xl font-bold tracking-tight">HMO Indebtedness Collation</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
          <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Sheet
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
                  <SelectTrigger displayValue={filterZone === "all" ? "All Zones" : pickGeoLabel(zones, filterZone, "Zone")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!zoneLocked && <SelectItem value="all">All Zones</SelectItem>}
                    {zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">State</Label>
                <Select value={filterState} disabled={stateLocked} onValueChange={setFilterState}>
                  <SelectTrigger displayValue={stateLocked ? pickGeoLabel(dashboardStates, filterState, "State") : (filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State"))}><SelectValue /></SelectTrigger>
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
                <Wallet className="w-4 h-4" />
                {loading ? "Loading..." : `${rows.length} sheet(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold">Reference</TableHead>
                      <TableHead className="text-xs font-bold">State</TableHead>
                      <TableHead className="text-xs font-bold">Period</TableHead>
                      <TableHead className="text-xs font-bold">Rows</TableHead>
                      <TableHead className="text-xs font-bold">Total</TableHead>
                      <TableHead className="text-xs font-bold w-16">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((v, i) => {
                      const total = (v.lines ?? []).reduce((s: number, l: any) => s + money(l.total), 0);
                      return (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-slate-100">
                          <TableCell className="font-mono text-xs font-bold text-primary">{v.reference_id}</TableCell>
                          <TableCell className="text-xs">{v.state?.description ?? "—"}</TableCell>
                          <TableCell className="text-xs">{monthLabel(v.reporting_month)} {v.reporting_year}</TableCell>
                          <TableCell className="text-xs">{(v.lines ?? []).length}</TableCell>
                          <TableCell className="text-xs font-mono font-semibold">₦{naira(total)}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { applyRow(v); setMode("view"); }}>
                              <Eye className="w-4 h-4 text-[#145c3f]" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
