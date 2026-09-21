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
  REPORT_CONFIG, MONTHS, EXPENDITURE_SUB_HEADS,
  monthLabel, quarterFromMonth, labelOf, formatNaira, calcExpenditurePct,
} from "./constants";

interface DropdownOption { id: number; label: string; }

interface ExpenditureLine {
  _key: string;
  sub_head: string;
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
const cfg = REPORT_CONFIG["expenditure-profile"];
const api = stateOfficeApi["expenditure-profile"];

export default function ExpenditureProfileReportPage({
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

  const [lines, setLines] = React.useState<ExpenditureLine[]>([]);
  const [entrySubHead, setEntrySubHead] = React.useState("");
  const [entryAmount,  setEntryAmount]  = React.useState("");

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

  const addLine = () => {
    if (!entrySubHead) { toast.error("Select a sub-head"); return; }
    if (lines.some(l => l.sub_head === entrySubHead)) {
      toast.error("This sub-head is already in the table. Remove it first to change values.");
      return;
    }
    if (!entryAmount || Number(entryAmount) < 0) { toast.error("Enter a valid amount"); return; }

    setLines(prev => [...prev, {
      _key: uid(),
      sub_head: entrySubHead,
      amount: Number(entryAmount) || 0,
    }]);

    setEntrySubHead("");
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
      sub_head: l.sub_head,
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                    <div className="space-y-2">
                      <Label>Quarter</Label>
                      <Input readOnly className="bg-slate-50" value={`Q${quarter}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Entry</CardTitle>
                  <CardDescription>Select sub-head and amount allocated, then click Add.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Sub-head <span className="text-red-500">*</span></Label>
                      <Select value={entrySubHead} onValueChange={setEntrySubHead}>
                        <SelectTrigger className="w-full"
                          displayValue={labelOf(EXPENDITURE_SUB_HEADS, entrySubHead, "Select Sub-head")}>
                          <SelectValue placeholder="Select Sub-head" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENDITURE_SUB_HEADS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Allocated (₦) <span className="text-red-500">*</span></Label>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" value={entryAmount}
                        onChange={e => setEntryAmount(e.target.value)} />
                    </div>
                    <div className="flex items-end md:col-span-3">
                      <Button onClick={addLine} className="w-full md:w-auto gap-2 bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4" /> Add to Table
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Expenditure Profile</CardTitle>
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
                            <TableHead className="text-xs font-bold text-slate-600 text-right">Percentage</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 text-right">Amount (₦)</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line, i) => (
                            <TableRow key={line._key} className="hover:bg-[#f8fdfb]">
                              <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                              <TableCell className="text-sm font-medium">
                                {labelOf(EXPENDITURE_SUB_HEADS, line.sub_head)}
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">
                                {calcExpenditurePct(line.amount, totalAmount).toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatNaira(line.amount)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                                  onClick={() => removeLine(line._key)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 font-bold border-t-2 border-[#d4e8dc]">
                            <TableCell colSpan={2} className="text-sm text-right text-slate-600">TOTAL</TableCell>
                            <TableCell className="text-sm text-right tabular-nums">100.00%</TableCell>
                            <TableCell className="text-sm text-right text-primary tabular-nums">{formatNaira(totalAmount)}</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <div className="flex justify-end gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to List
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2"
                onClick={handleSubmit} disabled={submitting}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit Report</>
                }
              </Button>
            </div>
          </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
