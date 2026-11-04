import * as React from "react";
import {
  ArrowLeft, ArrowRight, ClipboardList, Eye, FileText, Loader2, Pencil, Plus, RefreshCw, Send, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFileUrl, meetingsApi as api } from "@/lib/api";
import { Field, FieldSection } from "./EnrolmentActivityForm";
import StateOfficeFormSteps from "./StateOfficeFormSteps";
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
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const quarterFromMonth = (m: number | string) => QUARTERS[Math.min(3, Math.floor(((Number(m) || 1) - 1) / 3))] || "Q1";

const MEETING_STEPS = [
  { id: "info", label: "Meeting information" },
  { id: "agenda", label: "Agenda & decisions" },
  { id: "submit", label: "Follow-up & submit" },
];
const ETMC_STEPS = [
  { id: "cascade", label: "Cascade details" },
  { id: "entries", label: "Updates & feedback" },
  { id: "certify", label: "Evidence & submit" },
];

type Catalogue = {
  meeting_types: string[]; item_statuses: string[]; decision_statuses: string[];
  yn: string[]; venues: string[]; etmc_sessions: string[];
  departments: { department_code: string; description: string }[];
  states: { code: string; description: string; zonal_code: string }[];
  zones: { zonal_code: string; description: string }[];
  default_state: string | null; default_zone: string | null;
  role_label?: string; user_name?: string;
  permissions: { user_id?: number; create: boolean; review: boolean; assign: boolean; national: boolean };
};
type TabKey = "meetings" | "etmc";
type Mode = "list" | "meeting-form" | "etmc-form" | "meeting-detail" | "etmc-detail";

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
function AutoField({ value }: { value: string }) {
  return (
    <div className="relative">
      <Input value={value} readOnly className="pr-14 bg-[#eef6f1]" />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-[#145c3f] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AUTO</span>
    </div>
  );
}
function RadioYesNo({ name, value, options, onChange }: { name: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-4 pt-1" role="radiogroup" aria-label={name}>
      {options.map((opt) => (
        <label key={opt} className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700">
          <input
            type="radio"
            className="h-4 w-4 accent-[#145c3f]"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}
function ItemsTable({ rows, kind, onEdit, onRemove }: { rows: any[]; kind: string; onEdit?: (r: any) => void; onRemove?: (r: any) => void }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-[#d4e8dc]"><Table>
      <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
        {(kind === "agenda" ? ["#", "Agenda / Subject", "Key issue", "Outcome", "Further action", ""]
        : kind === "decision" ? ["Decision", "Responsible", "Deadline", "Expected output", "Status", ""]
        : ["Action point", "Officer", "Due", "Progress", "Status", "Remarks", ""]).map((h) => <TableHead key={h} className="text-xs font-bold whitespace-nowrap">{h}</TableHead>)}
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
            <TableCell className="text-sm font-medium max-w-[240px] truncate">{r.subject || "—"}</TableCell>
            <TableCell className="text-xs">{r.responsible_officer || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{r.due_date || "—"}</TableCell>
            <TableCell className="text-xs max-w-[160px] truncate">{r.expected_output || "—"}</TableCell>
            <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${ITEM_STATUS_TONE[r.status] || ITEM_STATUS_TONE.Pending}`}>{r.status || "Pending"}</Badge></TableCell>
          </>}
          {kind === "followup" && <>
            <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.subject || "—"}</TableCell>
            <TableCell className="text-xs">{r.responsible_officer || "—"}</TableCell>
            <TableCell className="text-xs whitespace-nowrap">{r.due_date || "—"}</TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{r.detail || "—"}</TableCell>
            <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${ITEM_STATUS_TONE[r.status] || ITEM_STATUS_TONE.Pending}`}>{r.status || "Pending"}</Badge></TableCell>
            <TableCell className="text-xs max-w-[140px] truncate">{r.remarks || "—"}</TableCell>
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
const blankDecision = () => ({ subject: "", detail: "", responsible_officer: "", due_date: "", expected_output: "", status: "Pending", action_ref: "" });
const blankFollowup = () => ({ subject: "", responsible_officer: "", due_date: "", detail: "", status: "Pending", remarks: "", parent_item_id: "" });
const blankMeeting = (cat: Catalogue | null) => ({
  state_code: cat?.default_state || "", reporting_year: new Date().getFullYear(), reporting_month: new Date().getMonth() + 1,
  meeting_date: "", meeting_type: "Monthly Meeting", other_meeting_type: "", purpose: "", presiding_officer: "",
  venue: "Physical", staff_strength: "", attendees: "",
  eff_prev_reviewed: "", eff_issues_discussed: "", eff_decisions_documented: "", eff_officers_assigned: "",
  eff_deadlines_assigned: "", eff_escalations_identified: "", eff_attendance_adequate: "",
  prepared_by: cat?.user_name || "", designation: cat?.role_label || "", submission_date: new Date().toISOString().slice(0, 10),
  endorsed_by: "", documents: [] as any[],
  agenda_items: [] as any[], decisions: [] as any[], followups: [] as any[],
});
const blankEtmc = (cat: Catalogue | null) => ({
  state_code: cat?.default_state || "", reporting_year: new Date().getFullYear(), reporting_month: new Date().getMonth() + 1,
  submission_date: new Date().toISOString().slice(0, 10),
  etmc_meeting_date: "", cascade_session_date: "", etmc_session: "Q1", presiding_officer: "", venue: "Physical",
  staff_strength: "", staff_present: "",
  ev_attendance_list: "", ev_minutes: "", ev_presentation: "", ev_photographs: "", ev_action_tracker: "", ev_escalations_documented: "",
  prepared_by: cat?.user_name || "", designation: cat?.role_label || "", endorsed_by: "",
  highlights: [] as any[], department_updates: [] as any[], resolutions: [] as any[], comments: [] as any[], feedback: [] as any[],
});

export default function MeetingsWorkspace({ onBack, initialTab = "meetings" }: { onBack: () => void; initialTab?: "meetings" | "etmc" }) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const [cat, setCat] = React.useState<Catalogue | null>(null);
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [etmcs, setEtmcs] = React.useState<any[]>([]);
  const [tab, setTab] = React.useState<TabKey>(initialTab === "etmc" ? "etmc" : "meetings");
  const [mode, setMode] = React.useState<Mode>("list");
  const [step, setStep] = React.useState(0);
  const [maxStep, setMaxStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState<any>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<any>(null);
  const [line, setLine] = React.useState<any>(null);
  const [lineKind, setLineKind] = React.useState("");
  const [editingLine, setEditingLine] = React.useState<string | null>(null);
  const [agendaForm, setAgendaForm] = React.useState(blankAgenda());
  const [decisionForm, setDecisionForm] = React.useState(blankDecision());
  const [followupForm, setFollowupForm] = React.useState(blankFollowup());
  const [openActionCount, setOpenActionCount] = React.useState(0);
  const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);
  const [evidenceInputKey, setEvidenceInputKey] = React.useState(0);
  const clearEvidenceSelection = () => {
    setEvidenceFiles([]);
    setEvidenceInputKey((k) => k + 1);
  };
  const { matchesSearch, searchInput } = useListSearch();
  const permissions = cat?.permissions || { create: false, review: false, assign: false, national: false };

  const run = async <T,>(op: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError("");
    try { return await op(); }
    catch (e: any) { const msg = e.message || "Something went wrong"; setError(msg); toast.error(msg); return undefined; }
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
  const deptOptions = (cat?.departments || []).map((d) => d.description || d.department_code);

  const backToList = () => {
    setMode("list"); setDraft(null); setDetail(null); setStep(0); setMaxStep(0);
    setLine(null); setLineKind(""); clearEvidenceSelection();
    setAgendaForm(blankAgenda()); setDecisionForm(blankDecision()); setFollowupForm(blankFollowup());
  };
  const validateMeetingStep = (from: number): string | null => {
    if (!draft) return "Form is not ready";
    if (from === 0) {
      if (!draft.reporting_month) return "Select reporting month";
      if (!draft.reporting_year) return "Enter reporting year";
      if (!String(draft.meeting_date || "").trim()) return "Enter meeting date";
      if (!String(draft.meeting_type || "").trim()) return "Select type of meeting";
      if (draft.meeting_type === "Other (Specify)" && !String(draft.other_meeting_type || "").trim()) return "Specify the meeting type";
      if (!String(draft.state_code || "").trim()) return "State is required";
    }
    if (from === 1) {
      const agendas = (draft.agenda_items || []).filter((r: any) => r.subject?.trim() || r.detail?.trim() || r.outcome?.trim());
      if (!agendas.length) return "Add at least one agenda item before continuing";
      if (agendas.some((r: any) => !String(r.subject || "").trim())) return "Each agenda item needs an Agenda / subject";
      const decisions = (draft.decisions || []).filter((r: any) => r.subject?.trim() || r.detail?.trim());
      if (!decisions.length) return "Add at least one decision / resolution before continuing";
      if (decisions.some((r: any) => !String(r.subject || "").trim())) return "Each decision needs a Decision / resolution";
    }
    return null;
  };
  const validateEtmcStep = (from: number): string | null => {
    if (!draft) return "Form is not ready";
    if (from === 0) {
      if (!draft.reporting_month) return "Select reporting month";
      if (!draft.reporting_year) return "Enter reporting year";
      if (!String(draft.etmc_meeting_date || "").trim()) return "Enter ETMC meeting date";
      if (!String(draft.state_code || "").trim()) return "State is required";
    }
    return null;
  };
  const goStep = (next: number, opts?: { skipValidate?: boolean }) => {
    if (next > step && !opts?.skipValidate) {
      const err = mode === "meeting-form" ? validateMeetingStep(step)
        : mode === "etmc-form" ? validateEtmcStep(step)
        : null;
      if (err) { toast.error(err); setError(err); return; }
    }
    setError("");
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
  };
  const continueMeeting = () => goStep(step + 1);
  const continueEtmc = () => goStep(step + 1);
  const pushAgendaFromForm = () => {
    const row = { ...blankAgenda(), ...agendaForm, _key: uid() };
    if (!row.subject?.trim() && !row.detail?.trim() && !row.outcome?.trim()) {
      toast.error("Enter at least an agenda subject or key issue");
      return;
    }
    setDraft((d: any) => ({ ...d, agenda_items: [...(d.agenda_items || []), row] }));
    setAgendaForm(blankAgenda());
  };
  const pushDecisionFromForm = () => {
    const row = { ...blankDecision(), ...decisionForm, _key: uid() };
    if (!row.subject?.trim() && !row.detail?.trim()) {
      toast.error("Enter at least a decision or action point");
      return;
    }
    setDraft((d: any) => ({ ...d, decisions: [...(d.decisions || []), row] }));
    setDecisionForm(blankDecision());
  };
  const pushFollowupFromForm = () => {
    const row = { ...blankFollowup(), ...followupForm, _key: uid() };
    if (!row.subject?.trim() && !row.detail?.trim()) {
      toast.error("Enter at least an action point or progress update");
      return;
    }
    setDraft((d: any) => ({ ...d, followups: [...(d.followups || []), row] }));
    setFollowupForm(blankFollowup());
  };

  const openMeetingDetail = (id: string) => run(async () => { setDetail((await api.meeting(id)).data); setMode("meeting-detail"); });
  const openEtmcDetail = (id: string) => run(async () => { setDetail((await api.etmc(id)).data); setMode("etmc-detail"); });
  const transition = (kind: "meeting" | "etmc", id: string, status: string) => run(async () => {
    await (kind === "meeting" ? api.transitionMeeting : api.transitionEtmc)(id, { status });
    await refresh();
    if (kind === "meeting") await openMeetingDetail(id); else await openEtmcDetail(id);
    toast.success(status === "approved" ? "Report endorsed" : `Report ${status}`);
  });

  const startMeetingForm = async (row?: any) => {
    setEditingId(row?.meeting_id || null); setStep(0); setMaxStep(0); setLine(null); setLineKind(""); setEditingLine(null);
    setAgendaForm(blankAgenda()); setDecisionForm(blankDecision()); setFollowupForm(blankFollowup());
    clearEvidenceSelection();
    if (row) {
      const r = (await api.meeting(row.meeting_id)).data;
      setDraft({
        ...blankMeeting(cat), ...r,
        documents: r.documents || [],
        agenda_items: (r.items || []).filter((i: any) => i.item_kind === "agenda"),
        decisions: (r.items || []).filter((i: any) => i.item_kind === "decision"),
        followups: (r.items || []).filter((i: any) => i.item_kind === "followup"),
      });
      setOpenActionCount(0);
    } else {
      setDraft(blankMeeting(cat));
      const open = await run(api.openActionPoints);
      const rows = open?.data || [];
      setOpenActionCount(rows.length);
      if (rows.length) setDraft((d: any) => ({
        ...d,
        followups: rows.map((i: any) => ({
          ...blankFollowup(),
          subject: `${i.action_ref || ""} — ${i.subject || ""}`.replace(/^ — /, ""),
          responsible_officer: i.responsible_officer,
          due_date: i.due_date,
          parent_item_id: i.item_id,
        })),
      }));
    }
    setMode("meeting-form");
  };
  const startEtmcForm = async (row?: any) => {
    setEditingId(row?.etmc_id || null); setStep(0); setMaxStep(0); setLine(null); setLineKind(""); setEditingLine(null);
    if (row) {
      const r = (await api.etmc(row.etmc_id)).data;
      const entries = r.entries || [];
      setDraft({
        ...blankEtmc(cat), ...r,
        highlights: entries.filter((e: any) => e.entry_kind === "highlight"),
        department_updates: entries.filter((e: any) => e.entry_kind === "department_update"),
        resolutions: entries.filter((e: any) => e.entry_kind === "resolution"),
        comments: entries.filter((e: any) => e.entry_kind === "comment"),
        feedback: entries.filter((e: any) => e.entry_kind === "feedback"),
      });
    } else setDraft(blankEtmc(cat));
    setMode("etmc-form");
  };

  const addLine = (listKey: string, blank: () => any) => {
    const entry = { ...(line || blank()), _key: editingLine || uid() };
    const list = [...draft[listKey]];
    const idx = editingLine ? list.findIndex((x: any) => x._key === editingLine || x.item_id === editingLine) : -1;
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    setDraft((d: any) => ({ ...d, [listKey]: list }));
    setLine(null); setLineKind(""); setEditingLine(null);
  };
  const preparedFallback = cat?.user_name || authUser?.name || "";
  const save = (kind: "meeting" | "etmc", status: string) => run(async () => {
    if (status === "submitted") {
      if (kind === "meeting") {
        for (const s of [0, 1]) {
          const err = validateMeetingStep(s);
          if (err) throw new Error(err);
        }
        if (openActionCount > 0 && !(draft.followups || []).length) {
          throw new Error("Record follow-up on previous meeting action points before submitting");
        }
        if (!String(draft.prepared_by || preparedFallback || "").trim()) throw new Error("Enter prepared by");
        if (!String(draft.submission_date || "").trim()) throw new Error("Enter submission date");
      } else {
        const err = validateEtmcStep(0);
        if (err) throw new Error(err);
        if (!String(draft.prepared_by || preparedFallback || "").trim()) throw new Error("Enter prepared by");
        if (!String(draft.submission_date || "").trim()) throw new Error("Enter submission date");
      }
    }
    const payload = kind === "meeting"
      ? {
          ...draft,
          status,
          agenda_items: (draft.agenda_items || []).filter((r: any) => r.subject?.trim() || r.detail?.trim() || r.outcome?.trim()),
          decisions: (draft.decisions || []).filter((r: any) => r.subject?.trim() || r.detail?.trim()),
        }
      : { ...draft, status };
    if (kind === "meeting") {
      const saved = editingId
        ? await api.updateMeeting(editingId, payload)
        : await api.createMeeting(payload);
      const meetingId = editingId || saved.data?.meeting_id;
      if (meetingId && evidenceFiles.length) {
        await api.uploadMeetingDocuments(meetingId, evidenceFiles);
        clearEvidenceSelection();
      }
    } else {
      if (editingId) await api.updateEtmc(editingId, payload); else await api.createEtmc(payload);
    }
    await refresh();
    toast.success(status === "submitted" ? "Report submitted" : "Draft saved");
    setTab(kind === "meeting" ? "meetings" : "etmc");
    backToList();
  });

  const removeSavedEvidence = (doc: any) => run(async () => {
    if (!editingId) return;
    await api.deleteMeetingDocument(editingId, doc.sn);
    setDraft((d: any) => ({
      ...d,
      documents: (d.documents || []).filter((x: any) => x.sn !== doc.sn),
    }));
    toast.success("Evidence removed");
  });

  const challengeHref = (meetingId?: string) => {
    const q = new URLSearchParams({ from: "meeting", related_activity: "Meetings & Coordination" });
    if (meetingId) q.set("meeting_id", meetingId);
    if (draft?.meeting_type) q.set("note", `Escalated from Meeting Report (${draft.meeting_type})`);
    return `/zonal/challenges?${q.toString()}`;
  };

  const meetingRows = meetings.filter((m) => matchesSearch([m, stateName(m.state_code), m.meeting_type]));
  const etmcRows = etmcs.filter((e) => matchesSearch([e, stateName(e.state_code)]));
  const header = (
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back"
          onClick={() => { if (mode !== "list") backToList(); else onBack(); }}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Meetings &amp; Coordination</h2>
          <p className="text-xs text-slate-500 truncate">
            {mode === "meeting-form" ? "Meeting Report" : mode === "etmc-form" ? "ETMC Cascading Report" : mode.endsWith("-detail") ? "Report detail" : "Meeting reports and ETMC cascading"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mode === "list" && (
          <Button variant="outline" size="sm" className="gap-2 border-[#d4e8dc]" disabled={busy || loading} onClick={() => void run(refresh)}>
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />Refresh
          </Button>
        )}
        {mode === "list" && permissions.create && tab === "meetings" && (
          <Button className={ACTION} disabled={busy} onClick={() => void startMeetingForm()}><Plus className="w-4 h-4" />New Meeting Report</Button>
        )}
        {mode === "list" && permissions.create && tab === "etmc" && (
          <Button className={ACTION} disabled={busy} onClick={() => void startEtmcForm()}><Plus className="w-4 h-4" />New ETMC Report</Button>
        )}
      </div>
    </div>
  );

  const tabs = mode === "list" && (
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
      <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist" aria-label="Meetings templates">
        {([
          { key: "meetings" as const, label: "Meeting Report", icon: ClipboardList, count: meetings.length },
          { key: "etmc" as const, label: "ETMC Cascading Report", icon: FileText, count: etmcs.length },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${tab === key ? "border-[#145c3f] text-[#145c3f]" : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"}`}>
            <Icon className={`h-4 w-4 shrink-0 ${tab === key ? "text-[#145c3f]" : "text-slate-400"}`} strokeWidth={2} />
            <span>{label}</span>
            <span className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${tab === key ? "bg-[#e8f6ee] text-[#145c3f]" : "bg-slate-100 text-slate-500"}`}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Meeting form ── */
  const meetingForm = draft && mode === "meeting-form" && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      <StateOfficeFormSteps steps={MEETING_STEPS} activeIndex={step} maximumIndex={maxStep} onStepChange={(i) => goStep(i)} hideNumbers />
      {step === 0 && <FieldSection title="Meeting information">
        <Field label="Zone"><Input value={zoneName(stateZone(draft.state_code))} readOnly /></Field>
        <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
        <Field label="Reporting month" required>
          <Dropdown value={String(draft.reporting_month)} options={MONTHS.map((m: any, i: number) => ({ value: String(i + 1), label: m.label || m }))} onChange={(v) => setDraft((d: any) => ({ ...d, reporting_month: Number(v) }))} />
        </Field>
        <Field label="Year" required><Input type="number" value={draft.reporting_year} onChange={(e) => setDraft((d: any) => ({ ...d, reporting_year: e.target.value }))} /></Field>
        <Field label="Quarter"><Input value={quarterFromMonth(draft.reporting_month)} readOnly /></Field>
        <Field label="Meeting date" required><Input type="date" value={draft.meeting_date} onChange={(e) => setDraft((d: any) => ({ ...d, meeting_date: e.target.value }))} /></Field>
        <Field label="Type of meeting" required><Dropdown value={draft.meeting_type} options={cat?.meeting_types || []} onChange={(v) => setDraft((d: any) => ({ ...d, meeting_type: v }))} /></Field>
        {draft.meeting_type === "Other (Specify)" && <Field label="Specify meeting type" required><Input value={draft.other_meeting_type} onChange={(e) => setDraft((d: any) => ({ ...d, other_meeting_type: e.target.value }))} /></Field>}
        <Field label="Presiding officer"><Input value={draft.presiding_officer} onChange={(e) => setDraft((d: any) => ({ ...d, presiding_officer: e.target.value }))} placeholder="Name / designation" /></Field>
        <Field label="Venue / platform"><Dropdown value={draft.venue} options={cat?.venues || ["Physical", "Virtual"]} onChange={(v) => setDraft((d: any) => ({ ...d, venue: v }))} /></Field>
        <Field label="Staff strength"><Input type="number" value={draft.staff_strength} onChange={(e) => setDraft((d: any) => ({ ...d, staff_strength: e.target.value }))} placeholder="Number expected" /></Field>
        <Field label="Number of attendees"><Input type="number" value={draft.attendees} onChange={(e) => setDraft((d: any) => ({ ...d, attendees: e.target.value }))} placeholder="Number present" /></Field>
        <Field label="Attendance rate"><AutoField value={rate(draft.staff_strength, draft.attendees)} /></Field>
        <Field label="Purpose / objective" className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={2} value={draft.purpose} onChange={(e) => setDraft((d: any) => ({ ...d, purpose: e.target.value }))} placeholder="Briefly state the purpose of the meeting" /></Field>
      </FieldSection>}
      {step === 1 && <>
        <FieldSection title="Key issue items discussed">
          <div className="sm:col-span-2 lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-3">
              <span className="inline-flex rounded-full bg-[#e8f6ee] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#145c3f]">
                Agenda item {String((draft.agenda_items || []).length + 1).padStart(2, "0")}
              </span>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Agenda / subject" required>
                  <Input value={agendaForm.subject} onChange={(e) => setAgendaForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Enter agenda item" />
                </Field>
                <Field label="Key issue discussed">
                  <Input value={agendaForm.detail} onChange={(e) => setAgendaForm((f) => ({ ...f, detail: e.target.value }))} placeholder="Summarise the key discussion" />
                </Field>
                <Field label="Key outcome / conclusion">
                  <Input value={agendaForm.outcome} onChange={(e) => setAgendaForm((f) => ({ ...f, outcome: e.target.value }))} placeholder="State the outcome" />
                </Field>
                <Field label="Requires further action?">
                  <Dropdown value={agendaForm.requires_action || "No"} options={["Yes", "No"]} onChange={(v) => setAgendaForm((f) => ({ ...f, requires_action: v }))} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button className={ACTION} onClick={pushAgendaFromForm}><Plus className="w-4 h-4" />Add agenda item</Button>
              </div>
            </div>
            {(draft.agenda_items || []).length > 0 && (
              <ItemsTable
                rows={draft.agenda_items}
                kind="agenda"
                onRemove={(r) => setDraft((d: any) => ({ ...d, agenda_items: d.agenda_items.filter((x: any) => x !== r) }))}
              />
            )}
          </div>
        </FieldSection>
        <FieldSection title="Decisions / resolutions">
          <div className="sm:col-span-2 lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Decision / resolution" required>
                  <Input value={decisionForm.subject} onChange={(e) => setDecisionForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Decision summary" />
                </Field>
                <Field label="Responsible officer / unit">
                  <Dropdown value={decisionForm.responsible_officer || ""} options={deptOptions} onChange={(v) => setDecisionForm((f) => ({ ...f, responsible_officer: v }))} placeholder="Select officer / unit" />
                </Field>
                <Field label="Deadline">
                  <Input type="date" value={decisionForm.due_date || ""} onChange={(e) => setDecisionForm((f) => ({ ...f, due_date: e.target.value }))} />
                </Field>
                <Field label="Expected output">
                  <Input value={decisionForm.expected_output || ""} onChange={(e) => setDecisionForm((f) => ({ ...f, expected_output: e.target.value }))} placeholder="Expected result" />
                </Field>
                <Field label="Status">
                  <Dropdown value={decisionForm.status || "Pending"} options={cat?.decision_statuses || ["Pending", "In Progress", "Completed"]} onChange={(v) => setDecisionForm((f) => ({ ...f, status: v }))} />
                </Field>
              </div>
              <p className="text-[11px] text-slate-400">Status options: Pending · In Progress · Completed</p>
              <div className="flex justify-end">
                <Button className={ACTION} onClick={pushDecisionFromForm}><Plus className="w-4 h-4" />Add decision / resolution</Button>
              </div>
            </div>
            {(draft.decisions || []).length > 0 && (
              <ItemsTable
                rows={draft.decisions}
                kind="decision"
                onRemove={(r) => setDraft((d: any) => ({ ...d, decisions: d.decisions.filter((x: any) => x !== r) }))}
              />
            )}
          </div>
        </FieldSection>
      </>}
      {step === 2 && <>
        <FieldSection title="Follow-up on previous action points">
          <div className="sm:col-span-2 lg:col-span-3 space-y-4">
            {openActionCount > 0 && !(draft.followups || []).length && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Previous open action points must be followed up before submit.</p>
            )}
            <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Previous action" required>
                  <Input value={followupForm.subject} onChange={(e) => setFollowupForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Previous action" />
                </Field>
                <Field label="Responsible officer / unit">
                  <Input value={followupForm.responsible_officer} onChange={(e) => setFollowupForm((f) => ({ ...f, responsible_officer: e.target.value }))} placeholder="Officer / unit" />
                </Field>
                <Field label="Due date">
                  <Input type="date" value={followupForm.due_date || ""} onChange={(e) => setFollowupForm((f) => ({ ...f, due_date: e.target.value }))} />
                </Field>
                <Field label="Progress / action taken" className="sm:col-span-2">
                  <Input value={followupForm.detail} onChange={(e) => setFollowupForm((f) => ({ ...f, detail: e.target.value }))} placeholder="Enter progress update" />
                </Field>
                <Field label="Status">
                  <Dropdown value={followupForm.status || "Pending"} options={cat?.item_statuses || ["Pending", "In Progress", "Completed", "No longer Applicable"]} onChange={(v) => setFollowupForm((f) => ({ ...f, status: v }))} />
                </Field>
                <Field label="Remarks">
                  <Input value={followupForm.remarks || ""} onChange={(e) => setFollowupForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Remarks" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button className={ACTION} onClick={pushFollowupFromForm}><Plus className="w-4 h-4" />Add previous action point</Button>
              </div>
            </div>
            {(draft.followups || []).length > 0 && (
              <ItemsTable
                rows={draft.followups}
                kind="followup"
                onRemove={(r) => setDraft((d: any) => ({ ...d, followups: d.followups.filter((x: any) => x !== r) }))}
              />
            )}
          </div>
        </FieldSection>
        <FieldSection title="Matters requiring Zonal / SDO attention">
          <div className="sm:col-span-2 lg:col-span-3">
            <a href={challengeHref(editingId || undefined)} className="inline-flex items-center gap-2 rounded-lg border border-[#d4e8dc] bg-[#f8fdfb] px-4 py-2.5 text-sm font-semibold text-[#145c3f] hover:bg-[#e8f6ee]">
              <FileText className="w-4 h-4" />Open Challenge &amp; Support
            </a>
          </div>
        </FieldSection>
        <FieldSection title="Meeting effectiveness">
          {([["eff_prev_reviewed", "Previous action points reviewed", true], ["eff_decisions_documented", "Decisions documented", false], ["eff_deadlines_assigned", "Deadlines assigned", false], ["eff_attendance_adequate", "Attendance adequate", true], ["eff_issues_discussed", "Key programme issues discussed", true], ["eff_officers_assigned", "Officers assigned to action points", false], ["eff_escalations_identified", "Escalation issues identified", false]] as const).map(([k, label, partial]) => (
            <Field key={k} label={label}>
              <RadioYesNo
                name={k}
                value={draft[k] || ""}
                options={partial ? (cat?.yn || ["Yes", "No", "Partially"]) : ["Yes", "No"]}
                onChange={(v) => setDraft((d: any) => ({ ...d, [k]: v }))}
              />
            </Field>
          ))}
        </FieldSection>
        <FieldSection title="Supporting evidence & certification">
          <Field label="Supporting evidence" className="sm:col-span-2 lg:col-span-3">
            <div className="space-y-2">
              <Input
                key={evidenceInputKey}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
              />
              <p className="text-xs text-slate-500">Upload minutes, attendance sheet, photos, or other evidence (PDF, Word, Excel, or image).</p>
              {(draft.documents || []).length > 0 && (
                <ul className="space-y-1.5">
                  {(draft.documents as any[]).map((doc) => (
                    <li key={`${doc.sn}-${doc.path}`} className="flex items-center gap-2 rounded-lg bg-[#f4f7f5] px-3 py-2 text-sm">
                      <a href={apiFileUrl(doc.path)} target="_blank" rel="noreferrer" className="flex-1 truncate text-[#145c3f] font-medium hover:underline">
                        {doc.name}
                      </a>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => void removeSavedEvidence(doc)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {evidenceFiles.length > 0 && (
                <p className="text-xs text-slate-500">Selected: {evidenceFiles.map((f) => f.name).join(", ")}</p>
              )}
            </div>
          </Field>
          <Field label="Prepared by"><Input value={draft.prepared_by || preparedFallback} onChange={(e) => setDraft((d: any) => ({ ...d, prepared_by: e.target.value }))} /></Field>
          <Field label="Designation"><Input value={draft.designation} onChange={(e) => setDraft((d: any) => ({ ...d, designation: e.target.value }))} /></Field>
          <Field label="Date"><Input type="date" value={draft.submission_date} onChange={(e) => setDraft((d: any) => ({ ...d, submission_date: e.target.value }))} /></Field>
        </FieldSection>
      </>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <Button variant="ghost" disabled={busy} onClick={() => step > 0 ? goStep(step - 1) : backToList()}>
          <ArrowLeft className="w-4 h-4 mr-2" />{step > 0 ? "Back" : "Cancel"}
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save("meeting", "draft")}>Save Draft</Button>
          {step < MEETING_STEPS.length - 1
            ? <Button className={ACTION} disabled={busy} onClick={continueMeeting}>Continue<ArrowRight className="w-4 h-4 ml-1" /></Button>
            : <Button className={ACTION} disabled={busy} onClick={() => void save("meeting", "submitted")}><Send className="w-4 h-4 mr-2" />Submit report</Button>}
        </div>
      </div>
    </CardContent></Card>
  );

  /* ── ETMC form ── */
  const etmcForm = draft && mode === "etmc-form" && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      <StateOfficeFormSteps steps={ETMC_STEPS} activeIndex={step} maximumIndex={maxStep} onStepChange={(i) => goStep(i)} hideNumbers />
      {step === 0 && <>
        <FieldSection title="Cascade details">
          <Field label="Zone"><Input value={zoneName(stateZone(draft.state_code))} readOnly /></Field>
          <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
          <Field label="Date of submission"><Input type="date" value={draft.submission_date} onChange={(e) => setDraft((d: any) => ({ ...d, submission_date: e.target.value }))} /></Field>
          <Field label="Reporting month" required>
            <Dropdown value={String(draft.reporting_month)} options={MONTHS.map((m: any, i: number) => ({ value: String(i + 1), label: m.label || m }))} onChange={(v) => setDraft((d: any) => ({ ...d, reporting_month: Number(v) }))} />
          </Field>
          <Field label="Year" required><Input type="number" value={draft.reporting_year} onChange={(e) => setDraft((d: any) => ({ ...d, reporting_year: e.target.value }))} /></Field>
          <Field label="ETMC meeting date" required><Input type="date" value={draft.etmc_meeting_date} onChange={(e) => setDraft((d: any) => ({ ...d, etmc_meeting_date: e.target.value }))} /></Field>
          <Field label="Cascade session date"><Input type="date" value={draft.cascade_session_date} onChange={(e) => setDraft((d: any) => ({ ...d, cascade_session_date: e.target.value }))} /></Field>
          <Field label="ETMC session"><Dropdown value={draft.etmc_session} options={cat?.etmc_sessions || QUARTERS} onChange={(v) => setDraft((d: any) => ({ ...d, etmc_session: v }))} /></Field>
          <Field label="Presiding officer"><Input value={draft.presiding_officer} onChange={(e) => setDraft((d: any) => ({ ...d, presiding_officer: e.target.value }))} placeholder="Name / designation" /></Field>
          <Field label="Venue"><Dropdown value={draft.venue} options={cat?.venues || ["Physical", "Virtual"]} onChange={(v) => setDraft((d: any) => ({ ...d, venue: v }))} /></Field>
          <Field label="Staff strength"><Input type="number" value={draft.staff_strength} onChange={(e) => setDraft((d: any) => ({ ...d, staff_strength: e.target.value }))} /></Field>
          <Field label="Staff present"><Input type="number" value={draft.staff_present} onChange={(e) => setDraft((d: any) => ({ ...d, staff_present: e.target.value }))} /></Field>
          <Field label="Attendance rate"><AutoField value={rate(draft.staff_strength, draft.staff_present)} /></Field>
        </FieldSection>
        <FieldSection title="ETMC highlights">
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <div className="flex gap-2">
              <Input value={line?.detail || ""} onChange={(e) => setLine((l: any) => ({ detail: e.target.value }))} placeholder="Enter key highlight from the ETMC discussion" />
              <Button variant="outline" className="shrink-0" onClick={() => { if (!line?.detail?.trim()) return; setDraft((d: any) => ({ ...d, highlights: [...d.highlights, { detail: line.detail, _key: uid() }] })); setLine(null); }}><Plus className="w-4 h-4 mr-1" />Add highlight</Button>
            </div>
            {draft.highlights.map((h: any, i: number) => (
              <div key={h._key || h.entry_id || i} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="text-xs font-bold text-[#145c3f] mt-0.5">{i + 1}.</span>
                <p className="flex-1">{h.detail}</p>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => setDraft((d: any) => ({ ...d, highlights: d.highlights.filter((x: any) => x !== h) }))}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </FieldSection>
      </>}
      {step === 1 && ([
        { key: "department_updates" as const, title: "Departmental updates", ph: "Department / unit", ph2: "Update / key information", dual: true },
        { key: "resolutions" as const, title: "Decisions / resolutions / action points", ph: "Decision / resolution", ph2: "Action owner / deadline", dual: true, owner: true },
        { key: "comments" as const, title: "Staff comments", ph2: "Capture comments or observations from staff", dual: false },
        { key: "feedback" as const, title: "Feedback to HQ", ph2: "Feedback, clarification or issues for HQ", dual: false },
      ]).map((meta) => (
        <FieldSection key={meta.key} title={meta.title}>
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            {meta.dual ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={line?.[`${meta.key}_s`] || ""} onChange={(e) => setLine((l: any) => ({ ...l, [`${meta.key}_s`]: e.target.value }))} placeholder={meta.ph} />
                <div className="flex gap-2">
                  <Input value={line?.[`${meta.key}_d`] || ""} onChange={(e) => setLine((l: any) => ({ ...l, [`${meta.key}_d`]: e.target.value }))} placeholder={meta.ph2} className="flex-1" />
                  <Button variant="outline" className="shrink-0" onClick={() => {
                    const s = line?.[`${meta.key}_s`], d2 = line?.[`${meta.key}_d`];
                    if (!s?.trim() && !d2?.trim()) return;
                    const row = meta.owner
                      ? { subject: s || "", detail: s || "", owner_deadline: d2 || "", _key: uid() }
                      : { subject: s || "", detail: d2 || "", _key: uid() };
                    setDraft((d: any) => ({ ...d, [meta.key]: [...d[meta.key], row] }));
                    setLine((l: any) => ({ ...l, [`${meta.key}_s`]: "", [`${meta.key}_d`]: "" }));
                  }}><Plus className="w-4 h-4 mr-1" />Add</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={line?.[`${meta.key}_d`] || ""} onChange={(e) => setLine((l: any) => ({ ...l, [`${meta.key}_d`]: e.target.value }))} placeholder={meta.ph2} className="flex-1" />
                <Button variant="outline" className="shrink-0" onClick={() => {
                  const d2 = line?.[`${meta.key}_d`];
                  if (!d2?.trim()) return;
                  setDraft((d: any) => ({ ...d, [meta.key]: [...d[meta.key], { detail: d2, _key: uid() }] }));
                  setLine((l: any) => ({ ...l, [`${meta.key}_d`]: "" }));
                }}><Plus className="w-4 h-4 mr-1" />Add</Button>
              </div>
            )}
            {draft[meta.key].map((e: any, ix: number) => (
              <div key={e._key || e.entry_id || ix} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                <span className="flex-1">
                  {e.subject && <strong className="mr-2">{e.subject}:</strong>}
                  {meta.owner ? null : e.detail}
                  {e.owner_deadline && <em className="text-slate-500"> — {e.owner_deadline}</em>}
                </span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-rose-500" onClick={() => setDraft((d: any) => ({ ...d, [meta.key]: d[meta.key].filter((x: any) => x !== e) }))}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </FieldSection>
      ))}
      {step === 2 && <>
        <FieldSection title="Supporting evidence checklist" gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([["ev_attendance_list", "Attendance list"], ["ev_minutes", "Minutes"], ["ev_presentation", "Presentation"], ["ev_photographs", "Photographs"], ["ev_action_tracker", "Action tracker"], ["ev_escalations_documented", "Escalation issues documented"]] as const).map(([k, label]) => (
            <div key={k} className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3.5 space-y-2">
              <p className="text-xs font-semibold text-slate-700">{label}</p>
              <RadioYesNo
                name={k}
                value={draft[k] || ""}
                options={["Yes", "No", "N/A"]}
                onChange={(v) => setDraft((d: any) => ({ ...d, [k]: v }))}
              />
            </div>
          ))}
        </FieldSection>
        <FieldSection title="Submission & certification">
          <Field label="Prepared by"><Input value={draft.prepared_by || preparedFallback} onChange={(e) => setDraft((d: any) => ({ ...d, prepared_by: e.target.value }))} /></Field>
          <Field label="Designation"><Input value={draft.designation} onChange={(e) => setDraft((d: any) => ({ ...d, designation: e.target.value }))} /></Field>
          <Field label="Date"><Input type="date" value={draft.submission_date} onChange={(e) => setDraft((d: any) => ({ ...d, submission_date: e.target.value }))} /></Field>
        </FieldSection>
      </>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <Button variant="ghost" disabled={busy} onClick={() => step > 0 ? goStep(step - 1) : backToList()}>
          <ArrowLeft className="w-4 h-4 mr-2" />{step > 0 ? "Back" : "Cancel"}
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void save("etmc", "draft")}>Save Draft</Button>
          {step < ETMC_STEPS.length - 1
            ? <Button className={ACTION} disabled={busy} onClick={continueEtmc}>Continue<ArrowRight className="w-4 h-4 ml-1" /></Button>
            : <Button className={ACTION} disabled={busy} onClick={() => void save("etmc", "submitted")}><Send className="w-4 h-4 mr-2" />Submit report</Button>}
        </div>
      </div>
    </CardContent></Card>
  );

  const meetingDetail = detail && mode === "meeting-detail" && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`Meeting report ${detail.meeting_id}`}>
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Period" value={`${monthLabel(detail.reporting_month)} ${detail.reporting_year} · ${quarterFromMonth(detail.reporting_month)}`} />
          <ReviewRow label="Meeting date" value={detail.meeting_date} />
          <ReviewRow label="Type" value={detail.other_meeting_type || detail.meeting_type} />
          <ReviewRow label="Presiding officer" value={detail.presiding_officer} />
          <ReviewRow label="Venue" value={detail.venue} />
          <ReviewRow label="Attendance rate" value={detail.attendance_rate != null ? `${detail.attendance_rate}%` : null} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[detail.status]}`}>{detail.status}</Badge>} />
          <ReviewRow label="Prepared by" value={detail.prepared_by} />
          <ReviewRow label="Endorsed by" value={detail.endorsed_by} />
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Purpose" value={detail.purpose} /></div>
          <div className="sm:col-span-2 lg:col-span-3">
            <ReviewRow
              label="Supporting evidence"
              value={
                (detail.documents || []).length
                  ? (
                    <ul className="space-y-1">
                      {(detail.documents as any[]).map((doc) => (
                        <li key={`${doc.sn}-${doc.path}`}>
                          <a href={apiFileUrl(doc.path)} target="_blank" rel="noreferrer" className="text-[#145c3f] font-medium hover:underline">
                            {doc.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )
                  : "—"
              }
            />
          </div>
        </ReviewSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8f3ec] pt-4">
          {detail.status === "draft" && detail.created_by_user_id === permissions.user_id && <>
            <Button variant="outline" disabled={busy} onClick={() => void startMeetingForm(detail)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "submitted")}><Send className="w-4 h-4 mr-2" />Submit</Button>
          </>}
          {detail.status === "submitted" && permissions.review && <>
            <Button variant="outline" disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "draft")}>Return</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("meeting", detail.meeting_id, "approved")}>Endorse</Button>
          </>}
          <a href={challengeHref(detail.meeting_id)} className="inline-flex items-center gap-2 rounded-lg border border-[#d4e8dc] px-3 py-2 text-sm font-semibold text-[#145c3f] hover:bg-[#e8f6ee]">Challenge &amp; Support</a>
        </div>
      </CardContent></Card>
      {(["agenda", "decision", "followup"] as const).map((kind) => {
        const rows = (detail.items || []).filter((i: any) => i.item_kind === kind);
        if (!rows.length) return null;
        const title = kind === "agenda" ? "Key issues discussed" : kind === "decision" ? "Decisions / resolutions" : "Follow-up";
        return <Card key={kind} className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">{title} ({rows.length})</CardTitle></CardHeader><CardContent className="p-0"><ItemsTable rows={rows} kind={kind} /></CardContent></Card>;
      })}
    </div>
  );

  const etmcDetail = detail && mode === "etmc-detail" && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`ETMC cascading report ${detail.etmc_id}`}>
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Period" value={`${monthLabel(detail.reporting_month)} ${detail.reporting_year}`} />
          <ReviewRow label="ETMC meeting date" value={detail.etmc_meeting_date} />
          <ReviewRow label="Cascade session date" value={detail.cascade_session_date} />
          <ReviewRow label="ETMC session" value={detail.etmc_session} />
          <ReviewRow label="Attendance rate" value={detail.attendance_rate != null ? `${detail.attendance_rate}%` : null} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[detail.status]}`}>{detail.status}</Badge>} />
          <ReviewRow label="Prepared by" value={detail.prepared_by} />
          <ReviewRow label="Endorsed by" value={detail.endorsed_by} />
        </ReviewSection>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#e8f3ec] pt-4">
          {detail.status === "draft" && detail.created_by_user_id === permissions.user_id && <>
            <Button variant="outline" disabled={busy} onClick={() => void startEtmcForm(detail)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "submitted")}><Send className="w-4 h-4 mr-2" />Submit</Button>
          </>}
          {detail.status === "submitted" && permissions.review && <>
            <Button variant="outline" disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "draft")}>Return</Button>
            <Button className={ACTION} disabled={busy} onClick={() => void transition("etmc", detail.etmc_id, "approved")}>Endorse</Button>
          </>}
        </div>
      </CardContent></Card>
      {(["highlight", "department_update", "resolution", "comment", "feedback"] as const).map((kind) => {
        const rows = (detail.entries || []).filter((e: any) => e.entry_kind === kind);
        if (!rows.length) return null;
        const titles: Record<string, string> = { highlight: "ETMC highlights", department_update: "Departmental updates", resolution: "Decisions / resolutions", comment: "Staff comments", feedback: "Feedback to HQ" };
        return (
          <Card key={kind} className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">{titles[kind]} ({rows.length})</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">{rows.map((e: any) => (
              <div key={e.entry_id} className="rounded-lg bg-slate-50 p-3 text-sm">{e.subject && <strong className="mr-2">{e.subject}:</strong>}{e.detail}{e.owner_deadline && <em className="text-slate-500"> — {e.owner_deadline}</em>}</div>
            ))}</CardContent></Card>
        );
      })}
    </div>
  );

  const listView = mode === "list" && (
    <>
      {searchInput}
      {tab === "meetings" && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">Meeting Reports ({meetings.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                {["Date", "Meeting type", "State", "Period", "Attendance", "Status", ""].map((h) => <TableHead key={h} className={`text-xs font-bold whitespace-nowrap ${h === "" ? "text-right" : ""}`}>{h}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>{meetingRows.map((m) => (
                <TableRow key={m.meeting_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                  <TableCell className="text-sm whitespace-nowrap">{m.meeting_date}</TableCell>
                  <TableCell className="text-sm font-medium text-[#0f3d2e]">{m.other_meeting_type || m.meeting_type}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{stateName(m.state_code)}</TableCell>
                  <TableCell className="text-sm">{monthLabel(m.reporting_month)} {m.reporting_year}</TableCell>
                  <TableCell className="text-sm tabular-nums">{m.attendance_rate != null ? `${m.attendance_rate}%` : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[m.status]}`}>{m.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" disabled={busy} onClick={() => void openMeetingDetail(m.meeting_id)}><Eye className="w-3.5 h-3.5" />View</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>
            {!meetingRows.length && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">No meeting reports yet.</p>
                {permissions.create && <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => void startMeetingForm()}><Plus className="w-4 h-4" />New Meeting Report</Button>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {tab === "etmc" && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">ETMC Cascading Reports ({etmcs.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                {["ETMC date", "Session", "State", "Period", "Attendance", "Status", ""].map((h) => <TableHead key={h} className={`text-xs font-bold whitespace-nowrap ${h === "" ? "text-right" : ""}`}>{h}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>{etmcRows.map((e) => (
                <TableRow key={e.etmc_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                  <TableCell className="text-sm whitespace-nowrap">{e.etmc_meeting_date}</TableCell>
                  <TableCell className="text-sm font-medium">{e.etmc_session || "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{stateName(e.state_code)}</TableCell>
                  <TableCell className="text-sm">{monthLabel(e.reporting_month)} {e.reporting_year}</TableCell>
                  <TableCell className="text-sm tabular-nums">{e.attendance_rate != null ? `${e.attendance_rate}%` : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${STATUSES[e.status]}`}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" disabled={busy} onClick={() => void openEtmcDetail(e.etmc_id)}><Eye className="w-3.5 h-3.5" />View</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>
            {!etmcRows.length && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">No ETMC reports yet.</p>
                {permissions.create && <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => void startEtmcForm()}><Plus className="w-4 h-4" />New ETMC Report</Button>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#f4f7f5]">
        {header}
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {header}
      {tabs}
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
          {listView}
          {meetingForm}
          {etmcForm}
          {meetingDetail}
          {etmcDetail}
        </div>
      </ScrollArea>
    </div>
  );
}
