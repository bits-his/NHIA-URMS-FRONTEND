import * as React from "react";
import {
  ArrowLeft, Eye, Pencil, RefreshCw, Loader2, Save, Building2, Search,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { toast } from "sonner";
import { stateOfficeHmoIndebtednessApi, stateOfficeHmoReconApi, stockApi } from "@/lib/api";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel } from "./constants";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { HMO_RECON_STREAM_META, type HmoReconStream } from "./hmoIndebtednessTypes";

interface Props {
  stream: HmoReconStream;
  onBack: () => void;
  defaultStateId?: string | null;
  defaultZoneId?: string | null;
  /** When true, hide page chrome (hub provides header/tabs). */
  embedded?: boolean;
}

type Geo = { id: number; description: string };
type Mode = "list" | "create" | "edit" | "view";
type Line = {
  _key: string;
  hcf_name: string;
  hcf_code: string;
  alleged_amount: string;
  actual_amount: string;
  agreed_amount: string;
  amount_paid: string;
  remarks: string;
  from_collation?: boolean;
};
type CollationHmo = {
  key: string;
  name: string;
  code: string;
  hcfCount: number;
  allegedTotal: number;
};
type ListHmo = CollationHmo & {
  stateId: string;
  stateName: string;
  zoneId: string;
  reconSheet: any | null;
  actualTotal: number;
  agreedTotal: number;
  paidTotal: number;
  outstanding: number;
  reconciled: boolean;
};

const uid = () => Math.random().toString(36).slice(2);

function lineMatchKey(hcfCode: string, hcfName: string) {
  const code = String(hcfCode || "").trim().toLowerCase();
  if (code) return `code:${code}`;
  return `name:${String(hcfName || "").trim().toLowerCase()}`;
}

function allegedColumnLabel(stream: HmoReconStream) {
  if (stream === "ffs") return "Alleged FFS";
  if (stream === "cap") return "Alleged Capitation";
  return "Alleged PHI";
}

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
  stream, onBack, defaultStateId, defaultZoneId, embedded = false,
}: Props) {
  const meta = HMO_RECON_STREAM_META[stream];
  const { canCreate, createOnly } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<Mode>("list");
  const [formKey, setFormKey] = React.useState(0);
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
  const [hmoName, setHmoName] = React.useState("");
  const [hmoCode, setHmoCode] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([]);
  const [loadingHcfs, setLoadingHcfs] = React.useState(false);
  const [collationHmos, setCollationHmos] = React.useState<CollationHmo[]>([]);
  const [loadingCollationHmos, setLoadingCollationHmos] = React.useState(false);
  const [listHmos, setListHmos] = React.useState<ListHmo[]>([]);
  const [hmoSearch, setHmoSearch] = React.useState("");
  const [viewSheets, setViewSheets] = React.useState<any[]>([]);
  const [loadingViewSheets, setLoadingViewSheets] = React.useState(false);
  const [hmoLocked, setHmoLocked] = React.useState(false);
  const linesRef = React.useRef<Line[]>([]);
  linesRef.current = lines;
  const allegedLabel = allegedColumnLabel(stream);

  const { filterState, setFilterState, apiStateId } = useMonthlyStateFilter(defaultStateId, defaultZoneId);
  const now = new Date();
  const [filterYear, setFilterYear] = React.useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(now.getMonth() + 1));
  const [filterZone, setFilterZone] = React.useState(defaultZoneId ?? "all");
  const [dashboardStates, setDashboardStates] = React.useState<Geo[]>([]);
  const zoneLocked = !!defaultZoneId;
  const stateLocked = !!defaultStateId;

  const listScope = React.useMemo(() => ({
    zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
    state_id: apiStateId || defaultStateId || undefined,
    year: filterYear,
    month: filterMonth,
  }), [filterZone, defaultZoneId, apiStateId, defaultStateId, filterYear, filterMonth]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [collationRes, reconRes] = await Promise.all([
        stateOfficeHmoIndebtednessApi.list({
          state_id: listScope.state_id,
          zone_id: listScope.zone_id,
          year: listScope.year,
          month: listScope.month,
        }),
        stateOfficeHmoReconApi.list({
          stream,
          zone_id: listScope.zone_id,
          state_id: listScope.state_id,
          year: listScope.year,
          month: listScope.month,
        }),
      ]);
      setRows(reconRes.data ?? []);

      const field = allegedFieldForStream(stream);
      const reconByKey = new Map<string, any>();
      for (const sheet of reconRes.data ?? []) {
        const name = String(sheet.hmo_name || "").trim().toLowerCase();
        const sid = String(sheet.state_code ?? sheet.state_id ?? "");
        if (!name || !sid) continue;
        reconByKey.set(`${name}::${sid}`, sheet);
      }

      const map = new Map<string, ListHmo>();
      for (const sheet of collationRes.data ?? []) {
        const sid = String(sheet.state_code ?? sheet.state_id ?? "");
        const zid = String(sheet.zonal_code ?? sheet.zone_id ?? "");
        const stateName = sheet.state?.description ?? "—";
        for (const line of sheet.lines ?? []) {
          const name = String(line.hmo_name || "").trim();
          if (!name || !sid) continue;
          const key = `${name.toLowerCase()}::${sid}`;
          const alleged = money(line[field]);
          const existing = map.get(key);
          if (!existing) {
            const reconSheet = reconByKey.get(key) ?? null;
            const reconLines = reconSheet?.lines ?? [];
            const actualTotal = reconLines.reduce((s: number, l: any) => s + money(l.actual_amount), 0);
            const agreedTotal = reconLines.reduce((s: number, l: any) => s + money(l.agreed_amount), 0);
            const paidTotal = reconLines.reduce((s: number, l: any) => s + money(l.amount_paid), 0);
            const outstanding = reconLines.reduce(
              (s: number, l: any) => s + money(l.outstanding ?? (Number(l.agreed_amount) - Number(l.amount_paid))),
              0,
            );
            map.set(key, {
              key,
              name,
              code: String(line.hmo_code || "").trim(),
              hcfCount: 1,
              allegedTotal: alleged,
              stateId: sid,
              stateName,
              zoneId: zid,
              reconSheet,
              actualTotal,
              agreedTotal,
              paidTotal,
              outstanding,
              reconciled: !!reconSheet,
            });
          } else {
            existing.hcfCount += 1;
            existing.allegedTotal += alleged;
            if (!existing.code && line.hmo_code) existing.code = String(line.hmo_code).trim();
          }
        }
      }
      setListHmos(Array.from(map.values()).sort((a, b) =>
        a.stateName.localeCompare(b.stateName) || a.name.localeCompare(b.name),
      ));
    } catch (err: any) {
      toast.error("Failed to load HMOs from collation", { description: err.message });
      setRows([]);
      setListHmos([]);
    } finally { setLoading(false); }
  }, [listScope, stream]);

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
    if (!zoneId) { setStates([]); return; }
    stockApi.getStates(zoneId).then((r) => setStates(r.data)).catch(() => setStates([]));
  }, [zoneId]);

  const filteredListHmos = React.useMemo(() => {
    const q = hmoSearch.trim().toLowerCase();
    if (!q) return listHmos;
    return listHmos.filter((h) =>
      h.name.toLowerCase().includes(q)
      || h.code.toLowerCase().includes(q)
      || h.stateName.toLowerCase().includes(q),
    );
  }, [listHmos, hmoSearch]);

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

  const loadCollationHmos = React.useCallback(async () => {
    if (!stateId || !periodYear || !periodMonth) {
      setCollationHmos([]);
      return;
    }
    setLoadingCollationHmos(true);
    try {
      const res = await stateOfficeHmoIndebtednessApi.list({
        state_id: stateId,
        zone_id: zoneId || undefined,
        year: periodYear,
        month: periodMonth,
      });
      const field = allegedFieldForStream(stream);
      const map = new Map<string, CollationHmo>();
      for (const sheet of res.data ?? []) {
        for (const line of sheet.lines ?? []) {
          const name = String(line.hmo_name || "").trim();
          if (!name) continue;
          const key = name.toLowerCase();
          const alleged = money(line[field]);
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              key,
              name,
              code: String(line.hmo_code || "").trim(),
              hcfCount: 1,
              allegedTotal: alleged,
            });
          } else {
            existing.hcfCount += 1;
            existing.allegedTotal += alleged;
            if (!existing.code && line.hmo_code) existing.code = String(line.hmo_code).trim();
          }
        }
      }
      setCollationHmos(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      setCollationHmos([]);
      toast.error("Failed to load HMOs from collation", { description: err.message });
    } finally {
      setLoadingCollationHmos(false);
    }
  }, [stateId, zoneId, periodYear, periodMonth, stream]);

  const loadHcfsFromCollation = React.useCallback(async (
    selectedHmoName: string,
    opts?: { preserve?: boolean; silentEmpty?: boolean },
  ) => {
    const name = selectedHmoName.trim();
    if (!name || !stateId || !periodYear || !periodMonth) {
      setLines([]);
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
      const deduped = new Map<string, any>();
      for (const sheet of res.data ?? []) {
        for (const line of sheet.lines ?? []) {
          if (String(line.hmo_name || "").trim().toLowerCase() !== needle) continue;
          const key = lineMatchKey(line.hcf_code ?? "", line.facility_name ?? "");
          if (!key || key.endsWith(":")) continue;
          if (!deduped.has(key)) deduped.set(key, line);
        }
      }
      const matched = Array.from(deduped.values());
      if (!matched.length) {
        setLines([]);
        if (!opts?.silentEmpty) {
          toast.message("No collation HCFs found for this HMO in the selected period.");
        }
        return;
      }

      const previous = opts?.preserve ? linesRef.current : [];
      const prevByKey = new Map<string, Line>();
      for (const prev of previous) {
        prevByKey.set(lineMatchKey(prev.hcf_code, prev.hcf_name), prev);
      }

      setLines(matched.map((l: any) => {
        const key = lineMatchKey(l.hcf_code ?? "", l.facility_name ?? "");
        const prev = prevByKey.get(key);
        return {
          _key: prev?._key ?? uid(),
          hcf_name: l.facility_name ?? "",
          hcf_code: l.hcf_code ?? "",
          alleged_amount: amountText(l[field]),
          actual_amount: prev?.actual_amount ?? "",
          agreed_amount: prev?.agreed_amount ?? "",
          amount_paid: prev?.amount_paid ?? "",
          remarks: prev?.remarks ?? "",
          from_collation: true,
        };
      }));
    } catch (err: any) {
      setLines([]);
      toast.error("Failed to load HCFs from collation", { description: err.message });
    } finally {
      setLoadingHcfs(false);
    }
  }, [stateId, zoneId, periodYear, periodMonth, stream]);

  React.useEffect(() => {
    if (mode === "create" || mode === "edit") {
      void loadCollationHmos();
    }
  }, [mode, loadCollationHmos]);

  React.useEffect(() => {
    if ((mode !== "create" && mode !== "edit") || !hmoName.trim()) return;
    void loadHcfsFromCollation(hmoName, { preserve: true, silentEmpty: true });
    // Reload HCFs when period / state / stream scope changes while an HMO is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateId, zoneId, periodYear, periodMonth, stream]);

  const applyRow = (row: any) => {
    setEditingId(row.reference_id || row.id);
    setRefId(row.reference_id);
    setZoneId(String(row.zonal_code ?? row.zone_id ?? ""));
    setStateId(String(row.state_code ?? row.state_id ?? ""));
    setPeriodYear(String(row.reporting_year));
    setPeriodMonth(String(row.reporting_month));
    setHmoName(row.hmo_name ?? "");
    setHmoCode(row.hmo_code ?? "");
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
    setLines(mapped);
  };

  const selectCollationHmo = (hmoKey: string) => {
    if (!hmoKey) {
      setHmoName("");
      setHmoCode("");
      setLines([]);
      return;
    }
    const found = collationHmos.find((h) => h.key === hmoKey);
    const nextName = found?.name ?? hmoKey;
    const nextCode = found?.code ?? "";
    setHmoName(nextName);
    setHmoCode(nextCode);
    void loadHcfsFromCollation(nextName, { preserve: false });
  };

  const collationHmoOptions: SearchSelectOption[] = React.useMemo(
    () => collationHmos.map((h) => ({
      value: h.key,
      label: hmoLabel(h.name, h.code),
      sub: `${h.hcfCount} HCF${h.hcfCount === 1 ? "" : "s"} · Alleged ₦${naira(h.allegedTotal)}`,
    })),
    [collationHmos],
  );

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
    setHmoLocked(true);
    setMode("view");
    setLoadingViewSheets(true);
    try {
      const res = await stateOfficeHmoReconApi.list({
        stream,
        hmo: hmoDisplayName || sheet.hmo_name,
        zone_id: (filterZone && filterZone !== "all") ? filterZone : (defaultZoneId || undefined),
        state_id: String(sheet.state_code ?? sheet.state_id ?? ""),
      });
      setViewSheets(res.data ?? []);
    } catch {
      setViewSheets([sheet]);
    } finally {
      setLoadingViewSheets(false);
    }
  };

  const openHmoForRecon = (item: ListHmo) => {
    if (!canCreate && !item.reconSheet) return;
    setZoneId(item.zoneId || defaultZoneId || "");
    setStateId(item.stateId);
    setPeriodYear(filterYear);
    setPeriodMonth(filterMonth);
    setHmoName(item.name);
    setHmoCode(item.code);
    setHmoLocked(true);
    setFormKey((k) => k + 1);

    if (item.reconSheet) {
      applyRow(item.reconSheet);
      if (canCreate) {
        setMode("edit");
        void loadHcfsFromCollation(item.name, { preserve: true, silentEmpty: true });
      } else {
        void openHmoView(item.reconSheet, item.name);
      }
      return;
    }

    if (!canCreate) return;
    setEditingId(null);
    setRefId(null);
    setLines([]);
    setMode("create");
    void loadHcfsFromCollation(item.name, { preserve: false });
  };

  const leaveForm = () => {
    setHmoLocked(false);
    setMode("list");
  };

  const handleSave = async () => {
    if (!zoneId || !stateId) { toast.error("Zone and state are required."); return; }
    if (!hmoName.trim()) { toast.error("Select an HMO first."); return; }
    const valid = lines.filter((l) => l.hcf_name.trim());
    if (!valid.length) { toast.error("Select an HMO that has HCFs in the Collation Sheet."); return; }
    setSaving(true);
    try {
      const payload = {
        stream_type: stream,
        zone_id: zoneId,
        state_id: stateId,
        zonal_code: zoneId,
        state_code: stateId,
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
      setHmoLocked(false);
      setMode("list");
    } catch (e: any) {
      toast.error("Failed to save sheet", { description: e.message });
    } finally { setSaving(false); }
  };

  const infoField = (label: string, value: string) => (
    <div className="space-y-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate" title={value}>{value || "—"}</p>
    </div>
  );

  const totalsCard = (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[
        { label: allegedLabel, value: sheetTotals.alleged },
        { label: meta.actualLabel, value: sheetTotals.actual },
        { label: "Agreed Amount", value: sheetTotals.agreed },
        { label: "Paid (On-Site)", value: sheetTotals.paid },
        { label: "Outstanding", value: sheetTotals.outstanding, emphasize: true },
      ].map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border px-3 py-2.5 ${
            item.emphasize ? "border-[#145c3f]/40 bg-[#e8f6ee]" : "border-[#d4e8dc] bg-white"
          }`}
        >
          <p className="text-[11px] text-slate-500 truncate">{item.label}</p>
          <p className={`text-sm font-mono font-bold mt-0.5 ${item.emphasize ? "text-[#145c3f]" : "text-slate-800"}`}>
            ₦{naira(item.value)}
          </p>
        </div>
      ))}
    </div>
  );

  const headerCard = (
    <Card className="rounded-2xl border-[#d4e8dc]">
      <CardContent className="pt-4 pb-4">
        {hmoLocked ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {infoField("Zone", pickGeoLabel(zones, zoneId, "—"))}
            {infoField("State", pickGeoLabel(states, stateId, "—"))}
            {infoField("Period", `${monthLabel(periodMonth)} ${periodYear}`)}
            {infoField("HMO", hmoLabel(hmoName, hmoCode))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Zone *</Label>
              <Select value={zoneId} disabled={zoneLocked} onValueChange={(v) => { setZoneId(v); if (!stateLocked) setStateId(""); setHmoName(""); setHmoCode(""); setLines([]); }}>
                <SelectTrigger displayValue={pickGeoLabel(zones, zoneId, "Zone")}><SelectValue /></SelectTrigger>
                <SelectContent>{zones.map((z) => { const id = String(z.zonal_code ?? z.id ?? ""); return <SelectItem key={id} value={id}>{z.description}</SelectItem>; })}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={stateId} disabled={stateLocked || !zoneId} onValueChange={(v) => { setStateId(v); setHmoName(""); setHmoCode(""); setLines([]); }}>
                <SelectTrigger displayValue={pickGeoLabel(states, stateId, zoneId ? "State" : "Select zone first")}><SelectValue /></SelectTrigger>
                <SelectContent>{states.map((s) => { const id = String(s.code ?? s.id ?? ""); return <SelectItem key={id} value={id}>{s.description}</SelectItem>; })}</SelectContent>
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
              <Label className="inline-flex items-center gap-2">
                HMO *
                {loadingCollationHmos ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> : null}
              </Label>
              <SearchSelect
                options={collationHmoOptions}
                value={hmoName.trim().toLowerCase() || undefined}
                displayLabel={hmoName ? hmoLabel(hmoName, hmoCode) : undefined}
                placeholder={!stateId ? "Select state and period first" : (collationHmos.length ? "Search HMO…" : "No HMOs in collation for this period")}
                searchPlaceholder="Type HMO name or code…"
                disabled={!stateId || !periodYear || !periodMonth || loadingCollationHmos}
                clearable
                onChange={selectCollationHmo}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const hcfTable = (
    <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
      <CardHeader className="pb-2 space-y-3">
        <CardTitle className="text-base text-[#145c3f] inline-flex items-center gap-2">
          HCFs under {hmoName || "selected HMO"}
          {loadingHcfs ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : null}
        </CardTitle>
        {hmoName ? totalsCard : null}
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {!hmoName ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">
            Select an HMO from the list to load its HCFs from the Collation Sheet.
          </div>
        ) : loadingHcfs ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : lines.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400">
            No HCFs found for this HMO in the Collation Sheet for the selected period.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f0fdf7]">
                <TableHead className="text-xs font-bold min-w-[220px]">HCF</TableHead>
                <TableHead className="text-xs font-bold min-w-[120px]">HCF Code</TableHead>
                <TableHead className="text-xs font-bold min-w-[140px] text-right">{allegedLabel}</TableHead>
                <TableHead className="text-xs font-bold min-w-[160px]">{meta.actualLabel}</TableHead>
                <TableHead className="text-xs font-bold min-w-[160px]">Agreed Amount</TableHead>
                <TableHead className="text-xs font-bold min-w-[160px]">Paid (On-Site)</TableHead>
                <TableHead className="text-xs font-bold min-w-[140px] text-right">Outstanding</TableHead>
                <TableHead className="text-xs font-bold min-w-[140px]">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l._key}>
                  <TableCell className="align-middle py-2.5 text-sm text-slate-800">{l.hcf_name || "—"}</TableCell>
                  <TableCell className="align-middle py-2.5 text-xs font-mono text-slate-600">{l.hcf_code || "—"}</TableCell>
                  <TableCell className="align-middle py-2.5 text-sm font-mono text-right text-slate-700 whitespace-nowrap">
                    {l.alleged_amount === "" ? "—" : `₦${naira(l.alleged_amount)}`}
                  </TableCell>
                  {(["actual_amount", "agreed_amount", "amount_paid"] as const).map((key) => (
                    <TableCell key={key} className="align-middle py-2">
                      <Input
                        className="h-9 font-mono text-xs"
                        inputMode="decimal"
                        value={l[key]}
                        onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, [key]: e.target.value } : x))}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="align-middle py-2.5 text-sm font-mono font-bold text-right text-[#145c3f] whitespace-nowrap">
                    ₦{naira(outstandingOf(l))}
                  </TableCell>
                  <TableCell className="align-middle py-2">
                    <Input className="h-9 text-xs" value={l.remarks}
                      onChange={(e) => setLines((prev) => prev.map((x) => x._key === l._key ? { ...x, remarks: e.target.value } : x))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
              onClick={() => { setViewSheets([]); setHmoLocked(false); setMode("list"); }}
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
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shrink-0"
              onClick={() => {
                setMode("edit");
                if (hmoName.trim()) {
                  void loadHcfsFromCollation(hmoName, { preserve: true, silentEmpty: true });
                }
              }}
            >
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-16">
            <Card className="rounded-xl border border-[#d4e8dc]">
              <CardContent className="pt-4 pb-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {infoField("Zone", pickGeoLabel(zones, zoneId, "—"))}
                  {infoField("State", pickGeoLabel(states, stateId, "—"))}
                  {infoField("Period", `${monthLabel(periodMonth)} ${periodYear}`)}
                  {infoField("HMO", hmoLabel(hmoName, hmoCode))}
                </div>
                {viewPeriodOptions.length > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Switch year</Label>
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
                      <Label className="text-xs text-muted-foreground">Switch month</Label>
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
                  </div>
                ) : null}
                {totalsCard}
              </CardContent>
            </Card>
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
                      <TableHead className="text-xs font-medium text-slate-500 text-right">{allegedLabel}</TableHead>
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
      <div className={`bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between ${embedded ? "" : "sticky top-0 z-30"}`}>
        {!embedded ? (
          <div>
            <h2 className="text-xl font-bold tracking-tight">{meta.pageTitle}</h2>
          </div>
        ) : (
          <div className="text-sm font-semibold text-[#145c3f]">{meta.pageTitle}</div>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {buildReportingYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search HMO</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Search by HMO name or code…"
                    value={hmoSearch}
                    onChange={(e) => setHmoSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {loading
                  ? "Loading HMOs from collation…"
                  : `${filteredListHmos.length} HMO${filteredListHmos.length === 1 ? "" : "s"} from Collation`}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Click an HMO to load its HCFs and key in {meta.actualLabel.toLowerCase()}, agreed, paid, and remarks.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : filteredListHmos.length === 0 ? (
                <div className="flex justify-center py-16 text-sm text-slate-400 px-4 text-center">
                  {listHmos.length === 0
                    ? "No HMOs found in the Collation Sheet for this period. Capture collation first."
                    : "No HMOs match your search."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold">HMO</TableHead>
                      <TableHead className="text-xs font-bold">State</TableHead>
                      <TableHead className="text-xs font-bold">HCFs</TableHead>
                      <TableHead className="text-xs font-bold text-right">{allegedLabel}</TableHead>
                      <TableHead className="text-xs font-bold text-right">{meta.actualLabel}</TableHead>
                      <TableHead className="text-xs font-bold text-right">Agreed</TableHead>
                      <TableHead className="text-xs font-bold text-right">Paid</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold w-28">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListHmos.map((g, i) => (
                      <motion.tr
                        key={g.key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-slate-100 cursor-pointer hover:bg-[#f0fdf7]/60"
                        onClick={() => openHmoForRecon(g)}
                      >
                        <TableCell className="text-sm font-semibold text-slate-800">{hmoLabel(g.name, g.code)}</TableCell>
                        <TableCell className="text-xs">{g.stateName}</TableCell>
                        <TableCell className="text-xs">{g.hcfCount}</TableCell>
                        <TableCell className="text-xs font-mono text-right">₦{naira(g.allegedTotal)}</TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          {g.reconciled ? `₦${naira(g.actualTotal)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          {g.reconciled ? `₦${naira(g.agreedTotal)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right">
                          {g.reconciled ? `₦${naira(g.paidTotal)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            g.reconciled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {g.reconciled ? "Reconciled" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 px-2 text-[#145c3f]"
                            onClick={(e) => { e.stopPropagation(); openHmoForRecon(g); }}
                          >
                            {g.reconciled ? (canCreate ? <><Pencil className="w-4 h-4" /> Edit</> : <><Eye className="w-4 h-4" /> View</>) : (canCreate ? "Key in" : "View")}
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
