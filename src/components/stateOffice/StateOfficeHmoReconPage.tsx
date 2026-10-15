import * as React from "react";
import {
  ArrowLeft, Plus, Eye, Pencil, RefreshCw, Loader2, Save, Trash2, Building2,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeHmoIndebtednessApi, stateOfficeHmoReconApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import HcfFacilitySelect from "../servicom/HcfFacilitySelect";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { HMO_RECON_STREAM_META, type HmoReconStream } from "./hmoIndebtednessTypes";

interface Props {
  stream: HmoReconStream;
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
}

type Geo = { id: number; description: string };
type Mode = "list" | "create" | "edit" | "view";
type Line = {
  _key: string;
  hcf_name: string;
  hcf_code: string;
  facility_id?: string;
  alleged_amount: string;
  actual_amount: string;
  agreed_amount: string;
  amount_paid: string;
  remarks: string;
  from_collation?: boolean;
};

const uid = () => Math.random().toString(36).slice(2);
const emptyLine = (): Line => ({
  _key: uid(),
  hcf_name: "",
  hcf_code: "",
  alleged_amount: "",
  actual_amount: "",
  agreed_amount: "",
  amount_paid: "",
  remarks: "",
  from_collation: false,
});

function amountText(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(n);
}

function money(v: string | number | null | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function naira(v: string | number | null | undefined) {
  return money(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function outstandingOf(l: Pick<Line, "agreed_amount" | "amount_paid">) {
  return money(l.agreed_amount) - money(l.amount_paid);
}
function pickGeoLabel(options: Geo[], value: string, fallback: string) {
  if (!value) return fallback;
  return options.find((o) => String(o.id) === value)?.description ?? fallback;
}

function allegedFieldForStream(stream: HmoReconStream): "phi" | "nhia_ffs" | "nhia_cap" {
  if (stream === "ffs") return "nhia_ffs";
  if (stream === "cap") return "nhia_cap";
  return "phi";
}

function hmoLabel(name: string, code?: string | null) {
  const n = String(name || "").trim();
  const c = String(code || "").trim();
  if (n && c) return `${n} - ${c}`;
  return n || c || "HMO";
}

export default function StateOfficeHmoReconPage({
  stream, onBack, defaultStateId, defaultZoneId,
}: Props) {
  const meta = HMO_RECON_STREAM_META[stream];
  const { canCreate, createOnly } = useStateOfficeAccess();
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
  const [hmoId, setHmoId] = React.useState("");
  const [hmoName, setHmoName] = React.useState("");
  const [hmoCode, setHmoCode] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([emptyLine()]);
  const [loadingHcfs, setLoadingHcfs] = React.useState(false);
  const [selectedHmoFilter, setSelectedHmoFilter] = React.useState<string>("all");
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
    stream,
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear !== "all" ? filterYear : undefined,
    month: filterMonth !== "all" ? filterMonth : undefined,
    hmo: selectedHmoFilter !== "all" ? selectedHmoFilter : undefined,
  }), [stream, filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth, selectedHmoFilter]);

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stateOfficeHmoReconApi.list(apiFilters);
      setRows(res.data);
    } catch (err: any) {
      toast.error("Failed to load reconciliation sheets", { description: err.message });
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

  const hmoOptions = React.useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => { if (r.hmo_name) names.add(r.hmo_name); });
    return Array.from(names).sort();
  }, [rows]);

  const hmoGroups = React.useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      code: string;
      stateId: string;
      stateName: string;
      periods: string[];
      hcfCount: number;
      outstanding: number;
      latest: any;
    }>();
    for (const row of rows) {
      const name = String(row.hmo_name || "").trim() || "Unassigned HMO";
      const sid = String(row.state_id);
      const key = `${name.toLowerCase()}::${sid}`;
      const outstanding = (row.lines ?? []).reduce(
        (s: number, l: any) => s + money(l.outstanding ?? (Number(l.agreed_amount) - Number(l.amount_paid))),
        0,
      );
      const period = `${monthLabel(row.reporting_month)} ${row.reporting_year}`;
      const stateName = row.state?.description ?? "—";
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name,
          code: row.hmo_code ?? "",
          stateId: sid,
          stateName,
          periods: [period],
          hcfCount: (row.lines ?? []).length,
          outstanding,
          latest: row,
        });
      } else {
        if (!existing.periods.includes(period)) existing.periods.push(period);
        existing.hcfCount += (row.lines ?? []).length;
        existing.outstanding += outstanding;
        const newer =
          Number(row.reporting_year) > Number(existing.latest.reporting_year)
          || (Number(row.reporting_year) === Number(existing.latest.reporting_year)
            && Number(row.reporting_month) >= Number(existing.latest.reporting_month));
        if (newer) {
          existing.latest = row;
          existing.code = row.hmo_code ?? existing.code;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.stateName.localeCompare(b.stateName) || a.name.localeCompare(b.name),
    );
  }, [rows]);

  const viewSiblingSheets = React.useMemo(() => {
    const needle = hmoName.trim().toLowerCase();
    if (!needle || !stateId) return [] as any[];
    const source = viewSheets.length ? viewSheets : rows;
    return source.filter((r) =>
      String(r.hmo_name || "").trim().toLowerCase() === needle
      && String(r.state_id) === stateId,
    );
  }, [rows, viewSheets, hmoName, stateId]);

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

  const sheetTotals = React.useMemo(() => {
    const alleged = lines.reduce((s, l) => s + money(l.alleged_amount), 0);
    const actual = lines.reduce((s, l) => s + money(l.actual_amount), 0);
    const agreed = lines.reduce((s, l) => s + money(l.agreed_amount), 0);
    const paid = lines.reduce((s, l) => s + money(l.amount_paid), 0);
    return { alleged, actual, agreed, paid, outstanding: agreed - paid };
  }, [lines]);

  const loadHcfsFromCollation = React.useCallback(async (selectedHmoName: string) => {
    const name = selectedHmoName.trim();
    if (!name || !stateId || !periodYear || !periodMonth) {
      setLines([emptyLine()]);
      return;
    }
    setLoadingHcfs(true);
    try {
      const res = await stateOfficeHmoIndebtednessApi.list({
        state_id: stateId,
        zone_id: zoneId || undefined,
        year: periodYear,
        month: periodMonth,
      });
      const field = allegedFieldForStream(stream);
      const needle = name.toLowerCase();
      const matched = (res.data ?? []).flatMap((sheet: any) =>
        (sheet.lines ?? []).filter((l: any) => String(l.hmo_name || "").trim().toLowerCase() === needle),
      );
      if (!matched.length) {
        setLines([emptyLine()]);
        toast.message("No collation HCFs found for this HMO in the selected period.");
        return;
      }
      setLines(matched.map((l: any) => ({
        _key: uid(),
        hcf_name: l.facility_name ?? "",
        hcf_code: l.hcf_code ?? "",
        alleged_amount: amountText(l[field]),
        actual_amount: "",
        agreed_amount: "",
        amount_paid: "",
        remarks: "",
        from_collation: true,
      })));
    } catch (err: any) {
      setLines([emptyLine()]);
      toast.error("Failed to load HCFs from collation", { description: err.message });
    } finally {
      setLoadingHcfs(false);
    }
  }, [stateId, zoneId, periodYear, periodMonth, stream]);

  const applyRow = (row: any) => {
    setEditingId(row.id);
    setRefId(row.reference_id);
    setZoneId(String(row.zone_id));
    setStateId(String(row.state_id));
    setPeriodYear(String(row.reporting_year));
    setPeriodMonth(String(row.reporting_month));
    setHmoName(row.hmo_name ?? "");
    setHmoCode(row.hmo_code ?? "");
    setHmoId("");
    const mapped: Line[] = (row.lines ?? []).map((l: any) => ({
      _key: uid(),
      hcf_name: l.hcf_name ?? "",
      hcf_code: l.hcf_code ?? "",
      alleged_amount: amountText(l.alleged_amount),
      actual_amount: amountText(l.actual_amount),
      agreed_amount: amountText(l.agreed_amount),
      amount_paid: amountText(l.amount_paid),
      remarks: l.remarks ?? "",
      from_collation: true,
    }));
    setLines(mapped.length ? mapped : [emptyLine()]);
  };

  const switchViewPeriod = (nextYear: string, nextMonth: string) => {
    const needle = hmoName.trim().toLowerCase();
    const match = viewSiblingSheets.find((r) =>
      String(r.state_id) === stateId
      && String(r.reporting_year) === nextYear
      && String(r.reporting_month) === nextMonth
      && String(r.hmo_name || "").trim().toLowerCase() === needle,
    );
    if (match) {
      applyRow(match);
      return;
    }
    toast.message("No sheet for this HMO in the selected period.");
  };

  const openHmoView = async (sheet: any, hmoDisplayName?: string) => {
    applyRow(sheet);
    setMode("view");
    setLoadingViewSheets(true);
    try {
      const res = await stateOfficeHmoReconApi.list({
        stream,
        hmo: hmoDisplayName || sheet.hmo_name,
        zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
        state_id: String(sheet.state_id),
      });
      setViewSheets(res.data ?? []);
    } catch {
      setViewSheets([sheet]);
    } finally {
      setLoadingViewSheets(false);
    }
  };

  const openCreate = () => {
    if (!canCreate) return;
    setEditingId(null);
    setRefId(null);
    setZoneId(defaultZoneId ?? "");
    setStateId(defaultStateId ?? "");
    setPeriodYear(filterYear !== "all" ? filterYear : String(new Date().getFullYear()));
    setPeriodMonth(filterMonth !== "all" ? filterMonth : String(new Date().getMonth() + 1));
    setHmoId("");
    setHmoName("");
    setHmoCode("");
    setLines([emptyLine()]);
    setMode("create");
  };

  const leaveForm = () => {
    if (createOnly) { onBack(); return; }
    setMode("list");
  };

  const handleSave = async () => {
    if (!zoneId || !stateId) { toast.error("Zone and state are required."); return; }
    if (!hmoName.trim()) { toast.error("Select an HMO first."); return; }
    const valid = lines.filter((l) => l.hcf_name.trim());
    if (!valid.length) { toast.error("Add at least one HCF under this HMO."); return; }
    setSaving(true);
    try {
      const payload = {
        stream_type: stream,
        zone_id: Number(zoneId),
        state_id: Number(stateId),
        reporting_year: Number(periodYear),
        reporting_month: Number(periodMonth),
        hmo_name: hmoName.trim(),
        hmo_code: hmoCode.trim() || null,
        status: "submitted",
        lines: valid.map((l) => ({
          hcf_name: l.hcf_name,
          hcf_code: l.hcf_code,
          alleged_amount: money(l.alleged_amount),
          actual_amount: money(l.actual_amount),
          agreed_amount: money(l.agreed_amount),
          amount_paid: money(l.amount_paid),
          outstanding: outstandingOf(l),
          remarks: l.remarks || null,
        })),
      };
      if (mode === "edit" && editingId) {
        await stateOfficeHmoReconApi.update(editingId, payload);
        toast.success("Reconciliation sheet updated");
      } else {
        await stateOfficeHmoReconApi.create(payload);
        toast.success("Reconciliation sheet saved");
      }
      if (createOnly && mode === "create") {
        openCreate();
        setFormKey((k) => k + 1);
      } else setMode("list");
    } catch (e: any) {
      toast.error("Failed to save sheet", { description: e.message });
    } finally { setSaving(false); }
  };

  const headerCard = (
    <Card className="rounded-2xl border-[#d4e8dc]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#145c3f]">{meta.pageTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="space-y-2 md:col-span-2">
          <Label>HMO *</Label>
          <AccreditedProviderSelect
            type="hmo"
            value={hmoId}
            placeholder="Select HMO"
            onChange={(p) => {
              const nextName = p?.name ?? "";
              const nextCode = p?.code ?? "";
              setHmoId(p?.id ?? "");
              setHmoName(nextName);
              setHmoCode(nextCode);
              if (mode === "create" || mode === "edit") {
                if (nextName) void loadHcfsFromCollation(nextName);
                else setLines([emptyLine()]);
              }
            }}
          />
          {!hmoId && hmoName ? (
            <p className="text-sm text-slate-600 mt-1">{hmoLabel(hmoName, hmoCode)}</p>
          ) : null}
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

  const hcfTable = (
    <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base text-[#145c3f] inline-flex items-center gap-2">
            HCFs under {hmoName || "selected HMO"}
            {loadingHcfs ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : null}
          </CardTitle>
          <span className="text-sm font-bold text-[#145c3f]">Outstanding ₦{naira(sheetTotals.outstanding)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f0fdf7]">
              <TableHead className="text-xs font-bold min-w-[220px]">HCF</TableHead>
              <TableHead className="text-xs font-bold min-w-[120px]">HCF Code</TableHead>
              <TableHead className="text-xs font-bold min-w-[160px]">Alleged Amount</TableHead>
              <TableHead className="text-xs font-bold min-w-[160px]">{meta.actualLabel}</TableHead>
              <TableHead className="text-xs font-bold min-w-[160px]">Agreed Amount</TableHead>
              <TableHead className="text-xs font-bold min-w-[160px]">Paid (On-Site)</TableHead>
              <TableHead className="text-xs font-bold min-w-[140px]">Outstanding</TableHead>
              <TableHead className="text-xs font-bold min-w-[140px]">Remarks</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l._key}>
                <TableCell className="align-top py-2">
                  {l.from_collation ? (
                    <Input readOnly className="h-9 bg-slate-50 text-sm" value={l.hcf_name || "—"} title={l.hcf_name} />
                  ) : (
                    <HcfFacilitySelect
                      stateId={stateId || undefined}
                      value={l.facility_id}
                      fallbackLabel={l.hcf_name}
                      includeCodeInLabel={false}
                      placeholder="Select HCF"
                      onChange={(f) => setLines((prev) => prev.map((x) => x._key === l._key ? {
                        ...x,
                        facility_id: f?.id ?? "",
                        hcf_name: f?.name ?? "",
                        hcf_code: f?.code || f?.facility_code || x.hcf_code,
                      } : x))}
                    />
                  )}
                </TableCell>
                <TableCell className="align-top py-2">
                  <Input
                    readOnly={!!l.from_collation}
                    className={`h-9 font-mono text-xs ${l.from_collation ? "bg-slate-50" : ""}`}
                    value={l.hcf_code}
                    onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, hcf_code: e.target.value } : x))}
                  />
                </TableCell>
                <TableCell className="align-top py-2">
                  {l.from_collation ? (
                    <Input
                      readOnly
                      className="h-9 font-mono text-xs bg-slate-50"
                      value={l.alleged_amount === "" ? "" : `₦${naira(l.alleged_amount)}`}
                      title={l.alleged_amount === "" ? undefined : `₦${naira(l.alleged_amount)}`}
                    />
                  ) : (
                    <Input
                      className="h-9 font-mono text-xs"
                      inputMode="decimal"
                      value={l.alleged_amount}
                      onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, alleged_amount: e.target.value } : x))}
                    />
                  )}
                </TableCell>
                {(["actual_amount", "agreed_amount", "amount_paid"] as const).map((key) => (
                  <TableCell key={key} className="align-top py-2">
                    <Input
                      className="h-9 font-mono text-xs"
                      inputMode="decimal"
                      value={l[key]}
                      onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, [key]: e.target.value } : x))}
                    />
                  </TableCell>
                ))}
                <TableCell className="align-top py-2 text-sm font-mono font-bold text-[#145c3f] whitespace-nowrap">₦{naira(outstandingOf(l))}</TableCell>
                <TableCell className="align-top py-2">
                  <Input className="h-9 text-xs" value={l.remarks}
                    onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, remarks: e.target.value } : x))} />
                </TableCell>
                <TableCell className="align-top py-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => setLines((prev) => prev.length <= 1 ? [emptyLine()] : prev.filter((x) => x._key !== l._key))}>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-[#d4e8dc]">
          <Button type="button" variant="outline" className="gap-2" disabled={!hmoName}
            onClick={() => setLines((p) => [...p, emptyLine()])}>
            <Plus className="w-4 h-4" /> Add HCF
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === "view") {
    return (
      <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setViewSheets([]); setMode(createOnly ? "create" : "list"); }}
              className="rounded-full shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">{hmoLabel(hmoName, hmoCode)}</h2>
              <p className="text-xs text-slate-500 truncate">
                {pickGeoLabel(states, stateId, "—")}
                {loadingViewSheets ? " · loading…" : ""}
              </p>
            </div>
          </div>
          {canCreate && (
            <Button className="bg-orange-action hover:bg-orange-600 gap-2 shrink-0" onClick={() => setMode("edit")}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
            <Card className="rounded-xl border border-[#d4e8dc]">
              <CardContent className="pt-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <span><span className="text-slate-400">Alleged</span> ₦{naira(sheetTotals.alleged)}</span>
              <span><span className="text-slate-400">{meta.actualLabel}</span> ₦{naira(sheetTotals.actual)}</span>
              <span><span className="text-slate-400">Agreed</span> ₦{naira(sheetTotals.agreed)}</span>
              <span><span className="text-slate-400">Paid</span> ₦{naira(sheetTotals.paid)}</span>
              <span className="font-semibold text-[#145c3f]">Outstanding ₦{naira(sheetTotals.outstanding)}</span>
            </div>
            <Card className="rounded-xl border border-slate-200 overflow-hidden shadow-none">
              <CardHeader className="pb-3 border-b bg-slate-50">
                <CardTitle className="text-base text-slate-800">Healthcare Facilities</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium text-slate-500">#</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">HCF</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Code</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-right">Alleged</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-right">{meta.actualLabel}</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-right">Agreed</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-right">Paid</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-right">Outstanding</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l, i) => (
                      <TableRow key={l._key}>
                        <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                        <TableCell className="text-sm text-slate-700">{l.hcf_name || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">{l.hcf_code || "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.alleged_amount)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.actual_amount)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.agreed_amount)}</TableCell>
                        <TableCell className="text-sm font-mono text-right">₦{naira(l.amount_paid)}</TableCell>
                        <TableCell className="text-sm font-mono font-bold text-right text-[#145c3f]">₦{naira(outstandingOf(l))}</TableCell>
                        <TableCell className="text-xs text-slate-600">{l.remarks || "—"}</TableCell>
                      </TableRow>
                    ))}
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
        <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={mode === "edit" ? () => setMode("view") : leaveForm} className="rounded-full shrink-0"><ArrowLeft className="w-5 h-5" /></Button>
            <h2 className="text-xl font-bold tracking-tight truncate">{meta.pageTitle}</h2>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-28">
            {headerCard}
            {hcfTable}
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
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{meta.pageTitle}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button className="bg-orange-action hover:bg-orange-600 gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> New HMO Sheet
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
                  <SelectTrigger displayValue={filterState === "all" ? "All States" : pickGeoLabel(dashboardStates, filterState, "State")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!stateLocked && <SelectItem value="all">All States</SelectItem>}
                    {dashboardStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">HMO</Label>
                <Select value={selectedHmoFilter} onValueChange={setSelectedHmoFilter}>
                  <SelectTrigger displayValue={selectedHmoFilter === "all" ? "All HMOs" : selectedHmoFilter}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All HMOs</SelectItem>
                    {hmoOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {loading ? "Loading..." : `${hmoGroups.length} HMO${hmoGroups.length === 1 ? "" : "s"}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : hmoGroups.length === 0 ? (
                <div className="flex justify-center py-16 text-sm text-slate-400">No HMO sheets for this filter</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold">HMO</TableHead>
                      <TableHead className="text-xs font-bold">State</TableHead>
                      <TableHead className="text-xs font-bold">Period</TableHead>
                      <TableHead className="text-xs font-bold">HCFs</TableHead>
                      <TableHead className="text-xs font-bold">Outstanding</TableHead>
                      <TableHead className="text-xs font-bold w-16">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hmoGroups.map((g, i) => (
                      <motion.tr key={g.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-slate-100">
                        <TableCell className="text-sm font-semibold text-slate-800">{hmoLabel(g.name, g.code)}</TableCell>
                        <TableCell className="text-xs">{g.stateName}</TableCell>
                        <TableCell className="text-xs">
                          {g.periods.length === 1
                            ? g.periods[0]
                            : `${g.periods[0]} · ${g.periods.length} periods`}
                        </TableCell>
                        <TableCell className="text-xs">{g.hcfCount}</TableCell>
                        <TableCell className="text-xs font-mono font-semibold">₦{naira(g.outstanding)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-[#145c3f]" onClick={() => void openHmoView(g.latest, g.name)}>
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
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
