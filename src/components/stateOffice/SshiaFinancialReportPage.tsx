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
  REPORT_CONFIG, MONTHS, SSHIA_SUB_HEADS, SSHIA_COLUMNS,
  monthLabel, quarterFromMonth, labelOf, formatNaira, calcSshiaLine,
} from "./constants";

interface DropdownOption { id: number; label: string; }

interface SshiaLine {
  _key: string;
  sub_head: string;
  opening_balance: number;
  receipts: number;
  total_budget: number;
  actual_expenditure: number;
  balance: number;
  variance_pct: number;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const uid = () => Math.random().toString(36).slice(2);
const cfg = REPORT_CONFIG["sshia-financial"];
const api = stateOfficeApi["sshia-financial"];

export default function SshiaFinancialReportPage({
  reportId, onBack, defaultZoneId, defaultStateId,
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

  const [lines, setLines] = React.useState<SshiaLine[]>([]);

  const [entrySubHead, setEntrySubHead] = React.useState("");
  const [entryA, setEntryA] = React.useState("");
  const [entryB, setEntryB] = React.useState("");
  const [entryC, setEntryC] = React.useState("");
  const [entryD, setEntryD] = React.useState("");
  const [entryE, setEntryE] = React.useState("");

  const [loadingRecord, setLoadingRecord] = React.useState(false);
  const [saving,        setSaving]        = React.useState(false);
  const [submitting,    setSubmitting]    = React.useState(false);
  const [savedId,       setSavedId]       = React.useState<number | null>(null);
  const [refId,         setRefId]         = React.useState<string | null>(null);

  const previewF = React.useMemo(() => {
    const C = Number(entryC) || 0;
    const D = Number(entryD) || 0;
    return D !== 0 ? (C / D) * 100 : 0;
  }, [entryC, entryD]);

  React.useEffect(() => {
    const A = Number(entryA) || 0;
    const B = Number(entryB) || 0;
    setEntryC(String(A + B));
  }, [entryA, entryB]);

  React.useEffect(() => {
    const C = Number(entryC) || 0;
    const D = Number(entryD) || 0;
    setEntryE(String(C - D));
  }, [entryC, entryD]);

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
      if (lockState && defaultStateId) setStateId(defaultStateId);
      else if (defaultStateId && r.data.some((s: { id: number }) => String(s.id) === defaultStateId)) {
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

        const statesRes = await stockApi.getStates(String(v.zone_id));
        setStates(statesRes.data.map((s: { id: number; description: string }) => ({ id: s.id, label: s.description })));

        setSavedId(v.id);
        setRefId(v.reference_id);
        setZoneId(String(v.zone_id));
        setStateId(String(v.state_id));
        setReportYear(String(v.reporting_year));
        setReportMonth(String(v.reporting_month));
        setSubmitDate(v.submission_date ? String(v.submission_date).slice(0, 10) : "");

        setLines((v.lines ?? []).map((line: Record<string, unknown>) => ({
          _key: uid(),
          sub_head: String(line.sub_head ?? ""),
          opening_balance: Number(line.opening_balance) || 0,
          receipts: Number(line.receipts) || 0,
          total_budget: Number(line.total_budget) || 0,
          actual_expenditure: Number(line.actual_expenditure) || 0,
          balance: Number(line.balance) || 0,
          variance_pct: Number(line.variance_pct) || 0,
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

  const totals = React.useMemo(() => lines.reduce((acc, l) => ({
    A: acc.A + l.opening_balance,
    B: acc.B + l.receipts,
    C: acc.C + l.total_budget,
    D: acc.D + l.actual_expenditure,
    E: acc.E + l.balance,
  }), { A: 0, B: 0, C: 0, D: 0, E: 0 }), [lines]);

  const addLine = () => {
    if (!entrySubHead) { toast.error("Select a sub-head"); return; }
    if (lines.some(l => l.sub_head === entrySubHead)) {
      toast.error("This sub-head is already in the table. Remove it first to change values.");
      return;
    }

    const calc = calcSshiaLine(
      Number(entryA) || Number(entryC) - Number(entryB),
      Number(entryB),
      Number(entryD),
    );
    const C = Number(entryC) || calc.total_budget;
    const E = Number(entryE) || (C - (Number(entryD) || 0));
    const D = Number(entryD) || 0;
    const A = Number(entryA) || 0;
    const B = Number(entryB) || 0;
    const F = D !== 0 ? (C / D) * 100 : 0;

    if (D < 0) { toast.error("Actual expenditure must be zero or greater"); return; }

    setLines(prev => [...prev, {
      _key: uid(),
      sub_head: entrySubHead,
      opening_balance: A,
      receipts: B,
      total_budget: C,
      actual_expenditure: D,
      balance: E,
      variance_pct: F,
    }]);

    setEntrySubHead(""); setEntryA(""); setEntryB(""); setEntryC(""); setEntryD(""); setEntryE("");
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
      sub_head: l.sub_head,
      opening_balance: l.opening_balance,
      receipts: l.receipts,
      total_budget: l.total_budget,
      actual_expenditure: l.actual_expenditure,
      balance: l.balance,
      variance_pct: l.variance_pct,
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
      if (savedId) res = await api.update(savedId, payload);
      else {
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
      if (savedId) res = await api.update(savedId, { ...payload, status: "submitted" });
      else {
        res = await api.create(payload);
        setSavedId(res.data.id);
      }
      setRefId(res.data.reference_id);
      toast.success("Report submitted", { description: `Reference: ${res.data.reference_id}` });
      onBack();
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
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={handleSubmit} disabled={submitting}>
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                  <CardDescription>State, zone, and reporting period for this submission.</CardDescription>
                </CardHeader>
                <CardContent>
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
                      <Label>State (SSHIA) <span className="text-red-500">*</span></Label>
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
                      <Label>Financial Year <span className="text-red-500">*</span></Label>
                      <Input type="number" min="2000" max="2100" value={reportYear}
                        onChange={e => setReportYear(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Quarter: Q{quarter}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Entry</CardTitle>
                  <CardDescription>Select sub-head and enter financial figures (₦), then click Add.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Sub-head <span className="text-red-500">*</span></Label>
                      <Select value={entrySubHead} onValueChange={setEntrySubHead}>
                        <SelectTrigger className="w-full"
                          displayValue={labelOf(SSHIA_SUB_HEADS, entrySubHead, "Select Sub-head")}>
                          <SelectValue placeholder="Select Sub-head" />
                        </SelectTrigger>
                        <SelectContent>
                          {SSHIA_SUB_HEADS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Opening Bal (A) ₦</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryA}
                        onChange={e => setEntryA(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Receipts (B) ₦</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryB}
                        onChange={e => setEntryB(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Budget (C = A+B) ₦</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryC}
                        onChange={e => setEntryC(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Actual Expenditure (D) ₦</Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryD}
                        onChange={e => setEntryD(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Balance (E = C−D) ₦</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={entryE}
                        onChange={e => setEntryE(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Variance % (F = C÷D×100)</Label>
                      <Input readOnly className="bg-slate-50 tabular-nums" value={`${previewF.toFixed(2)}%`} />
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
                  <CardTitle className="text-base">Financial Progress</CardTitle>
                  <CardDescription>
                    {monthLabel(reportMonth)} {reportYear} · Q{quarter} · {stateLabel} · {lines.length} row(s)
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
                            <TableHead className="text-xs font-bold text-slate-600">Sub-head</TableHead>
                            {SSHIA_COLUMNS.map(col => (
                              <TableHead key={col.key} className="text-xs font-bold text-slate-600 text-right min-w-[7rem]">
                                <div>{col.label}</div>
                                <div className="text-[10px] font-normal text-slate-500 whitespace-nowrap">
                                  {col.code}{col.hint ? ` = ${col.hint}` : ""} ({col.unit})
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line, i) => (
                            <TableRow key={line._key} className="hover:bg-[#f8fdfb]">
                              <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                              <TableCell className="text-sm font-medium">
                                {labelOf(SSHIA_SUB_HEADS, line.sub_head)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.opening_balance)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.receipts)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.total_budget)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.actual_expenditure)}</TableCell>
                              <TableCell className="text-sm text-right font-semibold tabular-nums">{formatNaira(line.balance)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{line.variance_pct.toFixed(2)}%</TableCell>
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
                            <TableCell colSpan={2} className="text-sm text-right text-slate-600">Totals</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.A)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.B)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.C)}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">{formatNaira(totals.D)}</TableCell>
                            <TableCell className="text-sm text-right text-primary tabular-nums">{formatNaira(totals.E)}</TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <div className="flex justify-between pb-8">
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Cancel
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                  onClick={handleSubmit} disabled={submitting}>
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
