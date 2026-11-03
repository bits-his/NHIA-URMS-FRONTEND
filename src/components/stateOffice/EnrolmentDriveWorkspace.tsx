import * as React from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Plus, RefreshCw, Save, Send, Download, Users, Pencil, Trash2, Eye, FileText, Clock, CheckCircle2, ClipboardList, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { enrolmentDrivesApi as api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RootState } from "@/src/store/store";
import EnrolmentActivityForm, { Field, FieldSection } from "./EnrolmentActivityForm";
import { MultiSelectField } from "./EnrolmentDriveForm";
import StateOfficeFormSteps from "./StateOfficeFormSteps";
import { AddRowButton } from "./adminHr/ui";
import { driveReportingMonth, driveReportingPeriod, hasPendingDriveActivity, shouldOpenDriveActivityForm } from "./enrolmentDriveTypes";
import { useListSearch } from "./useListSearch";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { monthLabel, quarterFromMonth, formatAmount, formatCount, formatDate } from "./constants";

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
        <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#145c3f]">
          {title}
        </h3>
        <div className="h-px flex-1 bg-[#d4e8dc]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        {items}
      </div>
    </section>
  );
}

function SectionBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-4 bg-[#f4f7f5]">{children}</div>
    </section>
  );
}

type Permissions = { create: boolean; review: boolean; manage: boolean };
type Evidence = { reference_id: string; original_name: string; evidence_type: string };
type Catalogue = {
  states: { code: string; description: string; zonal_code: string }[];
  zones?: { zonal_code: string; description: string }[];
  owners?: { id: number; name: string; state_code: string; zonal_code: string }[];
  programmes: string[]; audiences: string[]; locations: Record<string, string[]>; funding: string[]; statuses: string[]; evidence_types: string[];
  drive_types: { key: string; title: string; categories: { label: string }[] }[]; permissions: Permissions;
};
type Activity = {
  reference_id?: string; revision?: number; drive_type: string; activity_date: string; activity_category: string; specific_activity: string;
  location_category: string; location_name: string; exact_location: string; programs_supported: string[]; target_audience: string[]; other_audience: string;
  planned_target_audience: string; target_audience_reached: string; leads_generated: string; activity_status: string; status_reason: string;
  funding_option: string; activity_budget: string; approved_amount: string; activity_details: string; evidence_type: string; remarks: string;
  enrolment_count?: number; evidence?: Evidence[]; new_enrolments?: number;
  enrolment_records?: { reference_id: string; status: string; enrolment_count: number; reporting_year: number; reporting_month: number }[];
};
type Batch = {
  reference_id: string; revision: number; state_code: string; state_name?: string; zonal_code: string; reporting_year: number; reporting_month: number;
  planned_activities: number | null; status: string; reporting_officer: string; activity_count?: number; submitted_at?: string;
  reporting_deadline?: string | null;
  activities?: Activity[]; summary?: Record<string, number>;
  reviews?: { reference_id: string; action: string; actor_name: string; note: string; createdAt?: string; created_at?: string; revision: number }[];
};
type FollowUp = {
  reference_id?: string; state_code: string; reporting_year: string; reporting_month: string; issue: string; agreed_action: string;
  source_dashboard: string; accountable_owner: string; owner_user_id: string; deadline: string; status: string; outcome: string; evidence?: Evidence[]; can_update?: boolean; closure_date?: string;
};
const emptyActivity = (): Activity => ({ drive_type: "", activity_date: "", activity_category: "", specific_activity: "", location_category: "", location_name: "", exact_location: "", programs_supported: [], target_audience: [], other_audience: "", planned_target_audience: "", target_audience_reached: "", leads_generated: "", activity_status: "", status_reason: "", funding_option: "", activity_budget: "", approved_amount: "", activity_details: "", evidence_type: "", remarks: "" });
const toDraft = (row: Activity): Activity => Object.fromEntries(Object.entries({ ...emptyActivity(), ...row }).map(([key, value]) => [key, value ?? ""])) as Activity;
const editable = (batch: Batch | null) => !!batch && ["draft", "returned"].includes(batch.status);
const statusLabel = (value: string) => ({ awaiting_review: "Awaiting review", final_submit: "Final submission", send_for_review: "Sent for review", returned: "Returned", endorsed: "Endorsed", submitted: "Submitted", draft: "Draft", endorse: "Endorsed", return: "Returned" }[value] || value);
const inputClass = "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25";
const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const WORKFLOW_STEPS = [{ id: "period", label: "Reporting period" }, { id: "activities", label: "Record activities" }, { id: "beneficiaries", label: "Register beneficiaries" }, { id: "review", label: "Review" }];
const STATUS_TONES: Record<string, string> = { draft: "bg-slate-100 text-slate-600 border-slate-200", returned: "bg-rose-100 text-rose-700 border-rose-200", awaiting_review: "bg-amber-100 text-amber-800 border-amber-200", endorsed: "bg-teal-100 text-teal-800 border-teal-200", submitted: "bg-emerald-100 text-emerald-700 border-emerald-200" };
function StatusBadge({ status }: { status: string }) {
  return <Badge className={`text-[10px] px-2 py-0.5 inline-flex items-center gap-1 w-fit border ${STATUS_TONES[status] || STATUS_TONES.draft}`}>{status === "awaiting_review" ? <Clock className="w-3.5 h-3.5" /> : ["submitted", "endorsed"].includes(status) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}{statusLabel(status)}</Badge>;
}
export function Dropdown({ value, options, onChange, disabled, placeholder = "Select" }: { value: string; options: (string | { value: string; label: string })[]; onChange: (value: string) => void; disabled?: boolean; placeholder?: string }) {
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger displayValue={items.find((option) => option.value === value)?.label}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{items.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
function MultiPicker({ value, options, onChange, label }: { value: string[]; options: string[]; onChange: (value: string[]) => void; label: string }) {
  return <MultiSelectField label="" value={value} options={options} onChange={onChange} placeholder={`Select ${label}`} className="md:col-span-1" />;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <FieldSection title={title} gridClassName="grid gap-3 sm:grid-cols-2">{children}</FieldSection>;
}
function EvidenceFiles({ files }: { files: Evidence[] }) {
  const [loading, setLoading] = React.useState("");
  return <div className="flex flex-wrap gap-2">{files.map((file) => <Button key={file.reference_id} size="sm" variant="outline" disabled={!!loading} onClick={async () => {
    setLoading(file.reference_id);
    try {
      const blob = await api.download(file.reference_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = file.original_name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Download failed"); }
    finally { setLoading(""); }
  }}><Download className="mr-1 h-3 w-3" />{file.original_name}</Button>)}</div>;
}
function Metrics({ values }: { values: Record<string, number> }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[["planned", "Planned activities"], ["recorded", "Recorded activities"], ["conducted", "Completed activities"], ["reached", "Audience reached"], ["leads", "Leads"], ["enrolled", "Linked enrolments"]].map(([key, label]) => <div className="rounded-xl border border-[#d4e8dc] bg-white px-4 py-3" key={key}><p className="text-2xl font-bold tabular-nums text-[#0f3d2e]">{Number(values[key] || 0).toLocaleString()}</p><p className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</p></div>)}</div>;
}

export default function EnrolmentDriveWorkspace({ onBack, defaultStateId, defaultZoneId }: { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null }) {
  const authUser = useSelector((s: RootState) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [batch, setBatch] = React.useState<Batch | null>(null);
  const [mode, setMode] = React.useState<"register" | "batch" | "view" | "activity" | "enrolment" | "actions" | "legacy">("register");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const { searchInput, matchesSearch, setSearch } = useListSearch();
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterState, setFilterState] = React.useState("all");
  const [batchStep, setBatchStep] = React.useState(1);
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const [showCreate, setShowCreate] = React.useState(false);
  const [period, setPeriod] = React.useState({ state_code: defaultStateId || "", reporting_year: String(new Date().getFullYear()), reporting_month: String(new Date().getMonth() + 1), planned_activities: "" });
  const [planned, setPlanned] = React.useState("");
  const [draft, setDraft] = React.useState<Activity>(emptyActivity);
  const [files, setFiles] = React.useState<File[]>([]);
  const [activityFormKey, setActivityFormKey] = React.useState(0);
  const [link, setLink] = React.useState<Activity | null>(null);
  const [linkedReportId, setLinkedReportId] = React.useState<string | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reportingDeadline, setReportingDeadline] = React.useState("");
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [reportFilter, setReportFilter] = React.useState({ year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1) });
  const [actions, setActions] = React.useState<FollowUp[]>([]);
  const blankAction = (seed?: { state_code?: string; issue?: string }): FollowUp => ({
    state_code: seed?.state_code || batch?.state_code || period.state_code,
    reporting_year: String(batch?.reporting_year || period.reporting_year),
    reporting_month: String(batch?.reporting_month || period.reporting_month),
    issue: seed?.issue || "",
    agreed_action: "",
    source_dashboard: "Enrolment Drives",
    accountable_owner: "",
    owner_user_id: "",
    deadline: "",
    status: "Open",
    outcome: "",
  });
  const [actionDraft, setActionDraft] = React.useState<FollowUp | null>(null);
  const [actionFiles, setActionFiles] = React.useState<File[]>([]);
  const [actionEvidenceType, setActionEvidenceType] = React.useState("Field Report");
  const [historical, setHistorical] = React.useState<any[]>([]);
  const [activityErrors, setActivityErrors] = React.useState<Record<string, string>>({});
  const [expandedActivityId, setExpandedActivityId] = React.useState<string | null>(null);
  const activityFormRef = React.useRef<HTMLDivElement>(null);
  const permissions = catalogue?.permissions || { create: false, review: false, manage: false };
  const canEdit = editable(batch) && permissions.create;

  const validateActivity = (): boolean => {
    const errs: Record<string, string> = {};
    if (!draft.drive_type) errs.drive_type = "Drive type is required";
    if (!draft.activity_date) errs.activity_date = "Activity date is required";
    if (!draft.activity_category) errs.activity_category = "Activity category is required";
    if (!draft.specific_activity.trim()) errs.specific_activity = "Specify activity is required";
    if (!draft.programs_supported || draft.programs_supported.length === 0) {
      errs.programs_supported = "Select at least one programme supported";
    }

    if (!draft.location_category) errs.location_category = "Location category is required";
    if (!draft.location_name) errs.location_name = "Location name is required";
    if (!draft.exact_location.trim()) errs.exact_location = "Specific exact location is required";
    if (!draft.target_audience || draft.target_audience.length === 0) {
      errs.target_audience = "Select at least one target audience";
    }
    if (draft.target_audience?.includes("Others (specify)") && !draft.other_audience.trim()) {
      errs.other_audience = "Please specify other audience";
    }

    if (!draft.funding_option) errs.funding_option = "Funding option is required";
    if (draft.funding_option === catalogue?.funding?.[1]) {
      if (!draft.activity_budget) errs.activity_budget = "Activity budget is required";
      if (!draft.approved_amount) errs.approved_amount = "Approved amount is required";
    }
    if (!draft.activity_status) errs.activity_status = "Activity status is required";
    if (["Not Conducted", "Deferred", "Cancelled"].includes(draft.activity_status) && !draft.status_reason.trim()) {
      errs.status_reason = "Reason is required for this status";
    }
    if (!draft.activity_details.trim()) errs.activity_details = "Activity details are required";
    if (!draft.evidence_type) errs.evidence_type = "Supporting evidence type is required";
    if (draft.activity_status === "Completed" && !files.length && !draft.evidence?.length) {
      errs.evidence = "Supporting evidence is required for completed activities";
    }

    setActivityErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const run = async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError("");
    try { return await operation(); }
    catch (failure) { const message = failure instanceof Error ? failure.message : "The request failed"; setError(message); toast.error(message); return undefined; }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    const [config, list] = await Promise.all([api.catalogue(), api.batches()]);
    setCatalogue(config.data); setBatches(list.data);
  };
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([api.catalogue(), api.batches()]).then(([config, list]) => { if (!cancelled) { setCatalogue(config.data); setBatches(list.data); } }).catch((failure) => { if (!cancelled) setError(failure.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  React.useEffect(() => {
    if (catalogue?.states.length === 1) setPeriod((current) => current.state_code ? current : { ...current, state_code: catalogue.states[0].code });
  }, [catalogue]);
  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab !== "actions" || !catalogue) return;
    const stateCode = searchParams.get("state") || defaultStateId || "";
    const issue = searchParams.get("issue") || "";
    void run(async () => {
      setActions((await api.actions()).data);
      setMode("actions");
      if (catalogue.permissions?.manage) {
        setActionDraft(blankAction({ state_code: stateCode || undefined, issue: issue || undefined }));
        setActionFiles([]);
      }
      setSearchParams({}, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue, searchParams]);
  const openBatch = async (id: string, preferredStep?: number) => {
    const response = await api.batch(id);
    const step = preferredStep ?? (["awaiting_review", "endorsed", "submitted"].includes(response.data.status) ? 3 : 1);
    setBatch(response.data); setPlanned(String(response.data.planned_activities ?? "")); setReportingDeadline(response.data.reporting_deadline || ""); setBatchStep(step); setReviewNote("");
    setDraft(emptyActivity()); setFiles([]); setActivityErrors({});
    if (preferredStep !== undefined) {
      setMode("batch");
    } else {
      setMode("view");
    }
  };
  const navigate = (next: typeof mode) => run(async () => {
    setSearch(""); setShowCreate(false);
    if (next === "register") await refresh();
    if (next === "actions") { setActions((await api.actions()).data); setActionDraft(null); }
    if (next === "legacy") setHistorical((await api.legacy()).data);
    setMode(next);
  });
  const persistActivity = async (complete: boolean, clearAfter: boolean) => {
    if (!batch) return;
    if (complete) {
      if (!validateActivity()) return;
      if (!catalogue?.drive_types.some((type) => type.key === draft.drive_type)) throw new Error("Select a drive type before saving the activity");
      if (draft.activity_status === "Completed" && !files.length && !draft.evidence?.length) throw new Error("Select supporting evidence for the completed activity");
    } else if (!draft.drive_type && !draft.activity_category && !draft.specific_activity.trim()) {
      throw new Error("Enter at least a drive type or activity details before saving a draft");
    }
    const response = await api.saveActivity(batch.reference_id, draft.reference_id, { ...draft, complete });
    const id = response.data.reference_id as string;
    if (files.length) {
      if (!draft.evidence_type) throw new Error("Select an evidence type before uploading files");
      await api.evidence("activities", id, draft.evidence_type, files);
      setFiles([]);
    }
    const finalBatch = (await api.batch(batch.reference_id)).data as Batch;
    setBatch(finalBatch);
    if (clearAfter) {
      toast.success(complete ? "Activity saved. Add another activity below." : "Draft activity saved");
      setDraft(emptyActivity());
      setActivityFormKey((value) => value + 1);
      setActivityErrors({});
    } else {
      const saved = finalBatch.activities?.find((activity) => activity.reference_id === id);
      if (saved) setDraft(toDraft(saved));
      toast.success(complete ? "Activity saved" : "Draft activity saved");
      setActivityErrors({});
    }
    setBatchStep(1);
    setMode("batch");
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const saveActivity = () => run(async () => { await persistActivity(true, false); });
  const saveActivityDraft = () => run(async () => { await persistActivity(false, false); });
  const addAnotherActivity = () => run(async () => { await persistActivity(true, true); });
  const requireActivityListed = () => {
    if (canEdit && (hasPendingDriveActivity(draft) || files.length)) throw new Error("Save the current activity before continuing, or cancel the entry.");
  };
  const saveReportDraft = () => run(async () => {
    if (canEdit && (hasPendingDriveActivity(draft) || files.length)) {
      await persistActivity(false, false);
    }
    await refresh();
    toast.success("Report draft kept in register");
    setMode("register");
  });
  const leaveActivityForm = (step: number) => run(async () => {
    requireActivityListed();
    if (step >= 2 && !batch?.activities?.length) throw new Error("Add at least one activity to the list before continuing.");
    if (step === 1) return;
    setBatchStep(step); setMode("batch");
  });
  const transition = (action: string) => run(async () => {
    if (!batch) return;
    const response = await api.transition(batch.reference_id, { action, note: reviewNote, revision: batch.revision });
    setBatch(response.data); setReviewNote(""); toast.success(statusLabel(action)); await refresh();
  });
  const goToBatchStep = (next: number) => run(async () => {
    if (batch && batchStep === 0 && canEdit && planned !== String(batch.planned_activities ?? "")) {
      setBatch((await api.updateBatch(batch.reference_id, { planned_activities: planned, revision: batch.revision })).data);
    }
    setBatchStep(next);
    setMode("batch");
  });
  const set = <K extends keyof Activity>(key: K, value: Activity[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (activityErrors[key as string]) {
      setActivityErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };
  const startActivity = (activity?: Activity) => {
    setDraft(activity ? toDraft(activity) : emptyActivity());
    setFiles([]);
    setActivityFormKey((value) => value + 1);
    setActivityErrors({});
    setBatchStep(1);
    setMode("batch");
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const stateOptions = catalogue?.states.map((state) => ({ value: state.code, label: state.description })) || [];
  const stateName = (code: string) => catalogue?.states.find((state) => state.code === code)?.description || code;
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: monthLabel(index + 1) }));
  const periodFiltered = batches.filter((row) => (filterYear === "all" || String(row.reporting_year) === filterYear) && (filterMonth === "all" || String(row.reporting_month) === filterMonth) && (filterState === "all" || row.state_code === filterState));
  const filteredBatches = periodFiltered.filter((row) => (filterStatus === "all" || row.status === filterStatus) && matchesSearch([row, stateName(row.state_code), monthLabel(row.reporting_month), statusLabel(row.status)]));
  const listMode = ["register", "actions", "legacy"].includes(mode) && !showCreate && !actionDraft;
  const handleBack = () => {
    if (showCreate) setShowCreate(false);
    else if (mode === "view") setMode("register");
    else if (mode === "batch" && batchStep > 0) {
      setBatchStep(batchStep - 1);
    }
    else if (mode === "batch") setMode("register");
    else if (actionDraft) setActionDraft(null);
    else if (mode === "register") onBack();
    else void navigate("register");
  };
  const pageTitle = showCreate ? "New Enrolment Drive Report" : mode === "actions" && actionDraft ? "Management Follow-up" : "Enrolment Drives";
  const geoInfo = (current?: Batch) => {
    const stateCode = current?.state_code || period.state_code;
    const zoneCode = current?.zonal_code || catalogue?.states.find((state) => state.code === stateCode)?.zonal_code || "";
    const zoneName = catalogue?.zones?.find((zone) => zone.zonal_code === zoneCode)?.description || zoneCode;
    const officerName = current?.reporting_officer || authUser?.name || authUser?.staff_id || "—";
    return <Section title="Reporting information">
      <Field label="State / FCT" required><Dropdown value={stateCode} options={stateOptions} onChange={(value) => setPeriod((previous) => ({ ...previous, state_code: value }))} disabled={!!current || catalogue?.states.length === 1} placeholder="Select State / FCT" /></Field>
      <Field label="Zone"><Input value={zoneName} readOnly placeholder="Auto-derived from State" /></Field>
      <Field label="Reporting month" required><Input type="month" min="2000-01" max="2100-12" disabled={!!current} value={driveReportingMonth(current?.reporting_year ?? period.reporting_year, current?.reporting_month ?? period.reporting_month)} onChange={(event) => setPeriod((previous) => ({ ...previous, ...driveReportingPeriod(event.target.value) }))} /></Field>
      <Field label="Reporting officer"><Input value={officerName} readOnly placeholder="Name / login identity" /></Field>
      <Field label="Number of planned activities"><Input type="number" min={0} step={1} value={current ? planned : period.planned_activities} disabled={!!current && (!canEdit || batchStep !== 0 || mode !== "batch")} onChange={(event) => current ? setPlanned(event.target.value) : setPeriod((previous) => ({ ...previous, planned_activities: event.target.value }))} placeholder="Enter once" /></Field>
      <Field label="Reporting batch ID"><Input value={current?.reference_id || "System-generated after continue"} readOnly placeholder="System-generated" /></Field>
    </Section>;
  };

  const activityTable = (inline = false) => {
    if (!batch) return null;
    const registration = !inline && batchStep === 2;
    const review = !inline && batchStep === 3;
    const activitiesCount = batch.activities?.length || 0;

    const table = (
      <Table>
        <TableHeader>
          <TableRow className="bg-[#eef6f1] hover:bg-[#eef6f1]">
            {["Date", "Activity Category", "Specific Activity", "Audience reached", "Leads", "Enrolments", "Status", "Action"].map((label) => (
              <TableHead key={label} className={`text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap ${label === "Action" ? "text-right" : ""}`}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {batch.activities?.map((activity) => {
            const isExpanded = expandedActivityId === activity.reference_id;
            return (
              <React.Fragment key={activity.reference_id}>
                <TableRow
                  className={cn(
                    "cursor-pointer hover:bg-[#f4f7f5] border-b border-[#e8f3ec] transition-colors",
                    isExpanded && "bg-[#f0faf4]"
                  )}
                  onClick={() => setExpandedActivityId(isExpanded ? null : activity.reference_id)}
                >
                  <TableCell className="text-sm whitespace-nowrap">{activity.activity_date || "—"}</TableCell>
                  <TableCell className="min-w-[150px]">
                    <p className="text-sm font-semibold text-[#0f3d2e]">{activity.activity_category || "Draft activity"}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{activity.reference_id}</p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={activity.specific_activity}>
                    {activity.specific_activity || "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{activity.target_audience_reached != null ? formatCount(activity.target_audience_reached) : 0}</TableCell>
                  <TableCell className="text-sm tabular-nums">{activity.leads_generated != null ? formatCount(activity.leads_generated) : 0}</TableCell>
                  <TableCell className="text-sm font-semibold text-[#145c3f] tabular-nums">{activity.enrolment_count != null ? formatCount(activity.enrolment_count) : 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${activity.activity_status === "Completed" ? STATUS_TONES.submitted : STATUS_TONES.draft}`}>
                      {activity.activity_status || "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {canEdit && mode === "batch" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-[#145c3f]"
                          disabled={busy}
                          onClick={() => startActivity(activity)}
                        >
                          <Pencil className="w-3.5 h-3.5" /> View / Edit
                        </Button>
                      )}
                      {registration && canEdit && (activity.programs_supported?.length || 0) > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 border-[#d4e8dc] text-[#145c3f] text-xs"
                          disabled={busy}
                          onClick={() => { setLink(activity); setLinkedReportId(null); setMode("enrolment"); }}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Register beneficiaries
                        </Button>
                      )}
                      <ChevronDown className={cn(
                        "w-4 h-4 text-[#145c3f] transition-transform inline-block",
                        isExpanded && "rotate-180"
                      )} />
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="p-0">
                      <div className="space-y-4 p-4 bg-[#f8fbf9] border-t border-[#e8f3ec]">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Activity details</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <ReviewRow label="Drive Type" value={catalogue?.drive_types.find((t) => t.key === activity.drive_type)?.title || activity.drive_type} />
                            <ReviewRow label="Category" value={activity.activity_category} />
                            <ReviewRow label="Date" value={activity.activity_date} />
                            <ReviewRow label="Specific activity" value={activity.specific_activity} />
                            <ReviewRow label="Programmes" value={activity.programs_supported?.join(", ")} />
                            <ReviewRow label="Status" value={activity.activity_status} />
                            {activity.status_reason && <ReviewRow label="Reason" value={activity.status_reason} />}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Audience & location reach</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <ReviewRow label="Location category" value={activity.location_category} />
                            <ReviewRow label="Location name" value={activity.location_name} />
                            <ReviewRow label="Exact location" value={activity.exact_location} />
                            <ReviewRow label="Target audience" value={activity.target_audience?.join(", ")} />
                            <ReviewRow label="Planned audience" value={activity.planned_target_audience != null ? formatCount(activity.planned_target_audience) : null} />
                            <ReviewRow label="Audience reached" value={activity.target_audience_reached != null ? formatCount(activity.target_audience_reached) : null} />
                            <ReviewRow label="Leads generated" value={activity.leads_generated != null ? formatCount(activity.leads_generated) : null} />
                            <ReviewRow label="New enrolments" value={activity.enrolment_count != null ? formatCount(activity.enrolment_count) : null} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Funding & evidence</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <ReviewRow label="Funding option" value={activity.funding_option} />
                            {activity.activity_budget && <ReviewRow label="Budget" value={`₦${formatAmount(activity.activity_budget)}`} />}
                            {activity.approved_amount && <ReviewRow label="Approved amount" value={`₦${formatAmount(activity.approved_amount)}`} />}
                            <ReviewRow label="Evidence type" value={activity.evidence_type} />
                          </div>
                        </div>
                        {activity.activity_details && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Activity details</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{activity.activity_details}</p>
                          </div>
                        )}
                        {!!activity.evidence?.length && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Supporting evidence files</p>
                            <EvidenceFiles files={activity.evidence} />
                          </div>
                        )}
                        {activity.remarks && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Remarks</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{activity.remarks}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {review && !!activity.evidence?.length && !isExpanded && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-[#f8fdfb]">
                      <EvidenceFiles files={activity.evidence} />
                    </TableCell>
                  </TableRow>
                )}
                {registration && activity.enrolment_records?.map((record) => (
                  <TableRow key={record.reference_id} className="bg-[#f8fdfb] text-xs text-slate-500">
                    <TableCell colSpan={2}><span className="font-mono">{record.reference_id}</span></TableCell>
                    <TableCell colSpan={2}>{monthLabel(record.reporting_month)} {record.reporting_year}</TableCell>
                    <TableCell>{record.enrolment_count} beneficiaries</TableCell>
                    <TableCell>{record.status}</TableCell>
                    <TableCell className="text-right" colSpan={2}>
                      {canEdit && record.status === "draft" && (
                        <Button size="sm" variant="ghost" className="h-7 text-[#145c3f]" onClick={() => { setLink(activity); setLinkedReportId(record.reference_id); setMode("enrolment"); }}>
                          Resume draft
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    );

    if (inline) return <div className="overflow-x-auto rounded-xl border border-[#d4e8dc]">{table}</div>;

    return (
      <Card className="rounded-xl border border-[#d4e8dc] shadow-sm overflow-hidden">
        <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
            {registration ? "Beneficiary Registration" : "Activity Register"}
          </h3>
          <p className="text-[11px] text-[#145c3f]">
            {activitiesCount} activit{activitiesCount === 1 ? "y" : "ies"} recorded
          </p>
        </div>
        <CardContent className="p-0 bg-white">
          {activitiesCount === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {canEdit && batchStep === 1
                ? "No activities added to the list yet. Complete the form above and click 'Add to list'."
                : "No activities recorded for this report."}
            </div>
          ) : (
            <div className="overflow-x-auto">{table}</div>
          )}
          {canEdit && !registration && !review && batchStep !== 1 && (
            <div className="px-4 py-3 border-t border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2 bg-[#f4f7f5]">
              <Button
                variant="outline"
                className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                onClick={() => startActivity()}
              >
                <Plus className="w-4 h-4" /> Add Activity
              </Button>
              <p className="text-[11px] text-slate-500">
                Activity count is calculated from saved records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (mode === "enrolment" && link?.reference_id && batch) return <EnrolmentActivityForm
    reportId={linkedReportId} initialCategory="enrolment" defaultStateId={batch.state_code} defaultZoneId={batch.zonal_code}
    driveContext={{ reference_id: link.reference_id, programs_supported: link.programs_supported }}
    onBack={() => { setMode("batch"); void run(() => openBatch(batch.reference_id, 2)); }}
    onCancel={() => { setMode("batch"); void run(() => openBatch(batch.reference_id, 2)); }}
    onSubmitted={() => { setMode("batch"); void run(() => openBatch(batch.reference_id, 2)); }}
  />;

  return <div className="flex flex-col h-full bg-[#f4f7f5]">
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full shrink-0" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
        <div className="min-w-0"><h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">{pageTitle}</h2><p className="text-xs text-slate-500 truncate">{batch && ["batch", "activity", "view"].includes(mode) ? `${stateName(batch.state_code)} · ${monthLabel(batch.reporting_month)} ${batch.reporting_year} · ${statusLabel(batch.status)}` : permissions.review ? "Review and endorse enrolment drive reports" : "Record activities, register beneficiaries and submit reports"}</p></div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mode === "view" && batch && (
          <>
            <StatusBadge status={batch.status} />
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                onClick={() => { setBatchStep(1); setMode("batch"); }}
              >
                <Pencil className="w-4 h-4" /> {batch.status === "returned" ? "Edit & Resubmit" : "Edit Report"}
              </Button>
            )}
          </>
        )}
        {(listMode || mode === "batch" || mode === "view") && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy || loading}
            className="gap-2 border-[#d4e8dc]"
            onClick={() => void run(async () => {
              if (mode === "view" && batch) await openBatch(batch.reference_id);
              else if (mode === "batch" && batch) await openBatch(batch.reference_id, batchStep);
              else {
                await refresh();
                if (mode === "actions") setActions((await api.actions()).data);
                if (mode === "legacy") setHistorical((await api.legacy()).data);
              }
            })}
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />Refresh
          </Button>
        )}
        {mode === "register" && !showCreate && permissions.create && <Button disabled={busy} className={ACTION} onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Enrolment Drive Report</Button>}
        {mode === "batch" && canEdit && batchStep === 1 && <Button disabled={busy} className={ACTION} onClick={() => startActivity()}><Plus className="w-4 h-4" />Add activity</Button>}
        {mode === "batch" && canEdit && batchStep === 1 && (
          <Button variant="outline" size="sm" className="gap-2 border-[#d4e8dc] text-[#145c3f]" disabled={busy} onClick={() => void saveReportDraft()}>
            <Save className="w-4 h-4" />Save Draft
          </Button>
        )}
        {mode === "actions" && !actionDraft && permissions.manage && <Button className={ACTION} disabled={busy} onClick={() => { setActionDraft(blankAction()); setActionFiles([]); }}><Plus className="w-4 h-4" />Record Action</Button>}
      </div>
    </div>
    {listMode && <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20"><div className="flex gap-0 overflow-x-auto -mb-px" role="tablist" aria-label="Enrolment Drive sections">
      {[{ key: "register", label: "Enrolment Drives", icon: ClipboardList }, { key: "actions", label: "Management Follow-up", icon: Users }, { key: "legacy", label: "Historical Activities", icon: History }].map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" aria-selected={mode === key} disabled={busy} onClick={() => void navigate(key as typeof mode)} className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${mode === key ? "border-[#145c3f] text-[#145c3f]" : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"}`}><Icon className={`h-4 w-4 shrink-0 ${mode === key ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`} />{label}{key === "register" && <span className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${mode === key ? "bg-[#e8f6ee] text-[#145c3f]" : "bg-slate-100 text-slate-500"}`}>{batches.length}</span>}</button>)}
    </div></div>}
    <ScrollArea className="flex-1"><div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
    {loading ? <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading reports...</span></div> : !catalogue ? <Button onClick={() => void run(async () => { await refresh(); })}>Retry</Button> : <>
      {mode === "register" && <>
        {showCreate ? <>
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
            {geoInfo()}
            <div className="border-t border-[#e8f3ec] pt-4"><StateOfficeFormSteps steps={WORKFLOW_STEPS} activeIndex={0} onStepChange={() => {}} /></div>
          </CardContent></Card>
          <div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button className={ACTION} disabled={busy || !period.state_code || !driveReportingMonth(period.reporting_year, period.reporting_month)} onClick={() => void run(async () => { const response = await api.createBatch(period); setShowCreate(false); await refresh(); await openBatch(response.data.reference_id, 1); })}>Continue<ArrowRight className="w-4 h-4" /></Button></div>
        </> : <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[{ label: "Total", count: periodFiltered.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" }, { label: "Draft / Returned", count: periodFiltered.filter((row) => ["draft", "returned"].includes(row.status)).length, tone: "text-slate-600 bg-white border-slate-200" }, { label: "Awaiting review", count: periodFiltered.filter((row) => row.status === "awaiting_review").length, tone: "text-amber-800 bg-amber-50/80 border-amber-100" }, { label: "Endorsed", count: periodFiltered.filter((row) => row.status === "endorsed").length, tone: "text-teal-800 bg-teal-50/80 border-teal-100" }, { label: "Submitted", count: periodFiltered.filter((row) => row.status === "submitted").length, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" }].map((item) => <div className={`rounded-xl border px-4 py-3 ${item.tone}`} key={item.label}><p className="text-2xl font-bold tabular-nums">{item.count}</p><p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.label}</p></div>)}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#d4e8dc] bg-white px-4 py-4">
            {catalogue.states.length > 1 && <div className="flex-1 min-w-[150px]"><Dropdown value={filterState} onChange={setFilterState} options={[{ value: "all", label: "All States" }, ...stateOptions]} /></div>}
            <div className="flex-1 min-w-[130px]"><Dropdown value={filterYear} onChange={setFilterYear} options={[{ value: "all", label: "All Years" }, ...yearOptions.map((value) => ({ value, label: value }))]} /></div>
            <div className="flex-1 min-w-[130px]"><Dropdown value={filterMonth} onChange={setFilterMonth} options={[{ value: "all", label: "All Months" }, ...monthOptions]} /></div>
            <div className="flex-1 min-w-[150px]"><Dropdown value={filterStatus} onChange={setFilterStatus} options={[{ value: "all", label: "All Statuses" }, ...Object.keys(STATUS_TONES).map((value) => ({ value, label: statusLabel(value) }))]} /></div>
          </div>
          {searchInput}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">{filteredBatches.length} report{filteredBatches.length !== 1 ? "s" : ""}</CardTitle></CardHeader><CardContent className="p-0">
            {filteredBatches.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["Period", "State", "Quarter", "Planned", "Activities", "Status", "Action"].map((label) => <TableHead key={label} className={`text-xs font-bold text-slate-600 whitespace-nowrap ${label === "Action" ? "text-right" : ""}`}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
              {filteredBatches.map((row) => <TableRow key={row.reference_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0"><TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{monthLabel(row.reporting_month)} {row.reporting_year}</TableCell><TableCell className="text-sm text-slate-700">{stateName(row.state_code)}</TableCell><TableCell className="text-sm text-slate-500">Q{quarterFromMonth(row.reporting_month)}</TableCell><TableCell className="text-sm tabular-nums">{row.planned_activities ?? "—"}</TableCell><TableCell className="text-sm font-semibold text-[#145c3f] tabular-nums">{row.activity_count || 0}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" disabled={busy} onClick={() => void run(() => openBatch(row.reference_id))}><Eye className="w-3.5 h-3.5" />View</Button></TableCell></TableRow>)}
            </TableBody></Table></div> : <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400"><FileText className="w-8 h-8 opacity-30" /><p className="text-sm font-medium">No reports found for these filters.</p></div>}
          </CardContent></Card>
        </>}
      </>}
      {mode === "view" && batch && (
        <div className="space-y-4">
          <SectionBand title="Report Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReviewRow label="Reporting period" value={`${monthLabel(batch.reporting_month)} ${batch.reporting_year} (Q${quarterFromMonth(batch.reporting_month)})`} />
              <ReviewRow label="State / Zone" value={`${stateName(batch.state_code)} · ${catalogue?.zones?.find((z) => z.zonal_code === batch.zonal_code)?.description || batch.zonal_code || "—"}`} />
              <ReviewRow label="Planned activities" value={batch.planned_activities != null ? formatCount(batch.planned_activities) : "—"} />
              <ReviewRow label="Activities recorded" value={formatCount(batch.activities?.length || 0)} />
              <ReviewRow label="Reporting officer" value={batch.reporting_officer || "—"} />
              <ReviewRow label="Reporting batch ID" value={batch.reference_id} />
              <ReviewRow label="Submission date" value={batch.submitted_at ? formatDate(batch.submitted_at) : "—"} />
              <ReviewRow label="Reporting deadline" value={batch.reporting_deadline || "—"} />
              <ReviewRow label="Status" value={statusLabel(batch.status)} />
            </div>
          </SectionBand>

          <SectionBand title="Activity Register">
            <div className="-m-4">
              <div className="px-4 py-2 border-b border-[#d4e8dc] flex items-center justify-between bg-white">
                <p className="text-xs text-slate-500">
                  Click any activity row to view full details, reach, and evidence.
                </p>
                <p className="text-[11px] text-[#145c3f] font-semibold">
                  {formatCount(batch.activities?.length || 0)} activit{(batch.activities?.length || 0) === 1 ? "y" : "ies"} recorded
                </p>
              </div>
              {activityTable(true)}
            </div>
          </SectionBand>

          <SectionBand title="Beneficiary Registration">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#d4e8dc]">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Total Linked Enrolments</p>
                  <p className="text-2xl font-bold text-[#145c3f] tabular-nums mt-0.5">
                    {formatCount(batch.activities?.reduce((acc, a) => acc + Number(a.enrolment_count || 0), 0) || 0)}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                    onClick={() => { setBatchStep(2); setMode("batch"); }}
                  >
                    <Users className="w-4 h-4" /> Manage Beneficiaries
                  </Button>
                )}
              </div>
            </div>
          </SectionBand>

          <SectionBand title="Review and Sign-off">
            <div className="space-y-4">
              {permissions.review && batch.status === "awaiting_review" && (
                <Field label="Review comment" required className="sm:col-span-2">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Enter your review comment"
                  />
                </Field>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    className="gap-2 border-[#1a7a52] text-[#0f3d2e]"
                    onClick={() => { setBatchStep(1); setMode("batch"); }}
                  >
                    <Pencil className="w-4 h-4" /> {batch.status === "returned" ? "Edit & Resubmit" : "Edit Report"}
                  </Button>
                )}
                {canEdit && batch.status === "draft" && (
                  <Button
                    className={ACTION}
                    disabled={busy || !batch.activities?.length}
                    onClick={() => void transition("send_for_review")}
                  >
                    <Send className="mr-2 h-4 w-4" /> Send for review
                  </Button>
                )}
                {permissions.review && batch.status === "awaiting_review" && (
                  <>
                    <Button variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => void transition("return")}>
                      Return for correction
                    </Button>
                    <Button className={ACTION} disabled={busy || !reviewNote.trim()} onClick={() => void transition("endorse")}>
                      Endorse report
                    </Button>
                  </>
                )}
                {permissions.create && batch.status === "endorsed" && (
                  <Button className={ACTION} disabled={busy} onClick={() => void transition("final_submit")}>
                    Final submit
                  </Button>
                )}
              </div>
              {!!batch.reviews?.length && (
                <div className="space-y-2">
                  {batch.reviews.map((review) => (
                    <div key={review.reference_id} className="rounded-lg bg-white border border-[#d4e8dc] p-3 text-sm">
                      <strong>{statusLabel(review.action)}</strong> · {review.actor_name} · Revision {review.revision}
                      <p className="text-slate-600 mt-1">{review.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionBand>
        </div>
      )}
      {mode === "batch" && batch && <>
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-4">
          {geoInfo(batch)}
          <div className="border-t border-[#e8f3ec] pt-4"><StateOfficeFormSteps steps={WORKFLOW_STEPS} activeIndex={batchStep} maximumIndex={3} onStepChange={(step) => void goToBatchStep(step)} /></div>
          {batchStep === 0 && canEdit && <div className="flex justify-end"><Button variant="outline" disabled={busy} onClick={() => void run(async () => { const response = await api.updateBatch(batch.reference_id, { planned_activities: planned, revision: batch.revision }); setBatch(response.data); toast.success("Plan saved"); })}><Save className="w-4 h-4 mr-2" />Save plan</Button></div>}
        </CardContent></Card>
        {permissions.manage && batchStep === 3 && <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#d4e8dc] bg-white p-4"><Field label="Reporting deadline"><Input type="date" value={reportingDeadline} onChange={(event) => setReportingDeadline(event.target.value)} /></Field><Button variant="outline" disabled={busy || !reportingDeadline} onClick={() => void run(async () => { const response = await api.deadline(batch.reference_id, { reporting_deadline: reportingDeadline, revision: batch.revision }); setBatch(response.data); toast.success("Reporting deadline saved"); })}>Save deadline</Button></div>}
        {batchStep === 3 && <Metrics values={batch.summary || {}} />}
        {batchStep === 1 && canEdit && (
          <div ref={activityFormRef} className="space-y-4">
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible">
              <div className="bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0f3d2e]">
                    {draft.reference_id ? "Edit Activity" : "New Activity"}
                  </h3>
                  {draft.reference_id && (
                    <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#d4e8dc] text-[#145c3f]">
                      {draft.reference_id}
                    </span>
                  )}
                </div>
                {draft.reference_id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-slate-800"
                    onClick={() => startActivity()}
                  >
                    Cancel edit
                  </Button>
                ) : hasPendingDriveActivity(draft) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-slate-800"
                    onClick={() => startActivity()}
                  >
                    Clear form
                  </Button>
                ) : null}
              </div>
              <CardContent className="p-4 md:p-5 space-y-6">
                <fieldset disabled={busy || !canEdit} className="space-y-6">
                  {/* Drive & Activity Details */}
                  <FieldSection title="Drive & Activity Details">
                    <Field label="Drive type" required error={activityErrors.drive_type} className="sm:col-span-2 lg:col-span-3">
                      <Dropdown
                        value={draft.drive_type}
                        options={catalogue?.drive_types.map((type) => ({ value: type.key, label: type.title })) || []}
                        onChange={(value) => setDraft((current) => ({ ...current, drive_type: value, activity_category: "" }))}
                        placeholder="Select drive type"
                      />
                    </Field>
                    <Field label="Activity date" required error={activityErrors.activity_date}>
                      <Input type="date" value={draft.activity_date} onChange={(event) => set("activity_date", event.target.value)} />
                    </Field>
                    <Field label="Activity category" required error={activityErrors.activity_category}>
                      <Dropdown
                        value={draft.activity_category}
                        options={catalogue?.drive_types.find((type) => type.key === draft.drive_type)?.categories.map((category) => category.label) || []}
                        onChange={(value) => set("activity_category", value)}
                        disabled={!draft.drive_type}
                        placeholder="Select activity category"
                      />
                    </Field>
                    <Field label="Specify activity" required error={activityErrors.specific_activity}>
                      <Input value={draft.specific_activity} maxLength={255} placeholder="Enter the activity conducted" onChange={(event) => set("specific_activity", event.target.value)} />
                    </Field>
                    <Field label="Programmes supported" required error={activityErrors.programs_supported} className="sm:col-span-2 lg:col-span-3">
                      <MultiPicker value={draft.programs_supported} options={catalogue?.programmes || []} onChange={(value) => set("programs_supported", value)} label="programmes" />
                    </Field>
                  </FieldSection>

                  {/* Audience & Location Reach */}
                  <FieldSection title="Audience & Location Reach">
                    <Field label="Location category" required error={activityErrors.location_category}>
                      <Dropdown
                        value={draft.location_category}
                        options={Object.keys(catalogue?.locations || {})}
                        onChange={(value) => setDraft((current) => ({ ...current, location_category: value, location_name: "" }))}
                        placeholder="Select location category"
                      />
                    </Field>
                    <Field label="Location name" required error={activityErrors.location_name}>
                      <Dropdown
                        value={draft.location_name}
                        options={catalogue?.locations[draft.location_category] || []}
                        onChange={(value) => set("location_name", value)}
                        disabled={!draft.location_category}
                        placeholder="Select location"
                      />
                    </Field>
                    <Field label="Specify exact location" required error={activityErrors.exact_location}>
                      <Input value={draft.exact_location} maxLength={500} onChange={(event) => set("exact_location", event.target.value)} placeholder="Enter the venue or address" />
                    </Field>
                    <Field label="Target audience" required error={activityErrors.target_audience} className="sm:col-span-2 lg:col-span-3">
                      <MultiPicker value={draft.target_audience} options={catalogue?.audiences || []} onChange={(value) => set("target_audience", value)} label="audiences" />
                    </Field>
                    {draft.target_audience.includes("Others (specify)") && (
                      <Field label="Specify audience" required error={activityErrors.other_audience} className="sm:col-span-2 lg:col-span-3">
                        <Input value={draft.other_audience} maxLength={255} onChange={(event) => set("other_audience", event.target.value)} placeholder="Enter the target audience" />
                      </Field>
                    )}
                    <Field label="Planned audience">
                      <Input type="number" min={0} step={1} value={draft.planned_target_audience} onChange={(event) => set("planned_target_audience", event.target.value)} />
                    </Field>
                    <Field label="Audience reached">
                      <Input type="number" min={0} step={1} value={draft.target_audience_reached} onChange={(event) => set("target_audience_reached", event.target.value)} />
                    </Field>
                    <Field label="Leads generated">
                      <Input type="number" min={0} step={1} value={draft.leads_generated} onChange={(event) => set("leads_generated", event.target.value)} />
                    </Field>
                  </FieldSection>

                  {/* Funding, Status & Evidence */}
                  <FieldSection title="Funding, Status & Evidence">
                    <Field label="Funding option" required error={activityErrors.funding_option} className={draft.funding_option === catalogue?.funding[1] ? "" : "sm:col-span-2 lg:col-span-3"}>
                      <Dropdown
                        value={draft.funding_option}
                        options={catalogue?.funding || []}
                        onChange={(value) => setDraft((current) => ({ ...current, funding_option: value, ...(value === catalogue?.funding[1] ? {} : { activity_budget: "", approved_amount: "" }) }))}
                        placeholder="Select funding option"
                      />
                    </Field>
                    {draft.funding_option === catalogue?.funding[1] && (
                      <>
                        <Field label="Activity budget (₦)" required error={activityErrors.activity_budget}>
                          <Input type="number" min={0} step="0.01" value={draft.activity_budget} onChange={(event) => set("activity_budget", event.target.value)} />
                        </Field>
                        <Field label="Approved amount (₦)" required error={activityErrors.approved_amount}>
                          <Input type="number" min={0} step="0.01" value={draft.approved_amount} onChange={(event) => set("approved_amount", event.target.value)} />
                        </Field>
                      </>
                    )}
                    <Field label="Activity status" required error={activityErrors.activity_status}>
                      <Dropdown value={draft.activity_status} options={catalogue?.statuses || []} onChange={(value) => set("activity_status", value)} placeholder="Select activity status" />
                    </Field>
                    {["Not Conducted", "Deferred", "Cancelled"].includes(draft.activity_status) && (
                      <Field label="Reason" required error={activityErrors.status_reason} className="sm:col-span-2 lg:col-span-3">
                        <textarea className={inputClass} value={draft.status_reason} onChange={(event) => set("status_reason", event.target.value)} placeholder="Explain the activity status" />
                      </Field>
                    )}
                    <Field label="Activity details" required error={activityErrors.activity_details} className="sm:col-span-2 lg:col-span-3">
                      <textarea className={inputClass} rows={3} value={draft.activity_details} onChange={(event) => set("activity_details", event.target.value)} placeholder="Describe the activity" />
                    </Field>
                    <Field label="Supporting evidence type" required error={activityErrors.evidence_type}>
                      <Dropdown value={draft.evidence_type} options={catalogue?.evidence_types || []} onChange={(value) => set("evidence_type", value)} placeholder="Select evidence type" />
                    </Field>
                    <Field label="Supporting evidence" required={draft.activity_status === "Completed"} error={activityErrors.evidence}>
                      <Input key={activityFormKey} type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                      <p className="text-xs text-slate-500">Up to 10 files, 15 MB each.</p>
                    </Field>
                    <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                      <textarea className={inputClass} rows={2} value={draft.remarks} onChange={(event) => set("remarks", event.target.value)} placeholder="Enter any additional remarks" />
                    </Field>
                    <div className="rounded-lg bg-[#eef6f1] p-3 text-sm text-[#145c3f] sm:col-span-2 lg:col-span-3">Linked enrolments: <strong>{draft.enrolment_count || 0}</strong></div>
                    {!!draft.evidence?.length && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Existing evidence files</p>
                        <EvidenceFiles files={draft.evidence} />
                      </div>
                    )}
                  </FieldSection>
                </fieldset>

                {/* Form Action Footer — matches design: Save Draft / Save Activity / Add Another */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#e8f3ec]">
                  <div className="flex flex-wrap items-center gap-2">
                    {draft.reference_id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-slate-600"
                        disabled={busy}
                        onClick={() => startActivity()}
                      >
                        <ArrowLeft className="w-4 h-4" /> Cancel edit
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
                      disabled={busy || !canEdit}
                      onClick={() => void saveActivityDraft()}
                    >
                      <Save className="w-4 h-4" /> Save Draft
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                      disabled={busy || !canEdit}
                      onClick={() => void addAnotherActivity()}
                    >
                      <Plus className="w-4 h-4" /> Add Another Activity
                    </Button>
                    <Button
                      type="button"
                      className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-2 text-xs font-semibold shadow-xs"
                      disabled={busy || !canEdit}
                      onClick={() => void saveActivity()}
                    >
                      <Save className="w-4 h-4" /> {draft.reference_id ? "Update Activity" : "Save Activity"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {batchStep > 0 && activityTable()}
        {batchStep === 3 && <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4 md:p-5"><Section title="Review and sign-off">
          {permissions.review && batch.status === "awaiting_review" && <Field label="Review comment" required className="sm:col-span-2"><textarea className={inputClass} rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Enter your review comment" /></Field>}
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">{canEdit && <Button className={ACTION} disabled={busy} onClick={() => void transition("send_for_review")}><Send className="mr-2 h-4 w-4" />Send for review</Button>}{permissions.review && batch.status === "awaiting_review" && <><Button variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => void transition("return")}>Return for correction</Button><Button className={ACTION} disabled={busy || !reviewNote.trim()} onClick={() => void transition("endorse")}>Endorse report</Button></>}{permissions.create && batch.status === "endorsed" && <Button className={ACTION} disabled={busy} onClick={() => void transition("final_submit")}>Final submit</Button>}</div>
          <div className="space-y-2 sm:col-span-2">{batch.reviews?.map((review) => <div key={review.reference_id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{statusLabel(review.action)}</strong> · {review.actor_name} · Revision {review.revision}<p className="text-slate-600">{review.note}</p></div>)}</div>
        </Section></CardContent></Card>}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={busy} onClick={() => batchStep ? void goToBatchStep(batchStep - 1) : void navigate("register")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {batchStep < 3 && <Button className={ACTION} disabled={busy || (batchStep === 1 && !batch.activities?.length)} onClick={() => void goToBatchStep(batchStep + 1)}>{batchStep === 1 ? "Register beneficiaries" : batchStep === 2 ? "Review" : "Continue"}<ArrowRight className="w-4 h-4" /></Button>}
        </div>
      </>}
      {mode === "actions" && <>
        {actionDraft && <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5"><Section title={actionDraft.reference_id || "New management action"}>
          <Field label="State" required><Dropdown value={actionDraft.state_code} options={stateOptions} disabled={!!actionDraft.reference_id} onChange={(value) => setActionDraft({ ...actionDraft, state_code: value })} /></Field>
          <Field label="Reporting month" required><Dropdown value={actionDraft.reporting_month} options={monthOptions} disabled={!!actionDraft.reference_id} onChange={(value) => setActionDraft({ ...actionDraft, reporting_month: value })} /></Field>
          <Field label="Reporting year" required><Input type="number" min={2000} max={2100} disabled={!!actionDraft.reference_id} value={actionDraft.reporting_year} onChange={(event) => setActionDraft({ ...actionDraft, reporting_year: event.target.value })} /></Field>
          <Field label="Source dashboard" required><Input value={actionDraft.source_dashboard} disabled={!permissions.manage} onChange={(event) => setActionDraft({ ...actionDraft, source_dashboard: event.target.value })} /></Field>
          <Field label="Issue" required className="sm:col-span-2"><textarea className={inputClass} value={actionDraft.issue} disabled={!permissions.manage} onChange={(event) => setActionDraft({ ...actionDraft, issue: event.target.value })} /></Field>
          <Field label="Agreed action" required className="sm:col-span-2"><textarea className={inputClass} value={actionDraft.agreed_action} disabled={!permissions.manage} onChange={(event) => setActionDraft({ ...actionDraft, agreed_action: event.target.value })} /></Field>
          <Field label="Accountable owner" required>{catalogue.owners?.length ? <Dropdown value={String(actionDraft.owner_user_id || "")} options={catalogue.owners.filter((owner) => !owner.state_code || owner.state_code === actionDraft.state_code).map((owner) => ({ value: String(owner.id), label: owner.name }))} disabled={!permissions.manage} onChange={(value) => setActionDraft({ ...actionDraft, owner_user_id: value, accountable_owner: catalogue.owners?.find((owner) => String(owner.id) === value)?.name || "" })} /> : <Input value={actionDraft.accountable_owner} disabled={!permissions.manage} onChange={(event) => setActionDraft({ ...actionDraft, accountable_owner: event.target.value })} />}</Field>
          <Field label="Due date" required><Input type="date" value={actionDraft.deadline} disabled={!permissions.manage} onChange={(event) => setActionDraft({ ...actionDraft, deadline: event.target.value })} /></Field>
          <Field label="Status" required><Dropdown value={actionDraft.status} options={["Open", "In progress", "Closed"]} onChange={(value) => setActionDraft({ ...actionDraft, status: value })} /></Field>
          <Field label="Outcome / closure explanation"><textarea className={inputClass} value={actionDraft.outcome} onChange={(event) => setActionDraft({ ...actionDraft, outcome: event.target.value })} /></Field>
          <Field label="Evidence type"><Dropdown value={actionEvidenceType} options={catalogue.evidence_types} onChange={setActionEvidenceType} /></Field><Field label="Action evidence"><Input type="file" multiple onChange={(event) => setActionFiles(Array.from(event.target.files || []))} /></Field>
          <div className="sm:col-span-2"><EvidenceFiles files={actionDraft.evidence || []} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setActionDraft(null)}>Cancel</Button><Button className={ACTION} disabled={busy} onClick={() => void run(async () => {
            let id = actionDraft.reference_id;
            if (actionFiles.length && actionDraft.status === "Closed" && !id) throw new Error("Save the action as Open, then upload closure evidence");
            if (!id || actionDraft.status !== "Closed") { const response = await api.saveAction(id, actionDraft); id = response.data.reference_id; setActionDraft({ ...actionDraft, reference_id: id }); }
            if (actionFiles.length && id) { await api.evidence("actions", id, actionEvidenceType, actionFiles); setActionFiles([]); }
            if (actionDraft.status === "Closed") await api.saveAction(id, actionDraft);
            setActions((await api.actions()).data); setActionDraft(null); toast.success("Management action saved");
          })}>Save action</Button></div>
        </Section></CardContent></Card>}
        {!actionDraft && <>{searchInput}<Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">Management actions</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["Issue / Agreed action", "State", "Owner", "Due date", "Status", "Closed", "Action"].map((label) => <TableHead className={`text-xs font-bold text-slate-600 whitespace-nowrap ${label === "Action" ? "text-right" : ""}`} key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
          {actions.filter((action) => matchesSearch([action, stateName(action.state_code)])).map((action) => <TableRow key={action.reference_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0"><TableCell className="min-w-[220px] space-y-1"><p className="text-sm font-semibold text-[#0f3d2e]">{action.issue}</p><p className="text-xs text-slate-500">{action.agreed_action}</p>{action.outcome && <p className="text-xs text-slate-600">{action.outcome}</p>}<p className="text-[10px] text-slate-400 font-mono">{action.reference_id}</p><EvidenceFiles files={action.evidence || []} /></TableCell><TableCell className="text-sm whitespace-nowrap">{stateName(action.state_code)}</TableCell><TableCell className="text-sm">{action.accountable_owner}</TableCell><TableCell className="text-xs whitespace-nowrap">{action.deadline}</TableCell><TableCell><Badge className={`text-[10px] border ${action.status === "Closed" ? STATUS_TONES.submitted : action.status === "In progress" ? STATUS_TONES.awaiting_review : STATUS_TONES.draft}`}>{action.status}</Badge></TableCell><TableCell className="text-xs whitespace-nowrap">{action.closure_date ? new Date(action.closure_date).toLocaleDateString() : "—"}</TableCell><TableCell className="text-right">{action.can_update && <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" onClick={() => { setActionDraft({ ...action, owner_user_id: String(action.owner_user_id || "") }); setActionFiles([]); }}><Pencil className="w-3.5 h-3.5" />Update</Button>}</TableCell></TableRow>)}
        </TableBody></Table></div>{!actions.filter((action) => matchesSearch([action, stateName(action.state_code)])).length && <div className="py-16 text-center text-sm text-slate-400">No management actions found.</div>}</CardContent></Card></>}
      </>}
      {mode === "legacy" && <>
        {permissions.create && <Card className="rounded-2xl border-[#d4e8dc] shadow-sm"><CardContent className="p-4"><Field label="Add historical activities to report"><Dropdown value={batch?.reference_id || ""} placeholder="Select reporting period" options={batches.filter((row) => editable(row)).map((row) => ({ value: row.reference_id, label: `${stateName(row.state_code)} · ${monthLabel(row.reporting_month)} ${row.reporting_year}` }))} onChange={(value) => void run(async () => { const response = await api.batch(value); setBatch(response.data); })} /></Field></CardContent></Card>}
        {searchInput}
        <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden"><CardHeader className="pb-3 border-b border-[#d4e8dc]"><CardTitle className="text-sm font-bold">Historical activities</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">{["Period", "State", "Activity", "Reported enrolments", "Evidence", "Action"].map((label) => <TableHead className={`text-xs font-bold text-slate-600 whitespace-nowrap ${label === "Action" ? "text-right" : ""}`} key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>
          {historical.filter((activity) => matchesSearch([activity, stateName(activity.state_code), monthLabel(activity.reporting_month)])).map((activity) => <TableRow key={activity.reference_id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0"><TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{monthLabel(activity.reporting_month)} {activity.reporting_year}</TableCell><TableCell className="text-sm whitespace-nowrap">{stateName(activity.state_code)}</TableCell><TableCell><p className="text-sm font-medium">{activity.activity_category}</p><p className="text-[10px] font-mono text-slate-400">{activity.reference_id}</p></TableCell><TableCell className="text-sm font-semibold text-[#145c3f] tabular-nums">{activity.enrolment_count ?? activity.new_enrolments ?? "—"}</TableCell><TableCell><EvidenceFiles files={activity.evidence || []} /></TableCell><TableCell className="text-right">{canEdit && batch && batch.state_code === activity.state_code && Number(batch.reporting_year) === Number(activity.reporting_year) && Number(batch.reporting_month) === Number(activity.reporting_month) && <Button disabled={busy} variant="ghost" size="sm" className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]" onClick={() => void run(async () => { await api.attachLegacy(batch.reference_id, activity.reference_id); setHistorical((await api.legacy()).data); setBatch((await api.batch(batch.reference_id)).data); toast.success("Activity added to the report"); })}><Plus className="w-3.5 h-3.5" />Add to report</Button>}</TableCell></TableRow>)}
        </TableBody></Table></div>{!historical.filter((activity) => matchesSearch([activity, stateName(activity.state_code), monthLabel(activity.reporting_month)])).length && <div className="py-16 text-center text-sm text-slate-400">No historical activities found.</div>}</CardContent></Card>
      </>}
    </>}
    </div></ScrollArea>
  </div>;
}
