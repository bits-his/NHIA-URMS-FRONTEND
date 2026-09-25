import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import AccreditedProviderSelect from "./AccreditedProviderSelect";
import { stateOfficeApi } from "@/lib/api";
import { YES_NO_OPTIONS, labelOf } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

const blank = () => ({
  selection_date: "",
  mda: "",
  former_hmo: "",
  reason_for_change: "",
  hmos_invited: "",
  hmos_attended: "",
  compliance_guideline: "",
  transparent_process: "",
  selected_hmo: "",
  evidenceFile: null as File | null,
  reportFile: null as File | null,
  evidence_path: "",
  evidence_name: "",
  report_path: "",
  report_name: "",
});

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function HmoSelectionReportForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<any[]>([]);
  const [entry, setEntry] = React.useState(blank());

  const loadData = (v: any) => {
    setLines((v.lines ?? []).map((l: any) => ({
      _key: uid(),
      selection_date: l.selection_date?.slice?.(0, 10) ?? "",
      mda: l.mda ?? "",
      former_hmo: l.former_hmo ?? "",
      reason_for_change: l.reason_for_change ?? "",
      hmos_invited: l.hmos_invited != null ? String(l.hmos_invited) : "",
      hmos_attended: l.hmos_attended != null ? String(l.hmos_attended) : (l.hmos_in_attendance ?? ""),
      compliance_guideline: l.compliance_guideline ?? "",
      transparent_process: l.transparent_process ?? "",
      selected_hmo: l.selected_hmo ?? "",
      evidenceFile: null,
      reportFile: null,
      evidence_path: l.evidence_path ?? "",
      evidence_name: l.evidence_name ?? "",
      report_path: l.report_path ?? "",
      report_name: l.report_name ?? "",
    })));
  };

  const addLine = () => {
    if (!entry.mda.trim()) return;
    setLines((p) => [...p, { _key: uid(), ...entry }]);
    setEntry(blank());
  };

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = lines.filter((l) => l.evidenceFile || l.reportFile);
    if (!pending.length) return;
    const res = await stateOfficeApi["hmo-selection"].get(id);
    const saved = res.data?.lines ?? [];
    for (const line of pending) {
      const match = saved.find((s: any) =>
        s.mda === line.mda &&
        (s.selection_date?.slice?.(0, 10) ?? s.selection_date ?? "") === (line.selection_date || "")
      );
      if (!match) continue;
      if (line.evidenceFile) {
        await stateOfficeApi["hmo-selection"].uploadLineFile(id, match.id, line.evidenceFile, "evidence");
      }
      if (line.reportFile) {
        await stateOfficeApi["hmo-selection"].uploadLineFile(id, match.id, line.reportFile, "report");
      }
    }
    setLines((prev) => prev.map((l) => ({ ...l, evidenceFile: null, reportFile: null })));
  };

  return (
    <StateOfficeFormShell
      reportType="hmo-selection" reportId={reportId} onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId} defaultStateId={defaultStateId}
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => (lines.length === 0 ? "Add at least one MDA selection record" : null)}
      buildPayload={(base) => ({
        ...base,
        lines: lines.map(({ _key, evidenceFile, reportFile, ...l }) => ({
          ...l,
          hmos_in_attendance: l.hmos_attended,
          hmos_invited: l.hmos_invited === "" ? null : Number(l.hmos_invited),
          hmos_attended: l.hmos_attended === "" ? null : Number(l.hmos_attended),
        })),
      })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">MDA Change of HMO Selection Process</CardTitle>
            <CardDescription>Record MDA HMO selection meetings, compliance, and supporting documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={entry.selection_date} onChange={(e) => setEntry((v) => ({ ...v, selection_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Name of MDA</Label><Input value={entry.mda} onChange={(e) => setEntry((v) => ({ ...v, mda: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Former HMO</Label>
                <AccreditedProviderSelect type="hmo" onChange={(p) => setEntry((v) => ({ ...v, former_hmo: p?.name ?? "" }))} placeholder="Select accredited HMO" />
                {entry.former_hmo ? <p className="text-xs text-slate-500">{entry.former_hmo}</p> : null}
              </div>
              <div className="space-y-1 md:col-span-3"><Label>Reason for change</Label><Input value={entry.reason_for_change} onChange={(e) => setEntry((v) => ({ ...v, reason_for_change: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Number of HMOs invited</Label><Input type="number" min={0} value={entry.hmos_invited} onChange={(e) => setEntry((v) => ({ ...v, hmos_invited: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Number of HMOs attended selection process</Label><Input type="number" min={0} value={entry.hmos_attended} onChange={(e) => setEntry((v) => ({ ...v, hmos_attended: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Compliance with NHIA Guideline</Label>
                <Select value={entry.compliance_guideline} onValueChange={(v) => setEntry((p) => ({ ...p, compliance_guideline: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Transparent selection process</Label>
                <Select value={entry.transparent_process} onValueChange={(v) => setEntry((p) => ({ ...p, transparent_process: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Selected HMO</Label>
                <AccreditedProviderSelect type="hmo" onChange={(p) => setEntry((v) => ({ ...v, selected_hmo: p?.name ?? "" }))} placeholder="Select accredited HMO" />
                {entry.selected_hmo ? <p className="text-xs text-slate-500">{entry.selected_hmo}</p> : null}
              </div>
              <div className="space-y-1">
                <Label>Evidence</Label>
                <Input type="file" onChange={(e) => setEntry((v) => ({ ...v, evidenceFile: e.target.files?.[0] ?? null }))} />
              </div>
              <div className="space-y-1">
                <Label>Attach full selection report</Label>
                <Input type="file" onChange={(e) => setEntry((v) => ({ ...v, reportFile: e.target.files?.[0] ?? null }))} />
              </div>
            </div>
            <Button onClick={addLine} className="gap-2"><Plus className="w-4 h-4" /> Add row</Button>
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7]">
                    {["Date", "MDA", "Former HMO", "Selected HMO", "Invited", "Attended", "Guideline", "Transparent", "Files", ""].map((h) => (
                      <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l._key}>
                      <TableCell className="text-sm">{l.selection_date || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{l.mda}</TableCell>
                      <TableCell className="text-sm">{l.former_hmo || "—"}</TableCell>
                      <TableCell className="text-sm">{l.selected_hmo || "—"}</TableCell>
                      <TableCell className="text-sm">{l.hmos_invited || "—"}</TableCell>
                      <TableCell className="text-sm">{l.hmos_attended || "—"}</TableCell>
                      <TableCell className="text-sm">{labelOf(YES_NO_OPTIONS, l.compliance_guideline, l.compliance_guideline || "—")}</TableCell>
                      <TableCell className="text-sm">{labelOf(YES_NO_OPTIONS, l.transparent_process, l.transparent_process || "—")}</TableCell>
                      <TableCell className="text-sm">
                        {[l.evidenceFile?.name || l.evidence_name, l.reportFile?.name || l.report_name].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                          onClick={() => setLines((p) => p.filter((x) => x._key !== l._key))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
