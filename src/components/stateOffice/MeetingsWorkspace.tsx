import * as React from "react";
import { ArrowLeft, ArrowRight, Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageLayout from "../PageLayout";
import { meetingsApi as api } from "@/lib/api";
import { Field, FieldSection } from "./EnrolmentActivityForm";
import { useListSearch } from "./useListSearch";
import { MONTHS, monthLabel } from "./constants";

const inputClass = "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25";
const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const uid = () => Math.random().toString(36).slice(2);
const STATUSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  submitted: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
const ITEM_STATUS_TONE: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "No longer Applicable": "bg-slate-100 text-slate-600 border-slate-200",
};

type Catalogue = {
  meeting_types: string[]; item_statuses: string[]; decision_statuses: string[];
  yn: string[]; venues: string[]; etmc_sessions: string[];
  departments: { department_code: string; description: string }[];
  states: { code: string; description: string; zonal_code: string }[];
  zones: { zonal_code: string; description: string }[];
  default_state: string | null; default_zone: string | null;
  permissions: { user_id?: number; create: boolean; review: boolean; assign: boolean; national: boolean };
};

function Dropdown({ value, options, onChange, disabled, placeholder = "Select" }: {
  value: string; options: (string | { value: string; label: string })[];
  onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger displayValue={items.find((o) => o.value === value)?.label}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{items.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}
function ReviewRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="space-y-0.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
}
function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">{title}</h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">{items}</div>
    </section>
  );
}
function ItemsTable({ rows, kind, cat, onEdit, onRemove }: { rows: any[]; kind: string; cat: Catalogue | null; onEdit?: (r: any) => void; onRemove?: (r: any) => void }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-[#d4e8dc]"><Table>
      <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
        {(kind === "agenda" ? ["#", "Agenda / Subject", "Key issue", "Outcome", "Further action", ""]
        : kind === "decision" ? ["Ref", "Decision", "Action point", "Responsible", "Deadline", "Status", ""]
        : ["Action point", "Officer", "Due", "Progress", "Status", ""]).map((h) => <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>{rows.map((r, i) => (
        <TableRow key={r.item_id || r._key || i} className="border-b border-[#e8f3ec] last:border-0">
          {kind === "agenda" && <>
            <TableCell className="text-xs tabular-nums">{i + 1}</TableCell>
            <TableCell className="text-sm font-medium">{r.subject || "—"}</TableCell>
            <TableCell className="text-xs max-w-[220px] truncate">{r.detail || "—"}</TableCell>
            <TableCell className="text-xs max-w-[220px] truncate">{r.outcome || "—"}</TableCell>
            <TableCell className="text-xs">{r.requires_action || "—"}</TableCell>
          </>}
          {kind === "decision" && <>
            <TableCell className="text-xs font-mono whitespace-nowrap">{r.action_ref || "—"}</TableCell>
            <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.subject || "—"}</TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{r.detail || "—"}</TableCell>
            <TableCell className="text-xs">{r.responsible_officer || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{r.due_date || "—"}</TableCell>
            <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${ITEM_STATUS_TONE[r.status] || ITEM_STATUS_TONE.Pending}`}>{r.status || "Pending"}</Badge></TableCell>
          </>}
          {kind === "followup" && <>
            <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.subject || "—"}</TableCell>
            <TableCell className="text-xs">{r.responsible_officer || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{r.due_date || "—"}</TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{r.detail || "—"}</TableCell>
            <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${ITEM_STATUS_TONE[r.status] || ITEM_STATUS_TONE.Pending}`}>{r.status || "Pending"}</Badge></TableCell>
          </>}
          {(onEdit || onRemove) && <TableCell className="whitespace-nowrap text-right">
            {onEdit && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#016630]" onClick={() => onEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>}
            {onRemove && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => onRemove(r)}><Trash2 className="w-3.5 h-3.5" /></Button>}
          </TableCell>}
        </TableRow>))}
      </TableBody></Table></div>
  );
}

const blankAgenda = () => ({ subject: "", detail: "", outcome: "", requires_action: "No" });
const blankDecision = () => ({ subject: "", detail: "", responsible_officer: "", due_date: "", expected_output: "", status: "Pending" });
const blankFollowup = () => ({ subject: "", responsible_officer: "", due_date: "", detail: "", status: "Pending", remarks: "", parent_item_id: "" });
const blankMeeting = (cat: Catalogue | null) => ({
  state_code: cat?.default_state || "", reporting_year: new Date().getFullYear(), reporting_month: new Date().getMonth() + 1,
  meeting_date: "", meeting_type: "Monthly Meeting", other_meeting_type: "", purpose: "", presiding_officer: "",
  venue: "Physical", staff_strength: "", attendees: "",
  eff_prev_reviewed: "", eff_issues_discussed: "", eff_decisions_documented: "", eff_officers_assigned: "",
  eff_deadlines_assigned: "", eff_escalations_identified: "", eff_attendance_adequate: "",
  prepared_by: "", designation: "", submission_date: new Date().toISOString().slice(0, 10),
  agenda_items: [] as any[], decisions: [] as any[], followups: [] as any[],
});
const blankEtmc = (cat: Catalogue | null) => ({
  state_code: cat?.default_state || "", reporting_year: new Date().getFullYear(), reporting_month: new Date().getMonth() + 1,
  submission_date: new Date().toISOString().slice(0, 10),
  etmc_meeting_date: "", cascade_session_date: "", etmc_session: "Q1", presiding_officer: "", venue: "Physical",
  staff_strength: "", staff_present: "",
  ev_attendance_list: "", ev_minutes: "", ev_presentation: "", ev_photographs: "", ev_action_tracker: "", ev_escalations_documented: "",
  prepared_by: "", designation: "", endorsed_by: "",
  highlights: [] as any[], department_updates: [] as any[], resolutions: [] as any[], comments: [] as any[], feedback: [] as any[],
});

export default function MeetingsWorkspace({ onBack, initialTab = "meetings" }: { onBack: () => void; initialTab?: "meetings" | "etmc" }) {
  const [cat, setCat] = React.useState<Catalogue | null>(null);
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [etmcs, setEtmcs] = React.useState<any[]>([]);
  const [mode, setMode] = React.useState<"meetings" | "etmc" | "meeting-form" | "etmc-form" | "meeting-detail" | "etmc-detail">(initialTab);
  const [step, setStep] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState<any>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<any>(null);
  const [line, setLine] = React.useState<any>(null);
  const [lineKind, setLineKind] = React.useState<string>("");
  const [editingLine, setEditingLine] = React.useState<string | null>(null);
  const { search, setSearch, matchesSearch, searchInput } = useListSearch();
  const permissions = cat?.permissions || { create: false, review: false, assign: false, national: false };

  const run = async <T,>(op: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError("");
    try { return await op(); }
    catch (e: any) { setError(e.message || "Something went wrong"); return undefined; }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    const [m, e] = await Promise.all([api.meetings(), api.etmcList()]);
    setMeetings(m.data); setEtmcs(e.data);
  };
  React.useEffect(() => {
    let dead = false;
    Promise.all([api.catalogue(), api.meetings(), api.etmcList()])
      .then(([c, m, e]) => { if (!dead) { setCat(c.data); setMeetings(m.data); setEtmcs(e.data); } })
      .catch((e) => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);

  const stateName = (code: string) => cat?.states.find((s) => s.code === code)?.description || code;
  const zoneName = (code: string) => cat?.zones.find((z) => z.zonal_code === code)?.description || code;
  const stateZone = (code: string) => cat?.states.find((s) => s.code === code)?.zonal_code || cat?.default_zone || "";
  const rate = (a: any, b: any) => { const s = Number(a), n = Number(b); return s > 0 && !Number.isNaN(n) ? `${Math.round((n / s) * 10000) / 100}%` : "—"; };
  const deptOptions = (cat?.departments || []).map((d) => ({ value: d.description || d.department_code, label: d.description || d.department_code }));

  const openMeetingDetail = (id: string) => run(async () => { setDetail((await api.meeting(id)).data); setMode("meeting-detail"); });
  const openEtmcDetail = (id: string) => run(async () => { setDetail((await api.etmc(id)).data); setMode("etmc-detail"); });
  const transition = (kind: "meeting" | "etmc", id: string, status: string) => run(async () => {
    await (kind === "meeting" ? api.transitionMeeting : api.transitionEtmc)(id, { status });
    await refresh(); if (kind === "meeting") await openMeetingDetail(id); else await openEtmcDetail(id);
    toast.success(`Report ${status}`);
  });

  const startMeetingForm = async (row?: any) => {
    setEditingId(row?.meeting_id || null); setStep(1); setLine(null); setLineKind(""); setEditingLine(null);
    if (row) {
      const res = await api.meeting(row.meeting_id);
      const r = res.data;
      setDraft({
        ...blankMeeting(cat), ...r,
        agenda_items: (r.items || []).filter((i: any) => i.item_kind === "agenda"),
        decisions: (r.items || []).filter((i: any) => i.item_kind === "decision"),
        followups: (r.items || []).filter((i: any) => i.item_kind === "followup"),
      });
    } else {
      setDraft(blankMeeting(cat));
      const open = await run(api.openActionPoints);
      if (open?.data?.length) setDraft((d: any) => ({
        ...d,
        followups: open.data.map((i: any) => ({ ...blankFollowup(), subject: `${i.action_ref || ""} — ${i.subject || ""}`.replace(/^ — /, ""), responsible_officer: i.responsible_officer, due_date: i.due_date, parent_item_id: i.item_id })),
      }));
    }
    setMode("meeting-form");
  };
  const startEtmcForm = (row?: any) => {
    setEditingId(row?.etmc_id || null); setStep(1); setLine(null); setLineKind(""); setEditingLine(null);
    setDraft(row ? { ...blankEtmc(cat), ...row } : blankEtmc(cat));
    setMode("etmc-form");
  };

  const addLine = (listKey: string, blank: () => any) => {
    const entry = { ...(line || blank()), _key: editingLine || uid() };
    const list = [...draft[listKey]];
    const idx = editingLine ? list.findIndex((x) => x._key === editingLine || x.item_id === editingLine) : -1;
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    setDraft((d: any) => ({ ...d, [listKey]: list }));
    setLine(null); setLineKind(""); setEditingLine(null);
  };
  const save = (kind: "meeting" | "etmc", status: string) => run(async () => {
    const payload = { ...draft, status };
    if (kind === "meeting") {
      if (editingId) await api.updateMeeting(editingId, payload); else await api.createMeeting(payload);
    } else {
      if (editingId) await api.updateEtmc(editingId, payload); else await api.createEtmc(payload);
    }
    await refresh(); toast.success(status === "submitted" ? "Report submitted" : "Draft saved"); setMode(kind === "meeting" ? "meetings" : "etmc");
  });

  const meetingRows = meetings.filter((m) => matchesSearch([m, stateName(m.state_code), m.meeting_type]));
  const etmcRows = etmcs.filter((e) => matchesSearch([e, stateName(e.state_code)]));

  const handleBack = () => {
    if (mode.endsWith("-form") || mode.endsWith("-detail")) setMode(mode.startsWith("meeting") ? "meetings" : "etmc");
    else if (mode === "etmc") setMode("meetings");
    else onBack();
  };

  const actions = (
    <>
      {["meetings", "etmc"].includes(mode) && <Button variant="outline" size="sm" className="gap-2 border-[#d4e8dc]" disabled={busy || loading} onClick={() => void run(refresh)}><RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />Refresh</Button>}
      {mode === "meetings" && permissions.create && <Button className={ACTION} disabled={busy} onClick={() => void startMeetingForm()}><Plus className="w-4 h-4" />New Meeting Report</Button>}
      {mode === "etmc" && permissions.create && <Button className={ACTION} disabled={busy} onClick={() => startEtmcForm()}><Plus className="w-4 h-4" />New ETMC Report</Button>}
    </>
  );

  const tabs = ["meetings", "etmc"].includes(mode) ? (
    <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist">
      {[{ key: "meetings", label: "Meeting Reports", count: meetings.length }, { key: "etmc", label: "ETMC Cascading", count: etmcs.length }].map(({ key, label, count }) => (
        <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key as any)}
          className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${mode === key ? "border-[#145c3f] text-[#145c3f]" : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"}`}>
          {label}<span className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${mode === key ? "bg-[#e8f6ee] text-[#145c3f]" : "bg-slate-100 text-slate-500"}`}>{count}</span>
        </button>
      ))}
    </div>
  ) : undefined;
  const steps = (labels: string[], active: number) => (
    <div className="flex items-center gap-0 overflow-x-auto">
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap ${i + 1 === active ? "bg-[#145c3f] text-white" : i + 1 < active ? "bg-[#e8f6ee] text-[#145c3f]" : "bg-slate-100 text-slate-400"}`}>
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i + 1 === active ? "bg-white/20" : i + 1 < active ? "bg-[#d4e8dc]" : "bg-slate-200"}`}>{i + 1}</span>{l}
          </div>
          {i < labels.length - 1 && <div className="w-6 h-px bg-[#d4e8dc] shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );

  /* ── Meeting form ── */
  const meetingForm = draft && mode === "meeting-form" && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      {steps(["Meeting details", "Agenda & decisions", "Review & submit"], step)}
      {step === 1 && <FieldSection title="1. Meeting information">
        <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
        <Field label="Zone"><Input value={zoneName(stateZone(draft.state_code))} readOnly /></Field>
        <Field label="Reporting month" required>
          <Dropdown value={String(draft.reporting_month)} options={MONTHS.map((m: any, i: number) => ({ value: String(i + 1), label: m.label || m }))} onChange={(v) => setDraft((d: any) => ({ ...d, reporting_month: Number(v) }))} />
        </Field>
        <Field label="Year" required><Input type="number" value={draft.reporting_year} onChange={(e) => setDraft((d: any) => ({ ...d, reporting_year: e.target.value }))} /></Field>
        <Field label="Meeting date" required><Input type="date" value={draft.meeting_date} onChange={(e) => setDraft((d: any) => ({ ...d, meeting_date: e.target.value }))} /></Field>
        <Field label="Type of meeting" required><Dropdown value={draft.meeting_type} options={cat?.meeting_types || []} onChange={(v) => setDraft((d: any) => ({ ...d, meeting_type: v }))} /></Field>
        {draft.meeting_type === "Other (Specify)" && <Field label="Specify meeting type" required><Input value={draft.other_meeting_type} onChange={(e) => setDraft((d: any) => ({ ...d, other_meeting_type: e.target.value }))} /></Field>}
        <Field label="Presiding officer"><Input value={draft.presiding_officer} onChange={(e) => setDraft((d: any) => ({ ...d, presiding_officer: e.target.value }))} placeholder="Name / designation" /></Field>
        <Field label="Venue / platform"><Dropdown value={draft.venue} options={cat?.venues || ["Physical", "Virtual"]} onChange={(v) => setDraft((d: any) => ({ ...d, venue: v }))} /></Field>
        <Field label="Staff strength"><Input type="number" value={draft.staff_strength} onChange={(e) => setDraft((d: any) => ({ ...d, staff_strength: e.target.value }))} /></Field>
        <Field label="Number of attendees"><Input type="number" value={draft.attendees} onChange={(e) => setDraft((d: any) => ({ ...d, attendees: e.target.value }))} /></Field>
        <Field label="Attendance rate"><Input value={rate(draft.staff_strength, draft.attendees)} readOnly /></Field>
        <Field label="Purpose / objective" className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={2} value={draft.purpose} onChange={(e) => setDraft((d: any) => ({ ...d, purpose: e.target.value }))} placeholder="Briefly state the purpose of the meeting" /></Field>
      </FieldSection>}
      {step === 2 && <>
        <FieldSection title="2. Key issues discussed">
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <ItemsTable rows={draft.agenda_items} kind="agenda" cat={cat} onRemove={(r) => setDraft((d: any) => ({ ...d, agenda_items: d.agenda_items.filter((x: any) => x !== r) }))} />
            {lineKind === "agenda" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-[#d4e8dc] p-3 bg-[#f8fdfb]">
                <Field label="Agenda / subject" required><Input value={line?.subject || ""} onChange={(e) => setLine((l: any) => ({ ...blankAgenda(), ...l, subject: e.target.value }))} /></Field>
                <Field label="Key issue discussed"><Input value={line?.detail || ""} onChange={(e) => setLine((l: any) => ({ ...blankAgenda(), ...l, detail: e.target.value }))} /></Field>
                <Field label="Key outcome / conclusion"><Input value={line?.outcome || ""} onChange={(e) => setLine((l: any) => ({ ...blankAgenda(), ...l, outcome: e.target.value }))} /></Field>
                <div className="flex items-end gap-2">
                  <Field label="Requires further action?" className="flex-1"><Dropdown value={line?.requires_action || "No"} options={["Yes", "No"]} onChange={(v) => setLine((l: any) => ({ ...blankAgenda(), ...l, requires_action: v }))} /></Field>
                  <Button variant="outline" onClick={() => addLine("agenda_items", blankAgenda)}>{editingLine ? "Update" : "Add"}</Button>
                  <Button variant="ghost" onClick={() => { setLineKind(""); setLine(null); setEditingLine(null); }}>×</Button>
                </div>
              </div>
            ) : <Button variant="outline" className="gap-2" onClick={() => { setLineKind("agenda"); setLine(blankAgenda()); setEditingLine(null); }}><Plus className="w-4 h-4" />Add agenda item</Button>}
          </div>
        </FieldSection>
        <FieldSection title="3. Decisions / resolutions">
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <ItemsTable rows={draft.decisions} kind="decision" cat={cat} onRemove={(r) => setDraft((d: any) => ({ ...d, decisions: d.decisions.filter((x: any) => x !== r) }))} />
            {lineKind === "decision" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-[#d4e8dc] p-3 bg-[#f8fdfb]">
                <Field label="Decision / resolution" required><Input value={line?.subject || ""} onChange={(e) => setLine((l: any) => ({ ...blankDecision(), ...l, subject: e.target.value }))} /></Field>
                <Field label="Action point"><Input value={line?.detail || ""} onChange={(e) => setLine((l: any) => ({ ...blankDecision(), ...l, detail: e.target.value }))} /></Field>
                <Field label="Responsible officer / unit"><Dropdown value={line?.responsible_officer || ""} options={[...deptOptions.map((d) => d.value)]} onChange={(v) => setLine((l: any) => ({ ...blankDecision(), ...l, responsible_officer: v }))} placeholder="Select officer / unit" /></Field>
                <Field label="Deadline"><Input type="date" value={line?.due_date || ""} onChange={(e) => setLine((l: any) => ({ ...blankDecision(), ...l, due_date: e.target.value }))} /></Field>
                <Field label="Expected output"><Input value={line?.expected_output || ""} onChange={(e) => setLine((l: any) => ({ ...blankDecision(), ...l, expected_output: e.target.value }))} /></Field>
                <div className="flex items-end gap-2">
                  <Field label="Status" className="flex-1"><Dropdown value={line?.status || "Pending"} options={cat?.decision_statuses || []} onChange={(v) => setLine((l: any) => ({ ...blankDecision(), ...l, status: v }))} /></Field>
                  <Button variant="outline" onClick={() => addLine("decisions", blankDecision)}>{editingLine ? "Update" : "Add"}</Button>
                  <Button variant="ghost" onClick={() => { setLineKind(""); setLine(null); setEditingLine(null); }}>×</Button>
                </div>
              </div>
            ) : <Button variant="outline" className="gap-2" onClick={() => { setLineKind("decision"); setLine(blankDecision()); setEditingLine(null); }}><Plus className="w-4 h-4" />Add decision / resolution</Button>}
            <p className="text-[11px] text-slate-400">Action point references are generated automatically on save.</p>
          </div>
        </FieldSection>
      </>}
      {step === 3 && <>
        <FieldSection title="4. Follow-up on previous action points">
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <ItemsTable rows={draft.followups} kind="followup" cat={cat} onRemove={(r) => setDraft((d: any) => ({ ...d, followups: d.followups.filter((x: any) => x !== r) }))} />
            {lineKind === "followup" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-[#d4e8dc] p-3 bg-[#f8fdfb]">
                <Field label="Action point" required><Input value={line?.subject || ""} onChange={(e) => setLine((l: any) => ({ ...blankFollowup(), ...l, subject: e.target.value }))} /></Field>
                <Field label="Responsible officer"><Input value={line?.responsible_officer || ""} onChange={(e) => setLine((l: any) => ({ ...blankFollowup(), ...l, responsible_officer: e.target.value }))} /></Field>
                <Field label="Due date"><Input type="date" value={line?.due_date || ""} onChange={(e) => setLine((l: any) => ({ ...blankFollowup(), ...l, due_date: e.target.value }))} /></Field>
                <Field label="Progress / action taken" className="sm:col-span-2"><Input value={line?.detail || ""} onChange={(e) => setLine((l: any) => ({ ...blankFollowup(), ...l, detail: e.target.value }))} /></Field>
                <Field label="Status"><Dropdown value={line?.status || "Pending"} options={cat?.item_statuses || []} onChange={(v) => setLine((l: any) => ({ ...blankFollowup(), ...l, status: v }))} /></Field>
                <Field label="Remarks"><Input value={line?.remarks || ""} onChange={(e) => setLine((l: any) => ({ ...blankFollowup(), ...l, remarks: e.target.value }))} /></Field>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => addLine("followups", blankFollowup)}>{editingLine ? "Update" : "Add"}</Button>
                  <Button variant="ghost" onClick={() => { setLineKind(""); setLine(null); setEditingLine(null); }}>×</Button>
                </div>
              </div>
            ) : <Button variant="outline" className="gap-2" onClick={() => { setLineKind("followup"); setLine(blankFollowup()); setEditingLine(null); }}><Plus className="w-4 h-4" />Add follow-up</Button>}
          </div>
        </FieldSection>
        <FieldSection title="5. Matters requiring Zonal / SDO attention">
          <div className="sm:col-span-2 lg:col-span-3">
            <a href="/zonal/challenges" className="inline-flex items-center gap-2 rounded-lg border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 text-sm font-semibold text-[#145c3f] hover:bg-[#e8f6ee]">
              <FileText className="w-4 h-4" />Open Challenges &amp; Support
            </a>
          </div>
        </FieldSection>
        <FieldSection title="6. Meeting effectiveness">
          {([["eff_prev_reviewed", "Previous action points reviewed"], ["eff_issues_discussed", "Key programme issues discussed"], ["eff_decisions_documented", "Decisions/resolutions documented"], ["eff_officers_assigned", "Responsible officers assigned"], ["eff_deadlines_assigned", "Deadlines assigned"], ["eff_escalations_identified", "Escalation issues identified"], ["eff_attendance_adequate", "Attendance adequate"]] as const).map(([k, label]) => (
            <Field key={k} label={label}><Dropdown value={draft[k]} options={cat?.yn || ["Yes", "No", "Partially"]} onChange={(v) => setDraft((d: any) => ({ ...d, [k]: v }))} /></Field>
          ))}
        </FieldSection>
        <FieldSection title="7. Submission & certification">
          <Field label="Prepared by"><Input value={draft.prepared_by} onChange={(e) => setDraft((d: any) => ({ ...d, prepared_by: e.target.value }))} placeholder="Name" /></Field>
          <Field label="Designation"><Input value={draft.designation} onChange={(e) => setDraft((d: any) => ({ ...d, designation: e.target.value }))} /></Field>
          <Field label="Date"><Input type="date" value={draft.submission_date} onChange={(e) => setDraft((d: any) => ({ ...d, submission_date: e.target.value }))} /></Field>
        </FieldSection>
      </>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => step > 1 ? setStep(step - 1) : setMode("meetings")}><ArrowLeft className="w-4 h-4 mr-2" />{step > 1 ? "Back" : "Cancel"}</Button>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save("meeting", "draft")}>Save Draft</Button>
          {step < 3
            ? <Button className={ACTION} disabled={busy} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="w-4 h-4 ml-1" /></Button>
            : <Button className={ACTION} disabled={busy} onClick={() => void save("meeting", "submitted")}><Send className="w-4 h-4 mr-2" />Submit report</Button>}
        </div>
      </div>
    </CardContent></Card>
  );

  /* ── ETMC form ── */
  const etmcForm = draft && mode === "etmc-form" && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      {steps(["Cascade details", "Entries & certification"], step)}
      {step === 1 && <>
        <FieldSection title="1. Cascade details">
          <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
          <Field label="Zone"><Input value={zoneName(stateZone(draft.state_code))} readOnly /></Field>
          <Field label="Date of submission"><Input type="date" value={draft.submission_date} onChange={(e) => setDraft((d: any) => ({ ...d, submission_date: e.target.value }))} /></Field>
          <Field label="Reporting month" required>
            <Dropdown value={String(draft.reporting_month)} options={MONTHS.map((m: any, i: number) => ({ value: String(i + 1), label: m.label || m }))} onChange={(v) => setDraft((d: any) => ({ ...d, reporting_month: Number(v) }))} />
          </Field>
          <Field label="Year" required><Input type="number" value={draft.reporting_year} onChange={(e) => setDraft((d: any) => ({ ...d, reporting_year: e.target.value }))} /></Field>
          <Field label="ETMC meeting date" required><Input type="date" value={draft.etmc_meeting_date} onChange={(e) => setDraft((d: any) => ({ ...d, etmc_meeting_date: e.target.value }))} /></Field>
          <Field label="Cascade session date"><Input type="date" value={draft.cascade_session_date} onChange={(e) => setDraft((d: any) => ({ ...d, cascade_session_date: e.target.value }))} /></Field>
          <Field label="ETMC session"><Dropdown value={draft.etmc_session} options={cat?.etmc_sessions || ["Q1", "Q2", "Q3", "Q4"]} onChange={(v) => setDraft((d: any) => ({ ...d, etmc_session: v }))} /></Field>
          <Field label="Presiding officer"><Input value={draft.presiding_officer} onChange={(e) => setDraft((d: any) => ({ ...d, presiding_officer: e.target.value }))} placeholder="Name / designation" /></Field>
          <Field label="Venue"><Dropdown value={draft.venue} options={cat?.venues || ["Physical", "Virtual"]} onChange={(v) => setDraft((d: any) => ({ ...d, venue: v }))} /></Field>
          <Field label="Staff strength"><Input type="number" value={draft.staff_strength} onChange={(e) => setDraft((d: any) => ({ ...d, staff_strength: e.target.value }))} /></Field>
          <Field label="Staff present"><Input type="number" value={draft.staff_present} onChange={(e) => setDraft((d: any) => ({ ...d, staff_present: e.target.value }))} /></Field>
          <Field label="Attendance rate"><Input value={rate(draft.staff_strength, draft.staff_present)} readOnly /></Field>
        </FieldSection>
        <FieldSection title="2. ETMC highlights">
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <div className="flex gap-2">
              <Input value={line?.detail || ""} onChange={(e) => setLine((l: any) => ({ detail: e.target.value }))} placeholder="Enter key highlight from the ETMC discussion" />
              <Button variant="outline" className="shrink-0" onClick={() => { if (!line?.detail?.trim()) return; setDraft((d: any) => ({ ...d, highlights: [...d.highlights, { detail: line.detail }] })); setLine(null); }}><Plus className="w-4 h-4 mr-1" />Add highlight</Button>
            </div>
            {draft.highlights.map((h: any, i: number) => (
              <div key={h._key || i} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="text-xs font-bold text-[#145c3f] mt-0.5">{i + 1}.</span>
                <p className="flex-1">{h.detail}</p>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => setDraft((d: any) => ({ ...d, highlights: d.highlights.filter((x: any) => x !== h) }))}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </FieldSection>
      </>}
      {step === 2 && <>
        {(["department_updates", "resolutions", "comments", "feedback"] as const).map((key, i) => {
          const meta = { department_updates: { title: "3. Departmental updates", ph: "Department / unit", ph2: "Update / key information" }, resolutions: { title: "4. Decisions / resolutions / action points", ph: "Decision / resolution", ph2: "Action owner / deadline" }, comments: { title: "5. Staff comments", ph: "Staff name", ph2: "Comment or observation" }, feedback: { title: "6. Feedback to HQ", ph: "Subject", ph2: "Feedback, clarification or issue" } }[key];
          return (
            <FieldSection key={key} title={meta.title}>
              <div className="sm:col-span-2 lg:col-span-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={line?.[`${key}_s`] || ""} onChange={(e) => setLine((l: any) => ({ ...l, [`${key}_s`]: e.target.value }))} placeholder={meta.ph} />
                  <div className="flex gap-2">
                    <Input value={line?.[`${key}_d`] || ""} onChange={(e) => setLine((l: any) => ({ ...l, [`${key}_d`]: e.target.value }))} placeholder={meta.ph2} className="flex-1" />
                    <Button variant="outline" className="shrink-0" onClick={() => { const s = line?.[`${key}_s`], d2 = line?.[`${key}_d`]; if (!s?.trim() && !d2?.trim()) return; setDraft((d: any) => ({ ...d, [key]: [...d[key], { subject: s, detail: key === "resolutions" ? d2 : d2 }] })); setLine((l: any) => ({ ...l, [`${key}_s`]: "", [`${key}_d`]: "" })); }}><Plus className="w-4 h-4 mr-1" />Add</Button>
                  </div>
                </div>
                {draft[key].map((e: any, ix: number) => (
                  <div key={e._key || ix} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="flex-1">{e.subject && <strong className="mr-2">{e.subject}:</strong>}{e.detail}{e.owner_deadline && <em className="text-slate-500"> — {e.owner_deadline}</em>}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => setDraft((d: any) => ({ ...d, [key]: d[key].filter((x: any) => x !== e) }))}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
            </FieldSection>
          );
        })}
        <FieldSection title="7. Supporting evidence checklist">
          {([["ev_attendance_list", "Attendance list"], ["ev_minutes", "Minutes"], ["ev_presentation", "Presentation"], ["ev_photographs", "Photographs"], ["ev_action_tracker", "Action tracker"], ["ev_escalations_documented", "Escalation issues documented"]] as const).map(([k, label]) => (
            <Field key={k} label={label}><Dropdown value={draft[k]} options={["Yes", "No", "N/A"]} onChange={(v) => setDraft((d: any) => ({ ...d, [k]: v }))} /></Field>
          ))}
        </FieldSection>
        <FieldSection title="8. Submission & certification">
          <Field label="Prepared by"><Input value={draft.prepared_by} onChange={(e) => setDraft((d: any) => ({ ...d, prepared_by: e.target.value }))} placeholder="Name" /></Field>
          <Field label="Designation"><Input value={draft.designation} onChange={(e) => setDraft((d: any) => ({ ...d, designation: e.target.value }))} /></Field>
          <Field label="Endorsed by"><Input value={draft.endorsed_by} onChange={(e) => setDraft((d: any) => ({ ...d, endorsed_by: e.target.value }))} placeholder="Endorsing officer" /></Field>
        </FieldSection>
      </>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <Button variant="ghost" disabled={busy} onClick={() => step > 1 ? setStep(step - 1) : setMode("etmc")}><ArrowLeft className="w-4 h-4 mr-2" />{step > 1 ? "Back" : "Cancel"}</Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save("etmc", "draft")}>Save Draft</Button>
          {step < 2
            ? <Button className={ACTION} disabled={busy} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="w-4 h-4 ml-1" /></Button>
            : <Button className={ACTION} disabled={busy} onClick={() => void save("etmc", "submitted")}><Send className="w-4 h-4 mr-2" />Submit report</Button>}
        </div>
      </div>
    </CardContent></Card>
  );

  /* ── Details ── */
  const meetingDetail = detail && mode === "meeting-detail" && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`Meeting report ${detail.meeting_id}`}>
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="Period" value={`${MONTHS[detail.reporting_month - 1]?.label || detail.reporting_month} ${detail.reporting_year}`} />
          <ReviewRow label="Meeting date" value={detail.meeting_date} />
          <ReviewRow label="Type" value={detail.other_meeting_type || detail.meeting_type} />
          <ReviewRow label="Presiding officer" value={detail.presiding_officer} />
          <ReviewRow label="Venue" value={detail.venue} />
          <ReviewRow label="Attendance" value={detail.staff_strength ? `${detail.attendees ?? 0} / ${detail.staff_strength}` : null} />
          <ReviewRow label="Attendance rate" value={detail.attendance_rate != null ? `${detail.attendance_rate}%` : null} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[detail.status]}`}>{detail.status}</Badge>} />
          <ReviewRow label="Prepared by" value={detail.prepared_by} />
          <ReviewRow label="Endorsed by" value={detail.endorsed_by} />
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Purpose" value={detail.purpose} /></div>
        </ReviewSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8f3ec] pt-4">
          {detail.status === "draft" && detail.created_by_user_id === permissions.user_id && <>
            <Button variant="outline" disabled={busy} onClick={() => void startMeetingForm(detail)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "submitted")}><Send className="w-4 h-4 mr-2" />Submit</Button>
          </>}
          {detail.status === "submitted" && permissions.review && <>
            <Button variant="outline" disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "draft")}>Return</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "approved")}><Send className="w-4 h-4 mr-2" />Endorse</Button>
          </>}
        </div>
      </CardContent></Card>
      {(["agenda", "decision", "followup"] as const).map((kind) => {
        const rows = (detail.items || []).filter((i: any) => i.item_kind === kind);
        if (!rows.length) return null;
        const title = kind === "agenda" ? "Key issues discussed" : kind === "decision" ? "Decisions / resolutions" : "Follow-up on previous action points";
        return <Card key={kind} className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">{title} ({rows.length})</CardTitle></CardHeader><CardContent className="p-0"><ItemsTable rows={rows} kind={kind} cat={cat} /></CardContent></Card>;
      })}
      {["eff_prev_reviewed", "eff_issues_discussed", "eff_decisions_documented", "eff_officers_assigned", "eff_deadlines_assigned", "eff_escalations_identified", "eff_attendance_adequate"].some((k) => detail[k]) && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5">
          <ReviewSection title="Meeting effectiveness">
            <ReviewRow label="Prev. action points reviewed" value={detail.eff_prev_reviewed} />
            <ReviewRow label="Issues discussed" value={detail.eff_issues_discussed} />
            <ReviewRow label="Decisions documented" value={detail.eff_decisions_documented} />
            <ReviewRow label="Officers assigned" value={detail.eff_officers_assigned} />
            <ReviewRow label="Deadlines assigned" value={detail.eff_deadlines_assigned} />
            <ReviewRow label="Escalations identified" value={detail.eff_escalations_identified} />
            <ReviewRow label="Attendance adequate" value={detail.eff_attendance_adequate} />
          </ReviewSection>
        </CardContent></Card>
      )}
    </div>
  );

  const etmcDetail = detail && mode === "etmc-detail" && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`ETMC cascading report ${detail.etmc_id}`}>
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="Period" value={`${MONTHS[detail.reporting_month - 1]?.label || detail.reporting_month} ${detail.reporting_year}`} />
          <ReviewRow label="ETMC meeting date" value={detail.etmc_meeting_date} />
          <ReviewRow label="Cascade session date" value={detail.cascade_session_date} />
          <ReviewRow label="ETMC session" value={detail.etmc_session} />
          <ReviewRow label="Presiding officer" value={detail.presiding_officer} />
          <ReviewRow label="Venue" value={detail.venue} />
          <ReviewRow label="Attendance" value={detail.staff_strength ? `${detail.staff_present ?? 0} / ${detail.staff_strength}` : null} />
          <ReviewRow label="Attendance rate" value={detail.attendance_rate != null ? `${detail.attendance_rate}%` : null} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[detail.status]}`}>{detail.status}</Badge>} />
          <ReviewRow label="Prepared by" value={detail.prepared_by} />
          <ReviewRow label="Endorsed by" value={detail.endorsed_by} />
        </ReviewSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8f3ec] pt-4">
          {detail.status === "draft" && detail.created_by_user_id === permissions.user_id && <>
            <Button variant="outline" disabled={busy} onClick={() => startEtmcForm(detail)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "submitted")}><Send className="w-4 h-4 mr-2" />Submit</Button>
          </>}
          {detail.status === "submitted" && permissions.review && <>
            <Button variant="outline" disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "draft")}>Return</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "approved")}><Send className="w-4 h-4 mr-2" />Endorse</Button>
          </>}
        </div>
      </CardContent></Card>
      {(["highlight", "department_update", "resolution", "comment", "feedback"] as const).map((kind) => {
        const rows = (detail.entries || []).filter((e: any) => e.entry_kind === kind);
        if (!rows.length) return null;
        const titles: any = { highlight: "ETMC highlights", department_update: "Departmental updates", resolution: "Decisions / resolutions", comment: "Staff comments", feedback: "Feedback to HQ" };
        return (
          <Card key={kind} className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">{titles[kind]} ({rows.length})</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">{rows.map((e: any) => (
              <div key={e.entry_id} className="rounded-lg bg-slate-50 p-3 text-sm">{e.subject && <strong className="mr-2">{e.subject}:</strong>}{e.detail}{e.owner_deadline && <em className="text-slate-500"> — {e.owner_deadline}</em>}</div>
            ))}</CardContent></Card>
        );
      })}
      {["ev_attendance_list", "ev_minutes", "ev_presentation", "ev_photographs", "ev_action_tracker", "ev_escalations_documented"].some((k) => detail[k]) && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5">
          <ReviewSection title="Supporting evidence checklist">
            <ReviewRow label="Attendance list" value={detail.ev_attendance_list} />
            <ReviewRow label="Minutes" value={detail.ev_minutes} />
            <ReviewRow label="Presentation" value={detail.ev_presentation} />
            <ReviewRow label="Photographs" value={detail.ev_photographs} />
            <ReviewRow label="Action tracker" value={detail.ev_action_tracker} />
            <ReviewRow label="Escalations documented" value={detail.ev_escalations_documented} />
          </ReviewSection>
        </CardContent></Card>
      )}
    </div>
  );

  return (
    <PageLayout
      title={
        mode === "meeting-form" ? (editingId ? "Edit Meeting Report" : "New Meeting Report")
        : mode === "etmc-form" ? (editingId ? "Edit ETMC Cascading Report" : "New ETMC Cascading Report")
        : mode === "meeting-detail" ? `Meeting Report ${detail?.meeting_id || ""}`
        : mode === "etmc-detail" ? `ETMC Cascading Report ${detail?.etmc_id || ""}`
        : "Meetings & Coordination"
      }
      onBack={(mode.endsWith("-form") || mode.endsWith("-detail")) ? handleBack : undefined}
      actions={actions}
      filters={tabs}
      loading={loading}
      error={error}
      contentClassName="space-y-4 pb-8"
    >
      <div className="w-full space-y-4">
        {mode === "meetings" && <>
          {searchInput}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">Meeting Reports ({meetings.length})</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["Date", "Meeting type", "State", "Period", "Attendance", "Status", ""].map((h) => <TableHead key={h} className={`text-xs font-bold whitespace-nowrap ${h === "" ? "text-right" : ""}`}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{meetingRows.map((m) => (
                <TableRow key={m.meeting_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                  <TableCell className="text-sm whitespace-nowrap">{m.meeting_date}</TableCell>
                  <TableCell className="text-sm font-medium text-[#0f3d2e]">{m.other_meeting_type || m.meeting_type}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{stateName(m.state_code)}</TableCell>
                  <TableCell className="text-sm">{MONTHS[m.reporting_month - 1]?.label || m.reporting_month} {m.reporting_year}</TableCell>
                  <TableCell className="text-sm tabular-nums">{m.attendance_rate != null ? `${m.attendance_rate}%` : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[m.status]}`}>{m.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" disabled={busy} onClick={() => void openMeetingDetail(m.meeting_id)}><Eye className="w-3.5 h-3.5" />View</Button></TableCell>
                </TableRow>))}
              </TableBody></Table></div>
              {!meetingRows.length && <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400"><FileText className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No meeting reports yet.</p>{permissions.create && <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => void startMeetingForm()}><Plus className="w-4 h-4" />New Meeting Report</Button>}</div>}
            </CardContent></Card>
        </>}
        {mode === "etmc" && <>
          {searchInput}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">ETMC Cascading Reports ({etmcs.length})</CardTitle></CardHeader>
            <CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["ETMC date", "Session", "State", "Period", "Attendance", "Status", ""].map((h) => <TableHead key={h} className={`text-xs font-bold whitespace-nowrap ${h === "" ? "text-right" : ""}`}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{etmcRows.map((e) => (
                <TableRow key={e.etmc_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                  <TableCell className="text-sm whitespace-nowrap">{e.etmc_meeting_date}</TableCell>
                  <TableCell className="text-sm font-medium">{e.etmc_session || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{stateName(e.state_code)}</TableCell>
                  <TableCell className="text-sm">{MONTHS[e.reporting_month - 1]?.label || e.reporting_month} {e.reporting_year}</TableCell>
                  <TableCell className="text-sm tabular-nums">{e.attendance_rate != null ? `${e.attendance_rate}%` : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[e.status]}`}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" disabled={busy} onClick={() => void openEtmcDetail(e.etmc_id)}><Eye className="w-3.5 h-3.5" />View</Button></TableCell>
                </TableRow>))}
              </TableBody></Table></div>
              {!etmcRows.length && <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400"><FileText className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No ETMC reports yet.</p>{permissions.create && <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => startEtmcForm()}><Plus className="w-4 h-4" />New ETMC Report</Button>}</div>}
            </CardContent></Card>
        </>}
        {meetingForm}
        {etmcForm}
        {meetingDetail}
        {etmcDetail}
      </div>
    </PageLayout>
  );
}
