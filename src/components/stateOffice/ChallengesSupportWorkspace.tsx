import * as React from "react";
import { ArrowLeft, AlertTriangle, Eye, FileText, HandHelping, Link2, Loader2, MessageSquare, Pencil, Plus, RefreshCw, Send, User2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import PageLayout from "../PageLayout";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { challengesSupportApi as api } from "@/lib/api";
import { RegisterStatsCards } from "./RegisterStatsCards";
import { Field, FieldSection } from "./EnrolmentActivityForm";
import {
  CHALLENGE_CATEGORIES, CHALLENGE_DEPARTMENTS, CHALLENGE_IMPACTS, CHALLENGE_PROGRAMS,
  CHALLENGE_RELATED_ACTIVITIES, CHALLENGE_SEVERITIES, CHALLENGE_STATUSES,
  OTHER_OPTION, SUPPORT_ACTION_OWNERS, SUPPORT_CATEGORIES, SUPPORT_PRIORITIES,
  SUPPORT_STATUSES, severityToPriority, specificChallengesFor, specificSupportFor,
} from "./challengesTypes";

const inputClass = "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25";
const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";

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
const TONES: Record<string, string> = {
  "In-progress": "bg-amber-100 text-amber-800 border-amber-200", "Under Review": "bg-amber-100 text-amber-800 border-amber-200",
  Escalated: "bg-rose-100 text-rose-700 border-rose-200", "Action Initiated": "bg-blue-100 text-blue-800 border-blue-200",
  Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200", Closed: "bg-slate-100 text-slate-600 border-slate-200",
  "No Further Action Required": "bg-slate-100 text-slate-600 border-slate-200",
  Submitted: "bg-blue-100 text-blue-800 border-blue-200", Assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "In Progress": "bg-amber-100 text-amber-800 border-amber-200", "Returned for Clarification": "bg-rose-100 text-rose-700 border-rose-200",
};

type Permissions = { user_id?: number; create: boolean; comment: boolean; assign: boolean; zonal: boolean; national: boolean };
type Catalogue = {
  states: { code: string; description: string; zonal_code: string }[];
  zones: { zonal_code: string; description: string }[];
  default_state: string | null; default_zone: string | null; permissions: Permissions;
};
type Challenge = Record<string, any>;
type SupportRequest = Record<string, any>;

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
const blankChallenge = (catalogue: Catalogue | null) => ({
  challenge_category: "", specific_challenge: "", other_challenge: "", description: "",
  related_activity: "", programme: "", severity: "", impact: "", status: "In-progress",
  escalation_department: "", key_recommendation: "", remarks: "",
  state_code: catalogue?.default_state || "",
  date_reported: new Date().toISOString().slice(0, 10),
});
const blankSupport = (catalogue: Catalogue | null, challenge?: Challenge | null) => ({
  challenge_id: challenge?.challenge_id || "",
  action_required_from: "", other_action_owner: "", nhia_department: "",
  support_category: "", specific_support: "", other_support: "",
  priority: challenge?.severity ? severityToPriority(challenge.severity) : "Medium",
  description: "", operational_impact: challenge?.impact || "", required_by_date: "",
  state_code: challenge?.state_code || catalogue?.default_state || "",
  date_submitted: new Date().toISOString().slice(0, 10),
});

interface Props { onBack: () => void }

export default function ChallengesSupportWorkspace({ onBack }: Props) {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [supportList, setSupportList] = React.useState<SupportRequest[]>([]);
  const [mode, setMode] = React.useState<"challenges" | "support" | "challenge-form" | "support-form" | "challenge-detail" | "support-detail">("challenges");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [draft, setDraft] = React.useState<any>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<any>(null);
  const [note, setNote] = React.useState("");
  const [newStatus, setNewStatus] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterSeverity, setFilterSeverity] = React.useState("all");
  const [filterPriority, setFilterPriority] = React.useState("all");
  const permissions = catalogue?.permissions || { create: false, comment: false, assign: false, national: false };

  const filteredChallenges = React.useMemo(
    () => challenges.filter((c) => {
      if (filterStatus !== "all" && (c.status || "In-progress") !== filterStatus) return false;
      if (filterSeverity !== "all" && c.severity !== filterSeverity) return false;
      return true;
    }),
    [challenges, filterStatus, filterSeverity],
  );
  const filteredSupport = React.useMemo(
    () => supportList.filter((s) => {
      if (filterStatus !== "all" && (s.status || "Submitted") !== filterStatus) return false;
      if (filterPriority !== "all" && s.priority !== filterPriority) return false;
      return true;
    }),
    [supportList, filterStatus, filterPriority],
  );

  React.useEffect(() => {
    setFilterStatus("all");
    setFilterSeverity("all");
    setFilterPriority("all");
  }, [mode]);

  const run = async <T,>(op: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError("");
    try { return await op(); }
    catch (e: any) { setError(e.message || "Something went wrong"); return undefined; }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    const [c, s] = await Promise.all([api.challenges(), api.support()]);
    setChallenges(c.data); setSupportList(s.data);
  };
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([api.catalogue(), api.challenges(), api.support()])
      .then(([cat, c, s]) => { if (!cancelled) { setCatalogue(cat.data); setChallenges(c.data); setSupportList(s.data); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Prefill from Meetings & Coordination handoff (?from=meeting&meeting_id=&related_activity=&note=)
  React.useEffect(() => {
    if (loading || !catalogue) return;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("from") !== "meeting") return;
      const related = q.get("related_activity") || "Meetings & Coordination";
      const note = q.get("note") || "";
      const meetingId = q.get("meeting_id") || "";
      const seed = blankChallenge(catalogue);
      seed.related_activity = related;
      seed.description = [note, meetingId ? `Source meeting: ${meetingId}` : ""].filter(Boolean).join("\n");
      setEditingId(null);
      setDraft(seed);
      setMode("challenge-form");
      const url = new URL(window.location.href);
      ["from", "meeting_id", "related_activity", "note"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    } catch { /* ignore */ }
  }, [loading, catalogue]);

  const stateName = (code: string) => catalogue?.states.find((s) => s.code === code)?.description || code;
  const zoneName = (code: string) => catalogue?.zones.find((z) => z.zonal_code === code)?.description || code;

  const openChallengeDetail = (id: string) => run(async () => {
    const res = await api.challenge(id); setDetail(res.data); setNote(""); setNewStatus(res.data.status); setMode("challenge-detail");
  });
  const openSupportDetail = (id: string) => run(async () => {
    const res = await api.supportDetail(id); setDetail(res.data); setNote(""); setNewStatus(res.data.status); setMode("support-detail");
  });
  const startChallengeForm = (row?: Challenge) => {
    setEditingId(row?.challenge_id || null);
    setDraft(row ? { ...blankChallenge(catalogue), ...row, challenge_category: row.category_label, date_reported: row.date_reported } : blankChallenge(catalogue));
    setMode("challenge-form");
  };
  const startSupportForm = (challenge?: Challenge | null, existing?: SupportRequest) => {
    setEditingId(null);
    setDraft(blankSupport(catalogue, challenge ?? null));
    setMode("support-form");
  };
  const saveChallenge = () => run(async () => {
    const payload = { ...draft };
    if (editingId) await api.updateChallenge(editingId, payload);
    else await api.createChallenge(payload);
    await refresh(); toast.success(editingId ? "Challenge updated" : "Challenge recorded"); setMode("challenges");
  });
  const saveSupport = () => run(async () => {
    await api.createSupport({ ...draft, challenge_id: draft.challenge_id || null });
    await refresh(); toast.success("Support request submitted"); setMode("challenges");
  });
  const postActivity = (kind: "challenge" | "support", payload: any) => run(async () => {
    const call = kind === "challenge" ? api.challengeActivity : api.supportActivity;
    await call(kind === "challenge" ? detail.challenge_id : detail.support_id, payload);
    if (kind === "challenge") await openChallengeDetail(detail.challenge_id);
    else await openSupportDetail(detail.support_id);
    await refresh(); toast.success("Saved");
  });
  const handleBack = () => {
    if (["challenge-form", "support-form", "challenge-detail", "support-detail"].includes(mode)) setMode("challenges");
    else onBack();
  };

  const challengeColumns: ColumnDef<Challenge>[] = React.useMemo(() => [
    {
      accessorKey: "challenge_id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#1a7a52]">
          #{row.original.challenge_id}
        </span>
      ),
    },
    {
      accessorKey: "date_reported",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
          {row.original.date_reported}
        </span>
      ),
    },
    {
      id: "category_label",
      accessorFn: (row) => `${row.category_label || ""} ${row.specific_challenge || ""} ${row.other_challenge || ""} ${row.description || ""}`,
      header: "Challenge Details",
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <p className="text-xs font-bold text-[#0f3d2e] leading-snug">
            {row.original.category_label}
          </p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {row.original.other_challenge || row.original.specific_challenge || "—"}
          </p>
        </div>
      ),
    },
    {
      id: "state_code",
      accessorFn: (row) => `${stateName(row.state_code)} ${row.state_code}`,
      header: "State / FCT",
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          {stateName(row.original.state_code)}
        </span>
      ),
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const sev = row.original.severity || "—";
        const color =
          sev === "Critical"
            ? "bg-rose-100 text-rose-700 border-rose-200"
            : sev === "High"
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : sev === "Medium"
            ? "bg-blue-100 text-blue-700 border-blue-200"
            : "bg-emerald-100 text-emerald-700 border-emerald-200";
        return (
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border font-bold ${color}`}>
            {sev}
          </Badge>
        );
      },
    },
    {
      accessorKey: "impact",
      header: "Impact",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600">
          {row.original.impact || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const st = row.original.status || "In-progress";
        return (
          <Badge className={`text-[10px] px-2 py-0.5 border ${TONES[st] || TONES["In-progress"]}`}>
            {st}
          </Badge>
        );
      },
    },
    {
      id: "support_count",
      header: "Support",
      cell: ({ row }) => {
        const count = (row.original.support_requests || []).length;
        return (
          <span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-slate-100 text-slate-700">
            {count}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] border border-[#1a7a52]/40 bg-[#f4f7f5] hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
            disabled={busy}
            onClick={() => void openChallengeDetail(row.original.challenge_id)}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ], [permissions.create, busy, catalogue]);

  const supportColumns: ColumnDef<SupportRequest>[] = React.useMemo(() => [
    {
      accessorKey: "support_id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#1a7a52]">
          #{row.original.support_id}
        </span>
      ),
    },
    {
      accessorKey: "date_submitted",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 font-medium whitespace-nowrap">
          {row.original.date_submitted}
        </span>
      ),
    },
    {
      id: "support_category",
      accessorFn: (row) => `${row.other_support || ""} ${row.specific_support || ""} ${row.support_category || ""} ${row.description || ""}`,
      header: "Support Request",
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <p className="text-xs font-bold text-[#0f3d2e] leading-snug">
            {row.original.other_support || row.original.specific_support || row.original.support_category}
          </p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {row.original.support_category}
          </p>
        </div>
      ),
    },
    {
      id: "state_code",
      accessorFn: (row) => `${stateName(row.state_code)} ${row.state_code}`,
      header: "State / FCT",
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          {stateName(row.original.state_code)}
        </span>
      ),
    },
    {
      id: "action_required_from",
      accessorFn: (row) =>
        row.action_required_from === "Other NHIA Departments"
          ? (row.nhia_department || "NHIA Dept")
          : (row.other_action_owner || row.action_required_from || ""),
      header: "Action Owner",
      cell: ({ row }) => {
        const s = row.original;
        const owner =
          s.action_required_from === "Other NHIA Departments"
            ? s.nhia_department || "NHIA Dept"
            : s.other_action_owner || s.action_required_from;
        return (
          <span className="text-xs font-medium text-slate-700">
            {owner || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const prio = row.original.priority || "Medium";
        const color =
          prio === "Critical"
            ? "bg-rose-100 text-rose-700 border-rose-200"
            : prio === "High"
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-blue-100 text-blue-700 border-blue-200";
        return (
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border font-bold ${color}`}>
            {prio}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const st = row.original.status || "Submitted";
        return (
          <Badge className={`text-[10px] px-2 py-0.5 border ${TONES[st] || TONES.Submitted}`}>
            {st}
          </Badge>
        );
      },
    },
    {
      accessorKey: "required_by_date",
      header: "Required By",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 whitespace-nowrap">
          {row.original.required_by_date || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs font-bold text-[#1a7a52] border border-[#1a7a52]/40 bg-[#f4f7f5] hover:bg-[#e8f5ee] rounded-sm gap-1 shadow-2xs"
            disabled={busy}
            onClick={() => void openSupportDetail(row.original.support_id)}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </Button>
        </div>
      ),
    },
  ], [busy, catalogue]);

  const actions = (
    <div className="flex items-center gap-2 shrink-0">
      {["challenges", "support"].includes(mode) && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc]"
          disabled={busy || loading}
          onClick={() => void run(refresh)}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
        </Button>
      )}
      {permissions.create && mode === "challenges" && (
        <Button
          size="sm"
          className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/15 h-8 text-xs rounded-md"
          disabled={busy}
          onClick={() => startChallengeForm()}
        >
          <Plus className="w-3.5 h-3.5" /> Record Challenge
        </Button>
      )}
      {permissions.create && mode === "support" && (
        <Button
          size="sm"
          className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/15 h-8 text-xs rounded-md"
          disabled={busy}
          onClick={() => startSupportForm(null)}
        >
          <Plus className="w-3.5 h-3.5" /> Request Support
        </Button>
      )}
    </div>
  );


  const tabs = ["challenges", "support"].includes(mode) ? (
    <div className="flex gap-0 overflow-x-auto -mb-px" role="tablist" aria-label="Challenges and Support">
      {[
        { key: "challenges", label: "Challenges Register", count: challenges.length, icon: AlertTriangle },
        { key: "support", label: "Support Requests", count: supportList.length, icon: HandHelping },
      ].map(({ key, label, count, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={mode === key}
          onClick={() => setMode(key as any)}
          className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${
            mode === key
              ? "border-[#145c3f] text-[#145c3f]"
              : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {count !== null && (
            <span
              className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                mode === key ? "bg-[#e8f6ee] text-[#145c3f]" : "bg-slate-100 text-slate-500"
              }`}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  ) : undefined;

  if (loading) return <div className="flex flex-col h-full bg-[#f4f7f5]">{header}<div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span></div></div>;

  /* ── Challenge form ── */
  const challengeForm = draft && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      <FieldSection title="Challenge details">
        <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
        <Field label="Zone"><Input value={zoneName(catalogue?.states.find((s) => s.code === draft.state_code)?.zonal_code || catalogue?.default_zone || "")} readOnly /></Field>
        <Field label="Date reported" required><Input type="date" value={draft.date_reported} onChange={(e) => setDraft((d: any) => ({ ...d, date_reported: e.target.value }))} /></Field>
        <Field label="Challenges category" required><Dropdown value={draft.challenge_category} options={[...CHALLENGE_CATEGORIES.map((c) => c.label), OTHER_OPTION]} onChange={(v) => setDraft((d: any) => ({ ...d, challenge_category: v, specific_challenge: "", other_challenge: "" }))} placeholder="Select category" /></Field>
        {draft.challenge_category === OTHER_OPTION && <Field label="Specify category" required><Input value={draft.other_challenge} onChange={(e) => setDraft((d: any) => ({ ...d, other_challenge: e.target.value }))} placeholder="Enter category" /></Field>}
        <Field label="Specific challenge" required={draft.challenge_category !== OTHER_OPTION}><Dropdown value={draft.specific_challenge} options={specificChallengesFor(draft.challenge_category)} onChange={(v) => setDraft((d: any) => ({ ...d, specific_challenge: v }))} disabled={!draft.challenge_category || draft.challenge_category === OTHER_OPTION} placeholder="Select specific challenge" /></Field>
        {draft.specific_challenge === OTHER_OPTION && <Field label="Specify challenge" required><Input value={draft.other_challenge} onChange={(e) => setDraft((d: any) => ({ ...d, other_challenge: e.target.value }))} placeholder="Describe the challenge" /></Field>}
        <Field label="Related activity"><Dropdown value={draft.related_activity} options={[...CHALLENGE_RELATED_ACTIVITIES]} onChange={(v) => setDraft((d: any) => ({ ...d, related_activity: v }))} placeholder="Select activity" /></Field>
        <Field label="Programme"><Dropdown value={draft.programme} options={[...CHALLENGE_PROGRAMS]} onChange={(v) => setDraft((d: any) => ({ ...d, programme: v }))} placeholder="Select programme" /></Field>
        <Field label="Severity" required><Dropdown value={draft.severity} options={[...CHALLENGE_SEVERITIES]} onChange={(v) => setDraft((d: any) => ({ ...d, severity: v }))} placeholder="Select severity" /></Field>
        <Field label="Challenge impact / effect"><Dropdown value={draft.impact} options={[...CHALLENGE_IMPACTS]} onChange={(v) => setDraft((d: any) => ({ ...d, impact: v }))} placeholder="Select impact" /></Field>
        <Field label="Status" required><Dropdown value={draft.status} options={[...CHALLENGE_STATUSES]} onChange={(v) => setDraft((d: any) => ({ ...d, status: v }))} placeholder="Select status" /></Field>
        <Field label="Escalation department"><Dropdown value={draft.escalation_department} options={[...CHALLENGE_DEPARTMENTS]} onChange={(v) => setDraft((d: any) => ({ ...d, escalation_department: v }))} placeholder="Select department" /></Field>
        <Field label="Description of the challenge" required className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={3} value={draft.description} onChange={(e) => setDraft((d: any) => ({ ...d, description: e.target.value }))} placeholder="Describe the challenge, how it arose and the operational effect" /></Field>
        <Field label="Key recommendation" className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={2} value={draft.key_recommendation} onChange={(e) => setDraft((d: any) => ({ ...d, key_recommendation: e.target.value }))} placeholder="Recommended way forward" /></Field>
        <Field label="Remarks" className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={2} value={draft.remarks} onChange={(e) => setDraft((d: any) => ({ ...d, remarks: e.target.value }))} placeholder="Additional remarks" /></Field>
      </FieldSection>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <Button variant="ghost" disabled={busy} onClick={() => setMode("challenges")}><ArrowLeft className="w-4 h-4 mr-2" />Cancel</Button>
        <div className="flex flex-wrap justify-end gap-2">
          {editingId && permissions.create && <Button variant="outline" disabled={busy} onClick={() => startSupportForm(detail)}>Raise support request</Button>}
          <Button className={ACTION} disabled={busy} onClick={() => void saveChallenge()}><Send className="w-4 h-4 mr-2" />{editingId ? "Update challenge" : "Record challenge"}</Button>
        </div>
      </div>
    </CardContent></Card>
  );

  /* ── Support form ── */
  const supportForm = draft && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
      {draft.challenge_id && (
        <div className="rounded-lg bg-[#eef6f1] p-3 text-sm text-[#145c3f] flex flex-wrap items-center gap-2">
          Linked to challenge <strong>{draft.challenge_id}</strong>
        </div>
      )}
      <FieldSection title="Support request">
        <Field label="State / FCT"><Input value={stateName(draft.state_code)} readOnly /></Field>
        <Field label="Zone"><Input value={zoneName(catalogue?.states.find((s) => s.code === draft.state_code)?.zonal_code || catalogue?.default_zone || "")} readOnly /></Field>
        <Field label="Date submitted" required><Input type="date" value={draft.date_submitted} onChange={(e) => setDraft((d: any) => ({ ...d, date_submitted: e.target.value }))} /></Field>
        <Field label="Action required from" required><Dropdown value={draft.action_required_from} options={[...SUPPORT_ACTION_OWNERS]} onChange={(v) => setDraft((d: any) => ({ ...d, action_required_from: v, nhia_department: "", other_action_owner: "" }))} placeholder="Select action owner" /></Field>
        {draft.action_required_from === "Other NHIA Departments" && <Field label="NHIA department" required><Dropdown value={draft.nhia_department} options={[...CHALLENGE_DEPARTMENTS]} onChange={(v) => setDraft((d: any) => ({ ...d, nhia_department: v }))} placeholder="Select department" /></Field>}
        {draft.action_required_from === OTHER_OPTION && <Field label="Specify action owner" required><Input value={draft.other_action_owner} onChange={(e) => setDraft((d: any) => ({ ...d, other_action_owner: e.target.value }))} placeholder="Enter action owner" /></Field>}
        <Field label="Support category" required><Dropdown value={draft.support_category} options={[...SUPPORT_CATEGORIES, OTHER_OPTION]} onChange={(v) => setDraft((d: any) => ({ ...d, support_category: v, specific_support: "", other_support: "" }))} placeholder="Select category" /></Field>
        {draft.support_category !== OTHER_OPTION && <Field label="Specific support required" required><Dropdown value={draft.specific_support} options={specificSupportFor(draft.support_category)} onChange={(v) => setDraft((d: any) => ({ ...d, specific_support: v }))} disabled={!draft.support_category} placeholder="Select support" /></Field>}
        {(draft.support_category === OTHER_OPTION || draft.specific_support === OTHER_OPTION) && <Field label="Specify support" required><Input value={draft.other_support} onChange={(e) => setDraft((d: any) => ({ ...d, other_support: e.target.value }))} placeholder="Describe the support needed" /></Field>}
        <Field label="Priority"><Dropdown value={draft.priority} options={[...SUPPORT_PRIORITIES]} onChange={(v) => setDraft((d: any) => ({ ...d, priority: v }))} placeholder="Select priority" /></Field>
        <Field label="Required-by date"><Input type="date" value={draft.required_by_date} onChange={(e) => setDraft((d: any) => ({ ...d, required_by_date: e.target.value }))} /></Field>
        <Field label="Operational impact"><Input value={draft.operational_impact} onChange={(e) => setDraft((d: any) => ({ ...d, operational_impact: e.target.value }))} placeholder="Effect on operations" /></Field>
        <Field label="Description of support required" required className="sm:col-span-2 lg:col-span-3"><textarea className={inputClass} rows={3} value={draft.description} onChange={(e) => setDraft((d: any) => ({ ...d, description: e.target.value }))} placeholder="Describe the assistance expected, why it is needed and the outcome required" /></Field>
      </FieldSection>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8f3ec] pt-4">
        <Button variant="ghost" disabled={busy} onClick={() => setMode("challenges")}><ArrowLeft className="w-4 h-4 mr-2" />Cancel</Button>
        <Button className={ACTION} disabled={busy} onClick={() => void saveSupport()}><Send className="w-4 h-4 mr-2" />Submit request</Button>
      </div>
    </CardContent></Card>
  );

  /* ── Detail views (shared for challenge/support) ── */
  const ACTION_META: Record<string, { icon: any; label: string; ring: string }> = {
    create: { icon: FileText, label: "created this record", ring: "bg-[#e8f6ee] text-[#145c3f]" },
    status: { icon: RefreshCw, label: "changed status", ring: "bg-amber-100 text-amber-700" },
    link: { icon: Link2, label: "linked a record", ring: "bg-blue-100 text-blue-700" },
    assign: { icon: Send, label: "assigned", ring: "bg-indigo-100 text-indigo-700" },
    comment: { icon: MessageSquare, label: "commented", ring: "bg-slate-100 text-slate-600" },
  };
  const kindLabel = mode === "challenge-detail" ? "challenge" : "support";
  const historyPanel = detail && (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-5">
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">Updates &amp; comments</h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <ol className="relative space-y-4 border-l-2 border-[#e0efe6] ml-2 pl-5">
        {[...(detail.history || [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((h: any) => {
          const meta = ACTION_META[h.action] || ACTION_META.comment;
          const Icon = meta.icon;
          const when = h.createdAt ? new Date(h.createdAt) : null;
          return (
            <li key={h.history_id} className="relative">
              <span className={`absolute -left-[1.95rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ${meta.ring}`}><Icon className="h-3 w-3" /></span>
              <div className={`rounded-xl px-3.5 py-2.5 ${h.action === "comment" ? "bg-white border border-[#d4e8dc] shadow-sm" : "bg-slate-50"}`}>
                <p className="text-sm">
                  <span className="font-semibold text-[#0f3d2e]">{h.actor_name}</span>
                  <span className="text-slate-500"> {meta.label}</span>
                  {h.action === "status" && <Badge className={`ml-1.5 text-[10px] px-2 py-0.5 border align-middle ${TONES[h.to_status] || TONES.Submitted}`}>{h.to_status}</Badge>}
                  {when && <span className="block text-[11px] text-slate-400 mt-0.5">{when.toLocaleDateString()} at {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                </p>
                {h.note && <p className={`mt-1 text-sm text-slate-700 ${h.action === "comment" ? "" : "text-slate-600"}`}>{h.note}</p>}
              </div>
            </li>
          );
        })}
        {!detail.history?.length && <p className="text-sm text-slate-400 pl-1">No activity yet.</p>}
      </ol>
      {(permissions.comment || permissions.assign || (mode === "challenge-detail" ? detail.created_by_user_id : detail.submitted_by_user_id) === permissions.user_id) && (
        <div className="rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {permissions.comment ? "Add an update for " : "Update this "}{kindLabel}
          </p>
          {permissions.comment && (
            <div className="flex gap-2 items-start">
              <textarea className={`${inputClass} flex-1 min-h-[3rem]`} rows={2} value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a comment or observation — it will appear in the history above" />
              <Button variant="outline" className="shrink-0" disabled={busy || !note.trim()}
                onClick={() => void postActivity(kindLabel, { action: "comment", note })}>
                <MessageSquare className="w-4 h-4 mr-2" />Post comment
              </Button>
            </div>
          )}
          {(permissions.assign || (mode === "challenge-detail" ? detail.created_by_user_id : detail.submitted_by_user_id) === permissions.user_id) && (
            <div className="flex flex-wrap gap-2 items-end pt-1 border-t border-[#e0efe6]">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Change status</p>
                <Dropdown value={newStatus} options={mode === "challenge-detail" ? [...CHALLENGE_STATUSES] : [...SUPPORT_STATUSES]} onChange={setNewStatus} placeholder="Select new status" />
              </div>
              <Button className={ACTION} disabled={busy || !newStatus || newStatus === detail.status}
                onClick={() => void postActivity(kindLabel, { status: newStatus, note, from_status: detail.status })}>
                <Send className="w-4 h-4 mr-2" />Update status
              </Button>
            </div>
          )}
        </div>
      )}
    </CardContent></Card>
  );

  const challengeDetail = detail && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`Challenge ${detail.challenge_id}`}>
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="Date reported" value={detail.date_reported} />
          <ReviewRow label="Category" value={detail.category_label} />
          <ReviewRow label="Specific challenge" value={detail.other_challenge || detail.specific_challenge} />
          <ReviewRow label="Severity" value={detail.severity} />
          <ReviewRow label="Impact" value={detail.impact} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${TONES[detail.status] || TONES["In-progress"]}`}>{detail.status}</Badge>} />
          <ReviewRow label="Escalation department" value={detail.escalation_department} />
          <ReviewRow label="Related activity" value={detail.related_activity} />
          <ReviewRow label="Programme" value={detail.programme} />
          <ReviewRow label="Recorded by" value={detail.created_by_name} />
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Description" value={detail.description} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Key recommendation" value={detail.key_recommendation} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Remarks" value={detail.remarks} /></div>
        </ReviewSection>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8f3ec] pt-4">
          <div className="flex items-center gap-2">
            {permissions.create && <Button variant="outline" disabled={busy} onClick={() => { startChallengeForm(detail); setMode("challenge-form"); }}><Pencil className="w-4 h-4 mr-2" />Edit</Button>}
          </div>
          {permissions.create && <Button className={ACTION} disabled={busy} onClick={() => startSupportForm(detail)}><Plus className="w-4 h-4 mr-2" />Raise support request</Button>}
        </div>
      </CardContent></Card>
      {!!detail.support_requests?.length && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">Linked support requests ({detail.support_requests.length})</CardTitle></CardHeader>
          <CardContent className="p-0"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["Support", "Category", "Priority", "Status", "Required by", "Action"].map((l) => <TableHead key={l} className={`text-xs font-bold text-slate-600 whitespace-nowrap ${l === "Action" ? "text-right" : ""}`}>{l}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{detail.support_requests.map((s: any) => (
              <TableRow key={s.support_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                <TableCell className="text-sm font-medium text-[#0f3d2e]">{s.specific_support || s.other_support || "—"}</TableCell>
                <TableCell className="text-sm">{s.support_category}</TableCell>
                <TableCell className="text-sm">{s.priority || "—"}</TableCell>
                <TableCell><Badge className={`text-[10px] px-2 py-0.5 border ${TONES[s.status] || TONES.Submitted}`}>{s.status}</Badge></TableCell>
                <TableCell className="text-sm">{s.required_by_date || "—"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" onClick={() => void openSupportDetail(s.support_id)}><Eye className="w-3.5 h-3.5" />View</Button></TableCell>
              </TableRow>))}
            </TableBody></Table></div></CardContent>
        </Card>
      )}
      {historyPanel}
    </div>
  );

  const supportDetail = detail && (
    <div className="space-y-4">
      <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5 space-y-4">
        <ReviewSection title={`Support request ${detail.support_id}`}>
          {detail.challenge && <div className="rounded-lg bg-[#eef6f1] p-3 text-sm text-[#145c3f] sm:col-span-2 lg:col-span-3">Linked challenge <strong>{detail.challenge.challenge_id}</strong> — {detail.challenge.category_label}{detail.challenge.specific_challenge ? ` · ${detail.challenge.specific_challenge}` : ""}</div>}
          <ReviewRow label="State / FCT" value={stateName(detail.state_code)} />
          <ReviewRow label="Zone" value={zoneName(detail.zonal_code)} />
          <ReviewRow label="Date submitted" value={detail.date_submitted} />
          <ReviewRow label="Action required from" value={detail.action_required_from === "Other NHIA Departments" ? `${detail.action_required_from} — ${detail.nhia_department || ""}` : detail.other_action_owner || detail.action_required_from} />
          <ReviewRow label="Support category" value={detail.support_category} />
          <ReviewRow label="Specific support" value={detail.other_support || detail.specific_support} />
          <ReviewRow label="Priority" value={detail.priority} />
          <ReviewRow label="Status" value={<Badge className={`text-[10px] px-2 py-0.5 border ${TONES[detail.status] || TONES.Submitted}`}>{detail.status}</Badge>} />
          <ReviewRow label="Required by" value={detail.required_by_date} />
          <ReviewRow label="Operational impact" value={detail.operational_impact} />
          <ReviewRow label="Submitted by" value={detail.submitted_by_name} />
          <div className="sm:col-span-2 lg:col-span-3"><ReviewRow label="Description" value={detail.description} /></div>
        </ReviewSection>
      </CardContent></Card>
      {!!detail.documents?.length && (
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 space-y-2">
          {detail.documents.map((d: any) => <div key={`${d.report_reference_id}-${d.sn}`} className="flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-slate-400" />{d.name}</div>)}
        </CardContent></Card>
      )}
      {historyPanel}
    </div>
  );

  const isViewOrForm = ["challenge-form", "support-form", "challenge-detail", "support-detail"].includes(mode);

  return (
    <PageLayout
      title={
        mode === "challenge-form" ? (editingId ? "Edit Challenge" : "Record Challenge")
        : mode === "support-form" ? (editingId ? "Edit Support Request" : "Request Support")
        : mode === "challenge-detail" ? `Challenge ${detail?.challenge_id || ""}`
        : mode === "support-detail" ? `Support Request ${detail?.support_id || ""}`
        : "Challenges & Support"
      }
      onBack={isViewOrForm ? handleBack : undefined}
      actions={actions}
      filters={tabs}
      error={error}
      contentClassName="space-y-3 pb-6"
    >
      <div className="w-full space-y-3">
        {mode === "challenges" && (
          <>
          <RegisterStatsCards
            loading={busy || loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              { label: "Total", value: filteredChallenges.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              {
                label: "In-progress",
                value: filteredChallenges.filter((c: any) => (c.status || "In-progress") === "In-progress").length,
                tone: "text-amber-800 bg-amber-50/80 border-amber-100",
              },
              {
                label: "Resolved",
                value: filteredChallenges.filter((c: any) => c.status === "Resolved" || c.status === "Closed").length,
                tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
              },
              {
                label: "Escalated",
                value: filteredChallenges.filter((c: any) => /escalat/i.test(String(c.status || ""))).length,
                tone: "text-rose-700 bg-rose-50/80 border-rose-100",
              },
            ]}
          />
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger displayValue={filterStatus === "all" ? "All Statuses" : filterStatus}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {CHALLENGE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Severity</Label>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger displayValue={filterSeverity === "all" ? "All Severities" : filterSeverity}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {CHALLENGE_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <ShadcnDataTable
            title="CHALLENGES REGISTER"
            infoTooltip="Operational and strategic challenges registered across NHIA state offices."
            columns={challengeColumns}
            data={filteredChallenges}
            loading={busy || loading}
            searchPlaceholder="Search challenges, categories, states..."
            emptyMessage="No challenges recorded for this view."
            onRowClick={(row) => void openChallengeDetail(row.challenge_id)}
            pageSize={50}
            showTableOptions={false}
          />
          </>
        )}
        {mode === "support" && (
          <>
          <RegisterStatsCards
            loading={busy || loading}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            stats={[
              { label: "Total", value: filteredSupport.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              {
                label: "In progress",
                value: filteredSupport.filter((s: any) => ["Submitted", "Under Review", "Assigned", "In Progress"].includes(s.status || "Submitted")).length,
                tone: "text-amber-800 bg-amber-50/80 border-amber-100",
              },
              {
                label: "Resolved",
                value: filteredSupport.filter((s: any) => s.status === "Resolved" || s.status === "Closed").length,
                tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100",
              },
              {
                label: "Returned",
                value: filteredSupport.filter((s: any) => /return/i.test(String(s.status || ""))).length,
                tone: "text-rose-700 bg-rose-50/80 border-rose-100",
              },
            ]}
          />
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger displayValue={filterStatus === "all" ? "All Statuses" : filterStatus}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {SUPPORT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger displayValue={filterPriority === "all" ? "All Priorities" : filterPriority}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {SUPPORT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <ShadcnDataTable
            title="SUPPORT REQUESTS REGISTER"
            infoTooltip="Inter-departmental and executive support requests for resolution."
            columns={supportColumns}
            data={filteredSupport}
            loading={busy || loading}
            searchPlaceholder="Search support requests, owners, states..."
            emptyMessage="No support requests recorded for this view."
            onRowClick={(row) => void openSupportDetail(row.support_id)}
            pageSize={50}
            showTableOptions={false}
          />
          </>
        )}
        {mode === "challenge-form" && challengeForm}
        {mode === "support-form" && supportForm}
        {mode === "challenge-detail" && challengeDetail}
        {mode === "support-detail" && supportDetail}
      </div>
    </PageLayout>
  );
}
