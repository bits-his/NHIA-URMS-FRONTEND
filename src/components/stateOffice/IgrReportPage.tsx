import * as React from "react";
import {
  ArrowLeft, Plus, Trash2, Save, Send, Loader2,
} from "lucide-react";
import { motion } from "motion/react";
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
import { stockApi, stateOfficeApi } from "@/lib/api";
import {
  REPORT_CONFIG, MONTHS, IGR_SERVICE_TYPES,
  monthLabel, quarterFromMonth, labelOf, formatAmount, formatDate,
} from "./constants";

interface DropdownOption { id: number; label: string; }

interface IgrLine {
  _key: string;
  entry_date: string;
  service_type: string;
  principal_name: string;
  receipt_no: string;
  bill_rrr_no: string;
  nin_charge: number;
  amount: number;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const uid = () => Math.random().toString(36).slice(2);
const cfg = REPORT_CONFIG.igr;
const api = stateOfficeApi.igr;

export default function IgrReportPage({
  reportId, onBack, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const hydratingRef = React.useRef(false);
  const lockZone  = !!defaultZoneId;
  const lockState = !!defaultStateId;

  const [zones,  setZones]  = React.useState<DropdownOption[]>([]);
  const [states, setStates] = React.useState<DropdownOption[]>([]);

  const [zoneId,      setZoneId]      = React.useState(defaultZoneId ?? "");
  const [stateId,     setStateId]     = React.useState(defaultStateId ?? "");
  const [reportYear,  setReportYear]  = React.useState(String(new Date().getFullYear()));
  const [reportMonth, setReportMonth] = React.useState(String(new Date().getMonth() + 1));
  const [submitDate,  setSubmitDate]  = React.useState(new Date().toISOString().slice(0, 10));

  const [lines, setLines] = React.useState<IgrLine[]>([]);

  const [entryDate,          setEntryDate]          = React.useState(new Date().toISOString().slice(0, 10));
  const [entryServiceType,   setEntryServiceType]   = React.useState("");
  const [entryPrincipal,     setEntryPrincipal]     = React.useState("");
  const [entryReceiptNo,     setEntryReceiptNo]     = React.useState("");
  const [entryBillRrr,       setEntryBillRrr]       = React.useState("");
  const [entryNinCharge,     setEntryNinCharge]     = React.useState("");
  const [entryAmount,        setEntryAmount]        = React.useState("");

  const [loadingRecord, setLoadingRecord] = React.useState(false);
  const [saving,        setSaving]        = React.useState(false);
  const [submitting,    setSubmitting]    = React.useState(false);
  const [savedId,       setSavedId]       = React.useState<number | null>(null);
  const [refId,         setRefId]         = React.useState<string | null>(null);

  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: { id: number; description: string }) => ({ id: z.id, label: z.description })))
    ).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (hydratingRef.current) return;
    if (!lockState) setStateId("");
    setStates([]);
    if (!zoneId) return;
    stockApi.getStates(zoneId).then(r => {
      const stateOpts = r.data.map((s: { id: number; description: string }) => ({ id: s.id, label: s.description }));
      setStates(stateOpts);
      if (lockState && defaultStateId) {
        setStateId(defaultStateId);
      } else if (defaultStateId && r.data.some((s: { id: number }) => String(s.id) === defaultStateId)) {
        setStateId(defaultStateId);
      }
    }).catch(() => {});
  }, [zoneId, lockState, defaultStateId]);

  React.useEffect(() => {
    if (defaultZoneId) setZoneId(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    if (defaultStateId) setStateId(defaultStateId);
  }, [defaultStateId]);

  React.useEffect(() => {
    if (!reportId) {
      setSavedId(null); setRefId(null);
      setZoneId(defaultZoneId ?? "");
      setStateId(defaultStateId ?? "");
      setReportYear(String(new Date().getFullYear()));
      setReportMonth(String(new Date().getMonth() + 1));
      setSubmitDate(new Date().toISOString().slice(0, 10));
      setLines([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingRecord(true);
      hydratingRef.current = true;
      try {
        const res = await api.get(reportId);
        if (cancelled) return;
        const v = res.data;

        const zoneIdStr = String(v.zone_id);
        const stateIdStr = String(v.state_id);

        const statesRes = await stockApi.getStates(zoneIdStr);
        setStates(statesRes.data.map((s: { id: number; description: string }) => ({ id: s.id, label: s.description })));

        setSavedId(v.id);
        setRefId(v.reference_id);
        setZoneId(zoneIdStr);
        setStateId(stateIdStr);
        setReportYear(String(v.reporting_year));
        setReportMonth(String(v.reporting_month));
        setSubmitDate(v.submission_date ? String(v.submission_date).slice(0, 10) : "");

        setLines((v.lines ?? []).map((line: Record<string, unknown>) => ({
          _key: uid(),
          entry_date: line.entry_date ? String(line.entry_date).slice(0, 10) : "",
          service_type: String(line.service_type ?? ""),
          principal_name: String(line.principal_name ?? ""),
          receipt_no: String(line.receipt_no ?? ""),
          bill_rrr_no: String(line.bill_rrr_no ?? ""),
          nin_charge: Number(line.nin_charge) || 0,
          amount: Number(line.amount) || 0,
        })));
      } catch (err: unknown) {
        if (!cancelled) toast.error("Failed to load report", { description: (err as Error).message });
      } finally {
        hydratingRef.current = false;
        if (!cancelled) setLoadingRecord(false);
      }
    })();

    return () => { cancelled = true; };
  }, [reportId, defaultZoneId, defaultStateId]);

  const zoneLabel  = labelOf(zones.map(z => ({ value: String(z.id), label: z.label })), zoneId, "—");
  const stateLabel = labelOf(states.map(s => ({ value: String(s.id), label: s.label })), stateId, "—");
  const quarter    = quarterFromMonth(reportMonth);

  const totalAmount = React.useMemo(
    () => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [lines],
  );

  const summaryByService = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      map.set(line.service_type, (map.get(line.service_type) ?? 0) + (Number(line.amount) || 0));
    }
    return IGR_SERVICE_TYPES
      .filter(o => map.has(o.value))
      .map(o => ({ label: o.label, amount: map.get(o.value)! }));
  }, [lines]);

  const addLine = () => {
    if (!entryDate) { toast.error("Select entry date"); return; }
    if (!entryServiceType) { toast.error("Select service type"); return; }
    if (!entryPrincipal.trim()) { toast.error("Enter name of principal"); return; }
    if (!entryReceiptNo.trim()) { toast.error("Enter receipt number"); return; }
    if (!entryBillRrr.trim()) { toast.error("Enter bill / RRR number"); return; }
    if (!entryAmount || Number(entryAmount) < 0) { toast.error("Enter a valid amount"); return; }

    const dup = lines.some(l => l.receipt_no.toLowerCase() === entryReceiptNo.trim().toLowerCase());
    if (dup) {
      toast.warning("Duplicate receipt number in table", {
        description: "This receipt is already listed.",
      });
    }

    setLines(prev => [...prev, {
      _key: uid(),
      entry_date: entryDate,
      service_type: entryServiceType,
      principal_name: entryPrincipal.trim(),
      receipt_no: entryReceiptNo.trim(),
      bill_rrr_no: entryBillRrr.trim(),
      nin_charge: Number(entryNinCharge) || 0,
      amount: Number(entryAmount) || 0,
    }]);

    setEntryServiceType("");
    setEntryPrincipal("");
    setEntryReceiptNo("");
    setEntryBillRrr("");
    setEntryNinCharge("");
    setEntryAmount("");
  };

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l._key !== key));

  const buildPayload = (status: "draft" | "submitted") => ({
    zone_id: zoneId,
    state_id: stateId,
    reporting_year: Number(reportYear),
    reporting_month: Number(reportMonth),
    submission_date: submitDate || null,
    submitted_by: "State Office",
    status,
    lines: lines.map(l => ({
      entry_date: l.entry_date,
      service_type: l.service_type,
      principal_name: l.principal_name,
      receipt_no: l.receipt_no,
      bill_rrr_no: l.bill_rrr_no,
      nin_charge: l.nin_charge,
      amount: l.amount,
    })),
  });

  const validate = () => {
    if (!zoneId)   { toast.error("Please select a Zone"); return false; }
    if (!stateId)  { toast.error("Please select a State"); return false; }
    if (!reportYear || !reportMonth) { toast.error("Please select reporting period"); return false; }
    if (lines.length === 0) { toast.error("Add at least one row to the table"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildPayload("draft");
      let res;
      if (savedId) {
        res = await api.update(savedId, payload);
      } else {
        res = await api.create(payload);
        setSavedId(res.data.id);
        setRefId(res.data.reference_id);
      }
      toast.success("Draft saved", { description: `Ref: ${res.data.reference_id}` });
    } catch (err: unknown) {
      toast.error("Save failed", { description: (err as Error).message });
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = buildPayload("submitted");
      let res;
      if (savedId) {
        res = await api.update(savedId, { ...payload, status: "submitted" });
      } else {
        res = await api.create(payload);
        setSavedId(res.data.id);
      }
      setRefId(res.data.reference_id);
      toast.success("Report submitted", { description: `Reference: ${res.data.reference_id}` });
      (onSubmitted ?? onBack)();
    } catch (err: unknown) {
      toast.error("Submission failed", { description: (err as Error).message });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
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
              <span className="text-sm">Loading report...</span>
            </div>
          ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label>Zone <span className="text-red-500">*</span></Label>
                      <Select value={zoneId} onValueChange={setZoneId} disabled={lockZone}>
                        <SelectTrigger className={`w-full ${lockZone ? "opacity-70 bg-slate-50" : ""}`}
                          displayValue={zoneLabel}>
                          <SelectValue placeholder="Select Zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>State <span className="text-red-500">*</span></Label>
                      <Select value={stateId} onValueChange={setStateId} disabled={lockState || !zoneId}>
                        <SelectTrigger className={`w-full ${lockState ? "opacity-70 bg-slate-50" : ""}`}
                          displayValue={stateLabel}>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Submission</Label>
                      <Input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Reporting Month <span className="text-red-500">*</span></Label>
                      <Select value={reportMonth} onValueChange={setReportMonth}>
                        <SelectTrigger className="w-full" displayValue={monthLabel(reportMonth)}>
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Reporting Year <span className="text-red-500">*</span></Label>
                      <Input type="number" min="2000" max="2100" value={reportYear}
                        onChange={e => setReportYear(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Entry</CardTitle>
                  <CardDescription>Fill in transaction details, then click Add to append to the table.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Date <span className="text-red-500">*</span></Label>
                      <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Type <span className="text-red-500">*</span></Label>
                      <Select value={entryServiceType} onValueChange={setEntryServiceType}>
                        <SelectTrigger className="w-full"
                          displayValue={labelOf(IGR_SERVICE_TYPES, entryServiceType, "Select Service Type")}>
                          <SelectValue placeholder="Select Service Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {IGR_SERVICE_TYPES.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Name of Principal <span className="text-red-500">*</span></Label>
                      <Input placeholder="Full name" value={entryPrincipal}
                        onChange={e => setEntryPrincipal(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Receipt No <span className="text-red-500">*</span></Label>
                      <Input placeholder="Receipt number" value={entryReceiptNo}
                        onChange={e => setEntryReceiptNo(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bill / RRR No <span className="text-red-500">*</span></Label>
                      <Input placeholder="Bill or RRR number" value={entryBillRrr}
                        onChange={e => setEntryBillRrr(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>NIN Charge (₦)</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryNinCharge}
                        onChange={e => setEntryNinCharge(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₦) <span className="text-red-500">*</span></Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryAmount}
                        onChange={e => setEntryAmount(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addLine} className="w-full gap-2 bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">IGR Entries</CardTitle>
                  <CardDescription>
                    {monthLabel(reportMonth)} {reportYear} · Q{quarter} · {stateLabel}, {zoneLabel} · {lines.length} row(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {lines.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No entries yet. Use the form above to add rows.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                            <TableHead className="text-xs font-bold text-slate-600 w-12">#</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600">Date</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600">Name of Principal</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600">Receipt No</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600">Bill/RRR No</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 text-right">NIN Charge</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600">Service Type</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 text-right">Amount (₦)</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line, i) => (
                            <TableRow key={line._key} className="hover:bg-[#f8fdfb]">
                              <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                              <TableCell className="text-sm">{formatDate(line.entry_date)}</TableCell>
                              <TableCell className="text-sm font-medium">{line.principal_name}</TableCell>
                              <TableCell className="text-sm font-mono">{line.receipt_no}</TableCell>
                              <TableCell className="text-sm font-mono">{line.bill_rrr_no}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatAmount(line.nin_charge)}</TableCell>
                              <TableCell className="text-sm">{labelOf(IGR_SERVICE_TYPES, line.service_type)}</TableCell>
                              <TableCell className="text-sm text-right font-semibold tabular-nums">{formatAmount(line.amount)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                  onClick={() => removeLine(line._key)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                            <TableCell colSpan={7} className="text-sm text-right text-slate-600">
                              {cfg.totalLabel}
                            </TableCell>
                            <TableCell className="text-sm text-right text-primary tabular-nums">
                              {formatAmount(totalAmount)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {summaryByService.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">IGR Summary by Source</CardTitle>
                    <CardDescription>Section E totals grouped by service type.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold text-slate-600">Source</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 text-right">Amount (₦)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaryByService.map(row => (
                          <TableRow key={row.label}>
                            <TableCell className="text-sm font-medium">{row.label}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">{formatAmount(row.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                          <TableCell className="text-sm text-right text-slate-600">Total IGR</TableCell>
                          <TableCell className="text-sm text-right text-primary tabular-nums">{formatAmount(totalAmount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            )}

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
                    : <><Send className="w-4 h-4" /> Submit</>
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
