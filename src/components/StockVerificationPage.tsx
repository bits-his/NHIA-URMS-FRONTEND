import * as React from "react";
import {
  ArrowLeft, Plus, Trash2, Save, Send, Loader2,
  PackageSearch, RefreshCw, CheckCircle2, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stockApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DropdownOption { id: number; label: string; }

interface ItemRow {
  _key: string;           // local unique key for React
  asset_id: number | null;
  item_class: string;
  item_description: string;
  asset_tag: string;
  book_balance: string;
  physical_count: string;
  condition: "good" | "bad";
  remarks: string;
}

interface StockVerificationPageProps {
  onBack: () => void;
  onSubmitted?: () => void;
  verificationId?: number | null;
}

const labelOf = (options: DropdownOption[], value: string, fallback: string) =>
  value ? (options.find(o => String(o.id) === value)?.label ?? fallback) : fallback;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);

const emptyRow = (): ItemRow => ({
  _key: uid(), asset_id: null,
  item_class: "", item_description: "", asset_tag: "",
  book_balance: "", physical_count: "",
  condition: "good", remarks: "",
});

const variance = (row: ItemRow): number =>
  (parseInt(row.book_balance) || 0) - (parseInt(row.physical_count) || 0);

const STOCKTAKING_TYPES = [
  { value: "annual",   label: "Annual" },
  { value: "monthly",  label: "Monthly" },
  { value: "periodic", label: "Periodic" },
  { value: "surprise", label: "Surprise" },
];

const typeLabel = (value: string) =>
  value ? (STOCKTAKING_TYPES.find(t => t.value === value)?.label ?? value) : "Select Type";

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockVerificationPage({ onBack, onSubmitted, verificationId }: StockVerificationPageProps) {
  const hydratingRef = React.useRef(false);
  // ── Dropdown data ──────────────────────────────────────────────────────────
  const [zones,       setZones]       = React.useState<DropdownOption[]>([]);
  const [states,      setStates]      = React.useState<DropdownOption[]>([]);
  const [departments, setDepartments] = React.useState<DropdownOption[]>([]);
  const [units,       setUnits]       = React.useState<DropdownOption[]>([]);
  const [assets,      setAssets]      = React.useState<any[]>([]);

  // ── Form header ────────────────────────────────────────────────────────────
  const [zoneId,       setZoneId]       = React.useState("");
  const [stateId,      setStateId]      = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [unitId,       setUnitId]       = React.useState("");
  const [stockType,    setStockType]    = React.useState("");
  const [storeKeeper,  setStoreKeeper]  = React.useState("");
  const [auditOfficer, setAuditOfficer] = React.useState("");
  const [verDate,      setVerDate]      = React.useState("");

  // ── Table rows ─────────────────────────────────────────────────────────────
  const [items, setItems] = React.useState<ItemRow[]>([emptyRow()]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loadingAssets, setLoadingAssets] = React.useState(false);
  const [loadingRecord, setLoadingRecord] = React.useState(false);
  const [saving,        setSaving]        = React.useState(false);
  const [submitting,    setSubmitting]    = React.useState(false);
  const [savedId,       setSavedId]       = React.useState<number | null>(null);
  const [refId,         setRefId]         = React.useState<string | null>(null);

  // ── Load zones on mount ────────────────────────────────────────────────────
  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: any) => ({ id: z.id, label: z.description })))
    ).catch(() => {});
  }, []);

  // ── Cascade: zone → states ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (hydratingRef.current) return;
    setStateId(""); setStates([]);
    setDepartmentId(""); setDepartments([]);
    setUnitId(""); setUnits([]);
    if (!zoneId) return;
    stockApi.getStates(zoneId).then(r =>
      setStates(r.data.map((s: any) => ({ id: s.id, label: s.description })))
    ).catch(() => {});
  }, [zoneId]);

  // ── Cascade: state → departments ───────────────────────────────────────────
  React.useEffect(() => {
    if (hydratingRef.current) return;
    setDepartmentId(""); setDepartments([]);
    setUnitId(""); setUnits([]);
    if (!stateId) return;
    stockApi.getDepartments(stateId).then(r =>
      setDepartments(r.data.map((d: any) => ({ id: d.id, label: d.name })))
    ).catch(() => {});
    loadAssets(stateId, "");
  }, [stateId]);

  // ── Cascade: department → units ────────────────────────────────────────────
  React.useEffect(() => {
    if (hydratingRef.current) return;
    setUnitId(""); setUnits([]);
    if (!departmentId) return;
    stockApi.getUnits(departmentId).then(r =>
      setUnits(r.data.map((u: any) => ({ id: u.id, label: u.name })))
    ).catch(() => {});
  }, [departmentId]);

  // ── Cascade: unit → assets (new verifications only) ────────────────────────
  React.useEffect(() => {
    if (hydratingRef.current || savedId) return;
    if (!stateId) return;
    loadAssets(stateId, unitId);
  }, [unitId]);

  // ── Load existing verification when opened from My Verifications ─────────────
  React.useEffect(() => {
    if (!verificationId) {
      setSavedId(null);
      setRefId(null);
      setZoneId(""); setStateId(""); setDepartmentId(""); setUnitId("");
      setStockType(""); setStoreKeeper(""); setAuditOfficer(""); setVerDate("");
      setItems([emptyRow()]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingRecord(true);
      hydratingRef.current = true;
      try {
        const res = await stockApi.getVerification(verificationId);
        if (cancelled) return;
        const v = res.data;

        const zoneIdStr = String(v.zone_id);
        const stateIdStr = String(v.state_id);
        const deptIdStr = v.department_id ? String(v.department_id) : "";
        const unitIdStr = v.unit_id ? String(v.unit_id) : "";

        const statesRes = await stockApi.getStates(zoneIdStr);
        const stateOpts = statesRes.data.map((s: any) => ({ id: s.id, label: s.description }));
        setStates(stateOpts);

        let deptOpts: DropdownOption[] = [];
        if (stateIdStr) {
          const deptsRes = await stockApi.getDepartments(stateIdStr);
          deptOpts = deptsRes.data.map((d: any) => ({ id: d.id, label: d.name }));
          setDepartments(deptOpts);
        }

        let unitOpts: DropdownOption[] = [];
        if (deptIdStr) {
          const unitsRes = await stockApi.getUnits(deptIdStr);
          unitOpts = unitsRes.data.map((u: any) => ({ id: u.id, label: u.name }));
          setUnits(unitOpts);
        }

        setSavedId(v.id);
        setRefId(v.reference_id);
        setZoneId(zoneIdStr);
        setStateId(stateIdStr);
        setDepartmentId(deptIdStr);
        setUnitId(unitIdStr);
        setStockType(v.stocktaking_type || "");
        setStoreKeeper(v.store_keeper || "");
        setAuditOfficer(v.audit_officer || "");
        setVerDate(v.verification_date ? String(v.verification_date).slice(0, 10) : "");

        if (v.items?.length) {
          setItems(v.items.map((item: any) => ({
            _key: uid(),
            asset_id: item.asset_id ?? null,
            item_class: item.item_class || "",
            item_description: item.item_description || "",
            asset_tag: item.asset_tag || "",
            book_balance: String(item.book_balance ?? ""),
            physical_count: String(item.physical_count ?? ""),
            condition: (item.condition === "bad" ? "bad" : "good") as "good" | "bad",
            remarks: item.remarks || "",
          })));
        } else {
          setItems([emptyRow()]);
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load verification", { description: err.message });
      } finally {
        hydratingRef.current = false;
        if (!cancelled) setLoadingRecord(false);
      }
    })();

    return () => { cancelled = true; };
  }, [verificationId]);

  const loadAssets = async (sid: string, uid_: string) => {
    setLoadingAssets(true);
    try {
      const r = await stockApi.getAssets(sid, uid_ || undefined, "active");
      setAssets(r.data);
      if (r.data.length > 0 && !savedId) {
        setItems(r.data.map((a: any) => ({
          _key: uid(),
          asset_id: a.id,
          item_class: a.item_class,
          item_description: a.item_description,
          asset_tag: a.asset_tag || "",
          book_balance: String(a.book_balance),
          physical_count: "",
          condition: "good" as const,
          remarks: "",
        })));
      }
    } catch { /* silent */ } finally {
      setLoadingAssets(false);
    }
  };

  // ── Row helpers ────────────────────────────────────────────────────────────
  const updateRow = (key: string, field: keyof ItemRow, value: string) =>
    setItems(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));

  const addRow = () => setItems(prev => [...prev, emptyRow()]);

  const removeRow = (key: string) =>
    setItems(prev => prev.length > 1 ? prev.filter(r => r._key !== key) : prev);

  // ── Build payload ──────────────────────────────────────────────────────────
  const buildPayload = (status: "draft" | "submitted") => ({
    zone_id: zoneId, state_id: stateId,
    department_id: departmentId || null,
    unit_id: unitId || null,
    stocktaking_type: stockType,
    store_keeper: storeKeeper,
    audit_officer: auditOfficer,
    verification_date: verDate || null,
    submitted_by: storeKeeper || "System",
    status,
    items: items
      .filter(r => r.item_description.trim())
      .map(r => ({
        asset_id:         r.asset_id,
        item_class:       r.item_class,
        item_description: r.item_description,
        asset_tag:        r.asset_tag,
        book_balance:     parseInt(r.book_balance) || 0,
        physical_count:   parseInt(r.physical_count) || 0,
        condition:        r.condition,
        remarks:          r.remarks,
      })),
  });

  const validate = () => {
    if (!zoneId)    { toast.error("Please select a Zone");            return false; }
    if (!stateId)   { toast.error("Please select a State");           return false; }
    if (!stockType) { toast.error("Please select a Stocktaking Type");return false; }
    return true;
  };

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload("draft");
      let res;
      if (savedId) {
        res = await stockApi.updateVerification(savedId, payload);
      } else {
        res = await stockApi.createVerification(payload);
        setSavedId(res.data.id);
        setRefId(res.data.reference_id);
      }
      toast.success("Draft saved", { description: `Ref: ${res.data.reference_id}` });
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally { setSaving(false); }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = buildPayload("submitted");
      let res;
      if (savedId) {
        res = await stockApi.updateVerification(savedId, { ...payload, status: "submitted" });
      } else {
        res = await stockApi.createVerification(payload);
      }
      setRefId(res.data.reference_id);
      toast.success("Stock verification submitted", {
        description: `Reference: ${res.data.reference_id}`,
      });
      (onSubmitted ?? onBack)();
    } catch (err: any) {
      toast.error("Submission failed", { description: err.message });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={handleSubmit} disabled={submitting}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><Send className="w-4 h-4" /> Submit</>
            }
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          {loadingRecord ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading verification...</span>
            </div>
          ) : (
          <>

          {/* ── Header form ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Verification Details</CardTitle>
                <CardDescription>Select the scope and personnel for this stocktaking exercise.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Row 1: Zone / State / Department / Unit */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Zone <span className="text-red-500">*</span></Label>
                    <Select value={zoneId} onValueChange={setZoneId}>
                      <SelectTrigger className="w-full"
                        displayValue={labelOf(zones, zoneId, "Select Zone")}>
                        <SelectValue placeholder="Select Zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>State <span className="text-red-500">*</span></Label>
                    <Select value={stateId} onValueChange={setStateId} disabled={!zoneId}>
                      <SelectTrigger className="w-full"
                        displayValue={labelOf(states, stateId, "Select State")}>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId} disabled={!stateId}>
                      <SelectTrigger className="w-full"
                        displayValue={labelOf(departments, departmentId, "Select Department")}>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={unitId} onValueChange={setUnitId} disabled={!departmentId}>
                      <SelectTrigger className="w-full"
                        displayValue={labelOf(units, unitId, "Select Unit")}>
                        <SelectValue placeholder="Select Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Row 2: Type / Date / Store Keeper / Audit Officer */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Stocktaking Type <span className="text-red-500">*</span></Label>
                    <Select value={stockType} onValueChange={setStockType}>
                      <SelectTrigger className="w-full" displayValue={typeLabel(stockType)}>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {STOCKTAKING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Verification Date</Label>
                    <Input type="date" value={verDate} onChange={e => setVerDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State Store Keeper</Label>
                    <Input placeholder="Full name" value={storeKeeper} onChange={e => setStoreKeeper(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Audit Officer</Label>
                    <Input placeholder="Full name" value={auditOfficer} onChange={e => setAuditOfficer(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Asset table ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PackageSearch className="w-4 h-4 text-primary" />
                    Asset Verification Table
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {loadingAssets
                      ? "Loading assets from state register..."
                      : `${items.filter(r => r.item_description.trim()).length} item(s) — enter physical count for each`
                    }
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addRow} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> Add Row
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingAssets ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading state assets...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-slate-600 w-[140px]">Item Class</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 min-w-[200px]">Item Description</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 w-[130px]">Asset Tag / S/N</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-center w-[110px]">Book Balance</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-center w-[120px]">Physical Count</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-center w-[110px]">Variance (+/-)</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-center w-[100px]">Condition</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 w-[140px]">Remarks</TableHead>
                          <TableHead className="w-[40px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(row => {
                          const v = variance(row);
                          const hasCount = row.physical_count !== "";
                          return (
                            <TableRow key={row._key} className="hover:bg-[#f8fdfb]">
                              <TableCell className="py-2">
                                <Input
                                  value={row.item_class}
                                  onChange={e => updateRow(row._key, "item_class", e.target.value)}
                                  placeholder="e.g. Furniture"
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={row.item_description}
                                  onChange={e => updateRow(row._key, "item_description", e.target.value)}
                                  placeholder="Item description"
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={row.asset_tag}
                                  onChange={e => updateRow(row._key, "asset_tag", e.target.value)}
                                  placeholder="Tag / S/N"
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number" min="0"
                                  value={row.book_balance}
                                  onChange={e => updateRow(row._key, "book_balance", e.target.value)}
                                  placeholder="0"
                                  className="h-8 text-xs text-center"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number" min="0"
                                  value={row.physical_count}
                                  onChange={e => updateRow(row._key, "physical_count", e.target.value)}
                                  placeholder="0"
                                  className="h-8 text-xs text-center"
                                />
                              </TableCell>
                              <TableCell className="py-2 text-center">
                                {hasCount ? (
                                  <span className={`text-sm font-bold ${
                                    v === 0 ? "text-emerald-600" :
                                    v > 0  ? "text-amber-600" : "text-rose-600"
                                  }`}>
                                    {v > 0 ? `+${v}` : v}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                <Select
                                  value={row.condition}
                                  onValueChange={v => updateRow(row._key, "condition", v)}
                                >
                                  <SelectTrigger className="h-8 text-xs w-full"
                                    displayValue={row.condition === "bad" ? "Bad" : "Good"}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="good">
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Good
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="bad">
                                      <span className="flex items-center gap-1.5">
                                        <AlertCircle className="w-3 h-3 text-rose-500" /> Bad
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  value={row.remarks}
                                  onChange={e => updateRow(row._key, "remarks", e.target.value)}
                                  placeholder="Optional"
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                  onClick={() => removeRow(row._key)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Summary footer */}
                {!loadingAssets && items.some(r => r.physical_count !== "") && (
                  <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500 bg-slate-50/50">
                    <span>
                      Total Book Balance: <strong className="text-slate-700">
                        {items.reduce((s, r) => s + (parseInt(r.book_balance) || 0), 0).toLocaleString()}
                      </strong>
                    </span>
                    <span>
                      Total Physical Count: <strong className="text-slate-700">
                        {items.reduce((s, r) => s + (parseInt(r.physical_count) || 0), 0).toLocaleString()}
                      </strong>
                    </span>
                    <span>
                      Net Variance: <strong className={
                        items.reduce((s, r) => s + variance(r), 0) === 0 ? "text-emerald-600" :
                        items.reduce((s, r) => s + variance(r), 0) > 0  ? "text-amber-600" : "text-rose-600"
                      }>
                        {items.reduce((s, r) => s + variance(r), 0) > 0
                          ? `+${items.reduce((s, r) => s + variance(r), 0).toLocaleString()}`
                          : items.reduce((s, r) => s + variance(r), 0).toLocaleString()
                        }
                      </strong>
                    </span>
                    <span>
                      Bad Condition: <strong className="text-rose-600">
                        {items.filter(r => r.condition === "bad").length}
                      </strong>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Bottom actions */}
          <div className="flex justify-between pb-8">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                onClick={handleSubmit} disabled={submitting}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit Verification</>
                }
              </Button>
            </div>
          </div>

          </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
