import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  COMPLAINT_SUMMARY_CATEGORIES, COMPLAINT_STATUS_TYPES, labelOf, formatCount,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function ComplaintsReportForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [summaryLines, setSummaryLines] = React.useState<any[]>([]);
  const [statusLines, setStatusLines] = React.useState<any[]>([]);
  const [visitLines, setVisitLines] = React.useState<any[]>([]);
  const [reconLines, setReconLines] = React.useState<any[]>([]);

  const [sumCat, setSumCat] = React.useState("");
  const [sumCount, setSumCount] = React.useState("");
  const [statType, setStatType] = React.useState("");
  const [statCount, setStatCount] = React.useState("");
  const [visit, setVisit] = React.useState({ facility: "", date: "", purpose: "", outcome: "" });
  const [recon, setRecon] = React.useState({ hmo: "", facility: "", amount: "", status: "", comment: "" });

  const loadData = (v: any) => {
    setSummaryLines((v.summary_lines ?? []).map((l: any) => ({ ...l, _key: uid() })));
    setStatusLines((v.status_lines ?? []).map((l: any) => ({ ...l, _key: uid() })));
    setVisitLines((v.visit_lines ?? []).map((l: any) => ({
      _key: uid(), facility_visited: l.facility_visited, visit_date: l.visit_date?.slice?.(0, 10) ?? l.visit_date ?? "",
      purpose: l.purpose ?? "", outcome: l.outcome ?? "",
    })));
    setReconLines((v.reconciliation_lines ?? []).map((l: any) => ({
      _key: uid(), hmo: l.hmo, facility: l.facility, amount_owed: String(l.amount_owed ?? ""),
      recon_status: l.recon_status ?? "", comment: l.comment ?? "",
    })));
  };

  const addSummary = () => {
    if (!sumCat || !sumCount) return;
    if (summaryLines.some(l => l.category === sumCat)) return;
    setSummaryLines(p => [...p, { _key: uid(), category: sumCat, complaint_count: Number(sumCount) }]);
    setSumCat(""); setSumCount("");
  };

  const addStatus = () => {
    if (!statType || !statCount) return;
    if (statusLines.some(l => l.status === statType)) return;
    setStatusLines(p => [...p, { _key: uid(), status: statType, status_count: Number(statCount) }]);
    setStatType(""); setStatCount("");
  };

  const addVisit = () => {
    if (!visit.facility.trim()) return;
    setVisitLines(p => [...p, { _key: uid(), facility_visited: visit.facility, visit_date: visit.date || null, purpose: visit.purpose, outcome: visit.outcome }]);
    setVisit({ facility: "", date: "", purpose: "", outcome: "" });
  };

  const addRecon = () => {
    if (!recon.hmo.trim() || !recon.facility.trim()) return;
    setReconLines(p => [...p, { _key: uid(), hmo: recon.hmo, facility: recon.facility, amount_owed: Number(recon.amount) || 0, recon_status: recon.status, comment: recon.comment }]);
    setRecon({ hmo: "", facility: "", amount: "", status: "", comment: "" });
  };

  return (
    <StateOfficeFormShell
      reportType="complaints" reportId={reportId} onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId} defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() => (summaryLines.length + statusLines.length + visitLines.length + reconLines.length === 0
        ? "Add at least one entry" : null)}
      buildPayload={(base) => ({
        ...base,
        summary_lines: summaryLines.map(({ _key, ...l }) => l),
        status_lines: statusLines.map(({ _key, ...l }) => l),
        visit_lines: visitLines.map(({ _key, ...l }) => l),
        reconciliation_lines: reconLines.map(({ _key, ...l }) => l),
      })}
    >
      {() => (
        <div className="space-y-4">
          <Section title="1. Complaints Summary" desc="Category and number of complaints">
            <div className="grid md:grid-cols-3 gap-3 items-end mb-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={sumCat} onValueChange={setSumCat}>
                  <SelectTrigger displayValue={labelOf(COMPLAINT_SUMMARY_CATEGORIES, sumCat, "Select")}><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLAINT_SUMMARY_CATEGORIES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Number</Label><Input type="number" min="0" value={sumCount} onChange={e => setSumCount(e.target.value)} /></div>
              <Button onClick={addSummary} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <MiniTable headers={["Category", "Number", ""]} rows={summaryLines.map(l => [
              labelOf(COMPLAINT_SUMMARY_CATEGORIES, l.category), formatCount(l.complaint_count),
              <BtnRemove key="r" onClick={() => setSummaryLines(p => p.filter(x => x._key !== l._key))} />,
            ])} />
          </Section>

          <Section title="2. Complaint Status" desc="Status and number">
            <div className="grid md:grid-cols-3 gap-3 items-end mb-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={statType} onValueChange={setStatType}>
                  <SelectTrigger displayValue={labelOf(COMPLAINT_STATUS_TYPES, statType, "Select")}><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPLAINT_STATUS_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Number</Label><Input type="number" min="0" value={statCount} onChange={e => setStatCount(e.target.value)} /></div>
              <Button onClick={addStatus} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <MiniTable headers={["Status", "Number", ""]} rows={statusLines.map(l => [
              labelOf(COMPLAINT_STATUS_TYPES, l.status), formatCount(l.status_count),
              <BtnRemove key="r" onClick={() => setStatusLines(p => p.filter(x => x._key !== l._key))} />,
            ])} />
          </Section>

          <Section title="3. Compliance Monitoring / Investigative Visits" desc="Facility visits">
            <div className="grid md:grid-cols-5 gap-3 items-end mb-3">
              <div className="space-y-1"><Label>Facility</Label><Input value={visit.facility} onChange={e => setVisit(v => ({ ...v, facility: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={visit.date} onChange={e => setVisit(v => ({ ...v, date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Purpose</Label><Input value={visit.purpose} onChange={e => setVisit(v => ({ ...v, purpose: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Outcome</Label><Input value={visit.outcome} onChange={e => setVisit(v => ({ ...v, outcome: e.target.value }))} /></div>
              <Button onClick={addVisit} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <MiniTable headers={["Facility", "Date", "Purpose", "Outcome", ""]} rows={visitLines.map(l => [
              l.facility_visited, l.visit_date || "—", l.purpose || "—", l.outcome || "—",
              <BtnRemove key="r" onClick={() => setVisitLines(p => p.filter(x => x._key !== l._key))} />,
            ])} />
          </Section>

          <Section title="4. Reconciliation Meetings" desc="HMO reconciliation records">
            <div className="grid md:grid-cols-6 gap-3 items-end mb-3">
              <div className="space-y-1"><Label>HMO</Label><Input value={recon.hmo} onChange={e => setRecon(v => ({ ...v, hmo: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Facility</Label><Input value={recon.facility} onChange={e => setRecon(v => ({ ...v, facility: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Amount Owed</Label><Input type="number" min="0" value={recon.amount} onChange={e => setRecon(v => ({ ...v, amount: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Input value={recon.status} onChange={e => setRecon(v => ({ ...v, status: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Comment</Label><Input value={recon.comment} onChange={e => setRecon(v => ({ ...v, comment: e.target.value }))} /></div>
              <Button onClick={addRecon} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <MiniTable headers={["HMO", "Facility", "Amount", "Status", "Comment", ""]} rows={reconLines.map(l => [
              l.hmo, l.facility, formatCount(l.amount_owed), l.recon_status || "—", l.comment || "—",
              <BtnRemove key="r" onClick={() => setReconLines(p => p.filter(x => x._key !== l._key))} />,
            ])} />
          </Section>
        </div>
      )}
    </StateOfficeFormShell>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-[#d4e8dc]">
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BtnRemove({ onClick }: { onClick: () => void }) {
  return <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={onClick}><Trash2 className="w-3.5 h-3.5" /></Button>;
}

function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (!rows.length) return <p className="text-sm text-slate-400 py-2">No entries yet.</p>;
  return (
    <Table>
      <TableHeader><TableRow className="bg-[#f0fdf7]">{headers.map(h => <TableHead key={h} className="text-xs font-bold">{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((cells, i) => <TableRow key={i}>{cells.map((c, j) => <TableCell key={j} className="text-sm">{c}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  );
}
