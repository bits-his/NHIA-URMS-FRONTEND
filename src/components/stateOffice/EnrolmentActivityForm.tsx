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
  ENROLMENT_ACTIVITIES,
  ENROLMENT_ACTIVITY_STATUSES,
  ENROLMENT_BENEFICIARY_CATEGORIES,
  ENROLMENT_BUDGETED,
  ENROLMENT_CHANNELS,
  ENROLMENT_TYPES,
  ENROLMENT_FUNDING_OPTIONS,
  ENROLMENT_PROGRAMS,
  ENROLMENT_RENEWABLE_PROGRAM_LABELS,
  ENROLMENT_SSHIA_CHANNELS,
  ENROLMENT_MODES_OF_REGISTRATION,
} from "./enrolmentPillarTypes";

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
    />
  );
}

const uid = () => Math.random().toString(36).slice(2);
const numStr = (v: unknown) => (v != null && v !== "" ? String(Number(v)) : "");
const numOrNull = (v: string) => (v === "" ? null : Number(v));

const blank = () => ({
  activity_date: "",
  category: (ENROLMENT_ACTIVITIES[0]?.value ?? "enrolment") as string,
  enrolment_channel: "",
  enrolment_type: "",
  program_name: "",
  enrolment_category: "",
  beneficiary_category: "",
  funding_option: "",
  activity_budget: "",
  approved_amount: "",
  enrolment_count: "",
  enrollees_validated: "",
  activity_status: "",
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

/** Activity Reporting Template — Section 1. ENROLMENT */
export default function EnrolmentActivityForm({
  reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId,
}: Props) {
  const fresh = (): Entry => ({ ...blank() });
  const [lines, setLines] = React.useState<(Entry & { _key: string })[]>([]);
  const [entry, setEntry] = React.useState<Entry>(fresh);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const linesRef = React.useRef(lines);
  linesRef.current = lines;

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setEntry((p) => ({ ...p, [k]: v }));
  const isBudgeted = entry.funding_option === ENROLMENT_BUDGETED;
  const activityLabel = ENROLMENT_ACTIVITIES.find((a) => a.value === entry.category)?.label
    ?? entry.category;
  const programOptions = React.useMemo(() => {
    if (entry.enrolment_channel === "SSHIA") {
      return ENROLMENT_SSHIA_CHANNELS.map((label) => ({ code: null as string | null, label }));
    }
    if (entry.enrolment_channel !== "NHIA") return [];
    const nhia = ENROLMENT_PROGRAMS.map((p) => ({ code: p.code as string | null, label: p.label }));
    if (entry.enrolment_type === "Renewal") {
      return nhia.filter((p) => ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(p.label));
    }
    if (entry.enrolment_type === "Non-renewal") {
      return nhia.filter((p) => !ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(p.label));
    }
    return [];
  }, [entry.enrolment_channel, entry.enrolment_type]);

  /** Legacy rows stored channel as `SSHIA / BHCPF` — fold that into program. */
  const parseStoredChannel = (raw: string | null | undefined, programName: string | null | undefined) => {
    const value = String(raw ?? "").trim();
    if (value.startsWith("SSHIA / ")) {
      const sshiaProgram = value.slice("SSHIA / ".length).trim();
      return {
        enrolment_channel: "SSHIA",
        program_name: programName || sshiaProgram,
      };
    }
    return {
      enrolment_channel: value,
      program_name: programName ?? "",
    };
  };

  const loadData = (v: any) => {
    const next = (v.lines ?? []).map((l: any) => {
      const ch = parseStoredChannel(l.enrolment_channel, l.program_name);
      return {
        _key: uid(),
        activity_date: l.activity_date?.slice?.(0, 10) ?? "",
        category: l.category ?? "enrolment",
        enrolment_channel: ch.enrolment_channel,
        enrolment_type: l.enrolment_type
          || (ch.program_name && ENROLMENT_RENEWABLE_PROGRAM_LABELS.has(ch.program_name) ? "Renewal" : "")
          || (ch.enrolment_channel === "NHIA" && ch.program_name ? "Non-renewal" : ""),
        program_name: ch.program_name,
        enrolment_category: l.enrolment_category ?? "",
        beneficiary_category: l.beneficiary_category ?? "",
        funding_option: l.funding_option ?? "",
        activity_budget: numStr(l.activity_budget),
        approved_amount: numStr(l.approved_amount),
        enrolment_count: numStr(l.enrolment_count),
        enrollees_validated: numStr(l.enrollees_validated),
        activity_status: l.activity_status ?? "",
        remarks: l.remarks ?? "",
      };
    });
    linesRef.current = next;
    setLines(next);
  };

  const resetEntry = () => {
    setEntry(fresh());
    setEditingKey(null);
  };

  const saveLine = (): boolean => {
    if (!entry.category) { toast.error("Select an enrolment activity"); return false; }
    if (!entry.activity_date) { toast.error("Enter the enrolment date"); return false; }
    if (!entry.activity_status) { toast.error("Select the activity status"); return false; }
    const clean: Entry = isBudgeted ? entry : { ...entry, activity_budget: "", approved_amount: "" };
    const next = editingKey
      ? linesRef.current.map((l) => (l._key === editingKey ? { ...clean, _key: editingKey } : l))
      : [...linesRef.current, { ...clean, _key: uid() }];
    linesRef.current = next;
    setLines(next);
    resetEntry();
    return true;
  };

  const editLine = (key: string) => {
    const l = lines.find((x) => x._key === key);
    if (!l) return;
    const { _key, ...rest } = l;
    setEntry(rest);
    setEditingKey(key);
  };

  const entryInProgress = !!(entry.activity_date || entry.activity_status || entry.enrolment_count || entry.program_name);

  return (
    <StateOfficeFormShell
      reportType="enrolment"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle="Enrolment Activity Reporting"
      hideFooterActions
      onLoaded={loadData}
      validate={() => (linesRef.current.length === 0 ? "Add at least one enrolment activity" : null)}
      buildPayload={(base) => ({
        ...base,
        lines: linesRef.current.map(({ _key, ...l }) => {
          const act = ENROLMENT_ACTIVITIES.find((a) => a.value === l.category);
          const prog = ENROLMENT_PROGRAMS.find((p) => p.label === l.program_name);
          return {
            category: l.category,
            activity_code: act?.code ?? null,
            activity_date: l.activity_date || null,
            enrolment_channel: l.enrolment_channel || null,
            enrolment_type: l.enrolment_type || null,
            program_code: prog?.code ?? null,
            program_name: l.program_name || null,
            enrolment_category: l.enrolment_category || null,
            beneficiary_category: l.beneficiary_category || null,
            funding_option: l.funding_option || null,
            activity_budget: numOrNull(l.activity_budget),
            approved_amount: numOrNull(l.approved_amount),
            enrolment_count: Number(l.enrolment_count) || 0,
            enrollees_validated: numOrNull(l.enrollees_validated),
            activity_status: l.activity_status || null,
            remarks: l.remarks || null,
          };
        }),
      })}
    >
      {({ submitting, persist, requestSubmit }) => (
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Enrolment Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Enrolment Activity *</Label>
                  <Select value={entry.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger displayValue={activityLabel || "Select activity"}>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_ACTIVITIES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Enrolment Date *</Label>
                  <Input type="date" value={entry.activity_date} onChange={(e) => set("activity_date", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Enrolment Channel</Label>
                  <Select
                    value={entry.enrolment_channel}
                    onValueChange={(v) => setEntry((p) => ({
                      ...p,
                      enrolment_channel: v,
                      enrolment_type: "",
                      program_name: "",
                      enrolment_category: "",
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Enrolment Type</Label>
                  <Select
                    value={entry.enrolment_type}
                    onValueChange={(v) => setEntry((p) => ({ ...p, enrolment_type: v, program_name: "", enrolment_category: "" }))}
                    disabled={!entry.enrolment_channel || entry.enrolment_channel === "SSHIA"}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !entry.enrolment_channel
                            ? "Select channel first"
                            : entry.enrolment_channel === "SSHIA"
                              ? "Not required for SSHIA"
                              : "Select type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Program</Label>
                  <Select
                    value={entry.program_name}
                    onValueChange={(v) => setEntry((p) => ({ ...p, program_name: v, enrolment_category: "" }))}
                    disabled={
                      !entry.enrolment_channel
                      || (entry.enrolment_channel === "NHIA" && !entry.enrolment_type)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !entry.enrolment_channel
                            ? "Select channel first"
                            : entry.enrolment_channel === "NHIA" && !entry.enrolment_type
                              ? "Select enrolment type first"
                              : "Select program"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {programOptions.map((p) => (
                        <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Mode of Registration</Label>
                  <Select
                    value={entry.enrolment_category}
                    onValueChange={(v) => set("enrolment_category", v)}
                    disabled={!entry.program_name}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={entry.program_name ? "Select mode" : "Select program first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_MODES_OF_REGISTRATION.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Beneficiary Category</Label>
                  <Select value={entry.beneficiary_category} onValueChange={(v) => set("beneficiary_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_BENEFICIARY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Funding Option</Label>
                  <Select value={entry.funding_option} onValueChange={(v) => set("funding_option", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_FUNDING_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {isBudgeted && (
                  <>
                    <div className="space-y-1">
                      <Label>Activity Budget (₦)</Label>
                      <Input type="number" min={0} value={entry.activity_budget} onChange={(e) => set("activity_budget", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Approved Amount (₦)</Label>
                      <Input type="number" min={0} value={entry.approved_amount} onChange={(e) => set("approved_amount", e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label>Number Enrolled / Beneficiaries</Label>
                  <Input type="number" min={0} value={entry.enrolment_count} onChange={(e) => set("enrolment_count", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Number of Enrolees Validated</Label>
                  <Input type="number" min={0} value={entry.enrollees_validated} onChange={(e) => set("enrollees_validated", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Activity Status *</Label>
                  <Select value={entry.activity_status} onValueChange={(v) => set("activity_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {ENROLMENT_ACTIVITY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                        {["Date", "Activity", "Channel", "Program", "Enrolled", "Validated", "Status", ""].map((h) => (
                          <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => {
                        const act = ENROLMENT_ACTIVITIES.find((a) => a.value === l.category);
                        return (
                          <TableRow key={l._key} className={editingKey === l._key ? "bg-amber-50" : undefined}>
                            <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">{act?.label || l.category}</TableCell>
                            <TableCell className="text-xs">{l.enrolment_channel || "—"}</TableCell>
                            <TableCell className="text-xs">{l.program_name || "—"}</TableCell>
                            <TableCell className="text-sm">{l.enrolment_count || "0"}</TableCell>
                            <TableCell className="text-sm">{l.enrollees_validated || "—"}</TableCell>
                            <TableCell className="text-xs">{l.activity_status || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]" onClick={() => editLine(l._key)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                                onClick={() => {
                                  const next = linesRef.current.filter((x) => x._key !== l._key);
                                  linesRef.current = next;
                                  setLines(next);
                                }}
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

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingKey && <Button variant="outline" onClick={resetEntry}>Cancel edit</Button>}
                {editingKey || (entryInProgress && lines.length > 0) ? (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => { if (saveLine()) toast.success(editingKey ? "Activity updated" : "Activity added"); }}
                  >
                    <Plus className="w-4 h-4" /> {editingKey ? "Update activity" : "Add activity"}
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
        </div>
      )}
    </StateOfficeFormShell>
  );
}
