import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { stateOfficeApi } from "@/lib/api";
import {
  EXTRA_DEPENDANT_RELATIONSHIPS,
  EXTRA_DEPENDANT_STATUSES,
  ENROLLEE_REGISTER_SCHEMES,
  labelOf,
  parseSupportingDocuments,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);

type SavedDoc = { name: string; path: string };

const blank = () => ({
  enrollee_name: "",
  principle_nhia_number: "",
  age: "",
  relationship: "",
  program: "",
  request_date: "",
  process_end_date: "",
  line_status: "pending",
  supporting_documents: [] as SavedDoc[],
  supportingFiles: [] as File[],
});

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

function docLabel(docs: SavedDoc[], files: File[]) {
  const names = [
    ...docs.map((d) => d.name),
    ...files.map((f) => f.name),
  ].filter(Boolean);
  return names.length ? names.join(", ") : "—";
}

export default function ExtraDependantForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<any[]>([]);
  const [entry, setEntry] = React.useState(blank());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = (v: any) => {
    setLines((v.lines ?? []).map((l: any) => ({
      _key: uid(),
      enrollee_name: l.enrollee_name ?? "",
      principle_nhia_number: l.principle_nhia_number ?? "",
      age: l.age != null ? String(l.age) : "",
      relationship: l.relationship ?? "",
      program: l.program ?? "",
      request_date: l.request_date?.slice?.(0, 10) ?? "",
      process_end_date: l.process_end_date?.slice?.(0, 10) ?? "",
      line_status: l.line_status ?? "pending",
      supporting_documents: parseSupportingDocuments(l.supporting_documents).filter((d) => d.path) as SavedDoc[],
      supportingFiles: [] as File[],
    })));
  };

  const addLine = () => {
    if (!entry.enrollee_name.trim() || !entry.principle_nhia_number.trim() || !entry.relationship) return;
    setLines((p) => [...p, { _key: uid(), ...entry }]);
    setEntry(blank());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const afterPersist = async ({ id }: { id: number }) => {
    const pending = lines.filter((l) => (l.supportingFiles ?? []).length > 0);
    if (!pending.length) return;
    const res = await stateOfficeApi["extra-dependant"].get(id);
    const saved = res.data?.lines ?? [];
    for (const line of pending) {
      const match = saved.find((s: any) =>
        s.enrollee_name === line.enrollee_name &&
        s.principle_nhia_number === line.principle_nhia_number
      );
      if (!match) continue;
      await stateOfficeApi["extra-dependant"].uploadLineFiles(id, match.id, line.supportingFiles);
    }
    setLines((prev) => prev.map((l) => ({ ...l, supportingFiles: [] })));
  };

  return (
    <StateOfficeFormShell
      reportType="extra-dependant"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => (lines.length === 0 ? "Add at least one extra dependant" : null)}
      buildPayload={(base) => ({
        ...base,
        lines: lines.map(({ _key, supportingFiles, ...l }) => ({
          ...l,
          age: l.age === "" ? null : Number(l.age),
          supporting_documents: l.supporting_documents ?? [],
        })),
      })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Additional / Extra Dependent</CardTitle>
            <CardDescription>Record extra-dependant requests for the reporting month. Zone and state are set above.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Enrollee Name</Label><Input value={entry.enrollee_name} onChange={(e) => setEntry((v) => ({ ...v, enrollee_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>NHIA Number of Principle</Label><Input value={entry.principle_nhia_number} onChange={(e) => setEntry((v) => ({ ...v, principle_nhia_number: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Age</Label><Input type="number" min={0} value={entry.age} onChange={(e) => setEntry((v) => ({ ...v, age: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Relationship</Label>
                <Select value={entry.relationship} onValueChange={(v) => setEntry((p) => ({ ...p, relationship: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EXTRA_DEPENDANT_RELATIONSHIPS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Program</Label>
                <Select value={entry.program} onValueChange={(v) => setEntry((p) => ({ ...p, program: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ENROLLEE_REGISTER_SCHEMES.map((o) => <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Date of Request</Label><Input type="date" value={entry.request_date} onChange={(e) => setEntry((v) => ({ ...v, request_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Process end date</Label><Input type="date" value={entry.process_end_date} onChange={(e) => setEntry((v) => ({ ...v, process_end_date: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={entry.line_status} onValueChange={(v) => setEntry((p) => ({ ...p, line_status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EXTRA_DEPENDANT_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Supporting Document</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => setEntry((v) => ({ ...v, supportingFiles: Array.from(e.target.files ?? []) }))}
                />
                <p className="text-xs text-slate-500">Upload marriage certificate, birth certificate, NIN, or other supporting files. Multiple files allowed.</p>
              </div>
            </div>
            <Button onClick={addLine} className="gap-2"><Plus className="w-4 h-4" /> Add row</Button>
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7]">
                    {["Enrollee", "Principle NHIA", "Age", "Relationship", "Program", "Request", "End date", "Status", "Documents", ""].map((h) => (
                      <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l._key}>
                      <TableCell className="text-sm font-medium">{l.enrollee_name}</TableCell>
                      <TableCell className="text-sm">{l.principle_nhia_number}</TableCell>
                      <TableCell className="text-sm">{l.age || "—"}</TableCell>
                      <TableCell className="text-sm">{labelOf(EXTRA_DEPENDANT_RELATIONSHIPS, l.relationship, l.relationship)}</TableCell>
                      <TableCell className="text-sm">{l.program || "—"}</TableCell>
                      <TableCell className="text-sm">{l.request_date || "—"}</TableCell>
                      <TableCell className="text-sm">{l.process_end_date || "—"}</TableCell>
                      <TableCell className="text-sm">{labelOf(EXTRA_DEPENDANT_STATUSES, l.line_status, l.line_status)}</TableCell>
                      <TableCell className="text-sm">{docLabel(l.supporting_documents ?? [], l.supportingFiles ?? [])}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => setLines((p) => p.filter((x) => x._key !== l._key))}>
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
