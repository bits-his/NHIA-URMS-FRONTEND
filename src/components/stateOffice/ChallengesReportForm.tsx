import * as React from "react";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_DEPARTMENTS,
  CHALLENGE_IMPACTS,
  CHALLENGE_PROGRAMS,
  CHALLENGE_RELATED_ACTIVITIES,
  CHALLENGE_SEVERITIES,
  CHALLENGE_SPECIFICS,
  CHALLENGE_STATUSES,
  CHALLENGE_SUPPORT_OPTIONS,
} from "./challengesTypes";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const uid = () => Math.random().toString(36).slice(2);

const blank = () => ({
  challenge_category: CHALLENGE_CATEGORIES[0]?.label ?? "",
  specific_challenge: "",
  challenge_details: "",
  related_activity: "",
  related_program: "",
  severity: "",
  impact: "",
  support_required: "",
  support_context: "",
  key_recommendation: "",
  responsible_department: "",
  status: "",
  remarks: "",
});

type Entry = ReturnType<typeof blank>;

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/** Activity Reporting Template — Section 7. CHALLENGES */
export default function ChallengesReportForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const fresh = (): Entry => ({ ...blank() });
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const [entry, setEntry] = React.useState<Entry>(fresh);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const categoryMeta = CHALLENGE_CATEGORIES.find((c) => c.label === entry.challenge_category);
  const specificOptions = categoryMeta ? (CHALLENGE_SPECIFICS[categoryMeta.key] ?? []) : [];

  const loadData = (v: any) => {
    const fromLines = (v.lines ?? []).map((l: any) => ({
      _key: uid(),
      challenge_category: l.challenge_category
        || CHALLENGE_CATEGORIES.find((c) => c.key === l.challenge_category)?.label
        || l.challenge_category
        || "",
      specific_challenge: l.specific_challenge ?? "",
      challenge_details: l.challenge_details ?? "",
      related_activity: l.related_activity ?? "",
      related_program: l.related_program ?? "",
      severity: l.severity ?? "",
      impact: l.impact ?? "",
      support_required: l.support_required ?? "",
      support_context: l.support_context ?? "",
      key_recommendation: l.key_recommendation ?? "",
      responsible_department: l.responsible_department ?? "",
      status: l.status ?? "",
      remarks: l.remarks ?? "",
    }));
    // migrate legacy free-text reports into one synthetic line
    if (!fromLines.length && (v.challenges || v.recommendations)) {
      fromLines.push({
        ...blank(),
        _key: uid(),
        challenge_details: v.challenges ?? "",
        key_recommendation: v.recommendations ?? "",
        challenge_category: CHALLENGE_CATEGORIES[0]?.label ?? "Financial Funding",
      });
    }
    linesRef.current = fromLines;
    setLines(fromLines);
  };

  const resetEntry = () => {
    setEntry(fresh());
    setEditingKey(null);
  };

  const saveLine = (): boolean => {
    if (!entry.challenge_category) { toast.error("Select a challenge category"); return false; }
    if (!entry.status) { toast.error("Select the challenge status"); return false; }
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...entry, _key: editingKey } : l))
      : [...linesRef.current, { ...entry, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    resetEntry();
    return true;
  };

  const entryInProgress = !!(entry.specific_challenge || entry.challenge_details || entry.status || entry.impact);

  return (
    <StateOfficeFormShell
      reportType="challenges"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle="Challenges"
      hideFooterActions
      onLoaded={loadData}
      validate={() => (linesRef.current.length === 0 ? "Add at least one challenge" : null)}
      buildPayload={(base) => ({
        ...base,
        lines: linesRef.current.map(({ _key, ...l }) => {
          const cat = CHALLENGE_CATEGORIES.find((c) => c.label === l.challenge_category);
          return {
            challenge_code: cat?.code ?? null,
            challenge_category: l.challenge_category,
            specific_challenge: l.specific_challenge || null,
            challenge_details: l.challenge_details || null,
            related_activity: l.related_activity || null,
            related_program: l.related_program || null,
            severity: l.severity || null,
            impact: l.impact || null,
            support_required: l.support_required || null,
            support_context: l.support_context || null,
            key_recommendation: l.key_recommendation || null,
            responsible_department: l.responsible_department || null,
            status: l.status || null,
            remarks: l.remarks || null,
          };
        }),
      })}
    >
      {({ submitting, persist, requestSubmit }) => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Challenges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Challenge Category *</Label>
                <Select
                  value={entry.challenge_category}
                  onValueChange={(v) => setEntry((p) => ({ ...p, challenge_category: v, specific_challenge: "" }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_CATEGORIES.map((c) => (
                      <SelectItem key={c.code} value={c.label}>{c.code} — {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Challenge ID</Label>
                <Input value={categoryMeta?.code ?? ""} readOnly className="bg-slate-50" placeholder="Auto" />
              </div>
              <div className="space-y-1">
                <Label>Specific Challenge</Label>
                <Select value={entry.specific_challenge} onValueChange={(v) => set("specific_challenge", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {specificOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Challenge Details</Label>
                <Textarea rows={3} value={entry.challenge_details} onChange={(e) => set("challenge_details", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Related Activity</Label>
                <Select value={entry.related_activity} onValueChange={(v) => set("related_activity", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_RELATED_ACTIVITIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Related Program</Label>
                <Select value={entry.related_program} onValueChange={(v) => set("related_program", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_PROGRAMS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Impact</Label>
                <Select value={entry.impact} onValueChange={(v) => set("impact", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_IMPACTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Severity / Priority</Label>
                <Select value={entry.severity} onValueChange={(v) => set("severity", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_SEVERITIES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Support Required</Label>
                <Select value={entry.support_required} onValueChange={(v) => set("support_required", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_SUPPORT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Responsible Department / Unit</Label>
                <Select value={entry.responsible_department} onValueChange={(v) => set("responsible_department", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_DEPARTMENTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status *</Label>
                <Select value={entry.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CHALLENGE_STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Provide context on required Support</Label>
                <Textarea rows={2} value={entry.support_context} onChange={(e) => set("support_context", e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Key Recommendation</Label>
                <Textarea rows={2} value={entry.key_recommendation} onChange={(e) => set("key_recommendation", e.target.value)} />
              </div>
              <div className="space-y-1 md:col-span-3">
                <Label>Remarks</Label>
                <Textarea rows={2} value={entry.remarks} onChange={(e) => set("remarks", e.target.value)} />
              </div>
            </div>

            {lines.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7]">
                      {["ID", "Category", "Specific", "Severity", "Status", ""].map((h) => (
                        <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l) => {
                      const code = CHALLENGE_CATEGORIES.find((c) => c.label === l.challenge_category)?.code;
                      return (
                        <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                          <TableCell className="text-xs font-mono">{code || "—"}</TableCell>
                          <TableCell className="text-sm font-medium">{l.challenge_category}</TableCell>
                          <TableCell className="text-xs">{l.specific_challenge || "—"}</TableCell>
                          <TableCell className="text-xs">{l.severity || "—"}</TableCell>
                          <TableCell className="text-xs">{l.status || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]"
                              onClick={() => { const row = lines.find((x) => x._key === l._key); if (!row) return; const { _key, ...rest } = row; setEntry(rest); setEditingKey(l._key); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                              onClick={() => { const next = linesRef.current.filter((x) => x._key !== l._key); linesRef.current = next; setLines(next); }}>
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

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingKey && <Button variant="outline" onClick={resetEntry}>Cancel edit</Button>}
              {editingKey || (entryInProgress && lines.length > 0) ? (
                <Button variant="outline" className="gap-2" onClick={() => { if (saveLine()) toast.success(editingKey ? "Challenge updated" : "Challenge added"); }}>
                  <Plus className="w-4 h-4" /> {editingKey ? "Update challenge" : "Add challenge"}
                </Button>
              ) : null}
              <Button
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                disabled={submitting}
                onClick={() => {
                  if (editingKey || entryInProgress || lines.length === 0) {
                    if (!saveLine()) return;
                  }
                  requestSubmit(() => persist("submitted"));
                }}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
