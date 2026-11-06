import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Plus, RefreshCw, Save, Send, Download, Users, Pencil, Eye, FileText, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { ColumnDef } from "@tanstack/react-table";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { enrolmentDrivesApi as api } from "@/lib/api";
import { cn } from "@/lib/utils";
import PageLayout from "../PageLayout";
import EnrolmentActivityForm, { Field } from "./EnrolmentActivityForm";
import { MultiSelectField } from "./EnrolmentDriveForm";
import { AddRowButton } from "./adminHr/ui";
import {
  driveReportingMonth,
  driveReportingPeriod,
  ENROLMENT_DRIVE_CATEGORIES,
  CATEGORY_TO_DRIVE_KEY,
} from "./enrolmentDriveTypes";
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
const emptyActivity = (): Activity => ({ drive_type: "", activity_date: "", activity_category: "", specific_activity: "", location_category: "", location_name: "", exact_location: "", programs_supported: [], target_audience: [], other_audience: "", planned_target_audience: "", target_audience_reached: "", leads_generated: "", activity_status: "", status_reason: "", funding_option: "", activity_budget: "", approved_amount: "", activity_details: "", evidence_type: "", remarks: "" });
const needsSpecifiedAudience = (audiences: string[] | undefined) =>
  (audiences || []).some((item) => /^others?\s*\(specify\)/i.test(String(item).trim()));
const toDraft = (row: Activity): Activity => {
  const draft = Object.fromEntries(
    Object.entries({ ...emptyActivity(), ...row }).map(([key, value]) => [key, value ?? ""]),
  ) as Activity;
  return {
    ...draft,
    enrolment_count: Number(row.enrolment_count || 0),
    enrolment_records: row.enrolment_records || [],
  };
};
const editable = (batch: Batch | null) => !!batch && ["draft", "returned"].includes(batch.status);
const statusLabel = (value: string) => ({ awaiting_review: "Awaiting review", final_submit: "Final submission", send_for_review: "Sent for review", returned: "Returned", endorsed: "Endorsed", submitted: "Submitted", draft: "Draft", endorse: "Endorsed", return: "Returned" }[value] || value);
const controlClass = "h-11 text-sm font-medium bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20";
const inputClass = "w-full min-h-[4.5rem] rounded-sm px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25";
const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const STATUS_TONES: Record<string, string> = { draft: "bg-slate-100 text-slate-600 border-slate-200", returned: "bg-rose-100 text-rose-700 border-rose-200", awaiting_review: "bg-amber-100 text-amber-800 border-amber-200", endorsed: "bg-teal-100 text-teal-800 border-teal-200", submitted: "bg-emerald-100 text-emerald-700 border-emerald-200" };
function StatusBadge({ status }: { status: string }) {
  return <Badge className={`text-[10px] px-2 py-0.5 inline-flex items-center gap-1 w-fit border ${STATUS_TONES[status] || STATUS_TONES.draft}`}>{status === "awaiting_review" ? <Clock className="w-3.5 h-3.5" /> : ["submitted", "endorsed"].includes(status) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}{statusLabel(status)}</Badge>;
}
export function Dropdown({ value, options, onChange, disabled, placeholder = "Select" }: { value: string; options: (string | { value: string; label: string })[]; onChange: (value: string) => void; disabled?: boolean; placeholder?: string }) {
  const items = options.map((option) => typeof option === "string" ? { value: option, label: option } : option);
  return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger displayValue={items.find((option) => option.value === value)?.label}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{items.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}
function MultiPicker({ value, options, onChange, label }: { value: string[]; options: string[]; onChange: (value: string[]) => void; label: string }) {
  return <MultiSelectField label="" value={value} options={options} onChange={onChange} placeholder={`Select ${label}`} className="col-span-1 md:col-span-1" />;
}
function FormGrid({ children, className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

type LinkedEnrolmentRecord = {
  reference_id: string;
  status: string;
  enrolment_count: number;
  reporting_year: number;
  reporting_month: number;
};

function LinkedEnrolmentsPanel({
  records,
  totalBeneficiaries,
  canEdit,
  busy,
  onResume,
}: {
  records: LinkedEnrolmentRecord[];
  totalBeneficiaries: number;
  canEdit: boolean;
  busy: boolean;
  onResume: (referenceId: string) => void;
}) {
  const count = records.length;
  return (
    <div className="mx-3 mb-3 mt-1 rounded-sm border border-[#1a7a52]/35 bg-[#eef6f1] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1a7a52]/25 bg-[#dceee4] px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-[#0f3d2e] shrink-0" />
          <p className="text-sm font-bold text-[#0f3d2e]">
            Linked enrolments
            <span className="ml-2 font-semibold text-[#145c3f] tabular-nums">
              {count} registration{count === 1 ? "" : "s"} · {formatCount(totalBeneficiaries)} beneficiaries
            </span>
          </p>
        </div>
      </div>
      {count === 0 ? (
        <p className="px-3 py-3 text-sm text-slate-500">No linked enrolment registrations yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                <TableHead className="w-10 text-[11px] font-bold text-[#0f3d2e]">#</TableHead>
                <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Registration ID</TableHead>
                <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Period</TableHead>
                <TableHead className="text-[11px] font-bold text-[#0f3d2e] text-right">Beneficiaries</TableHead>
                <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Status</TableHead>
                <TableHead className="text-[11px] font-bold text-[#0f3d2e] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => (
                <TableRow key={record.reference_id} className="hover:bg-[#f8fdfb]">
                  <TableCell className="text-sm font-semibold tabular-nums text-slate-500">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-[#0f3d2e]">{record.reference_id}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {monthLabel(record.reporting_month)} {record.reporting_year}
                  </TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums text-[#145c3f] text-right">
                    {formatCount(record.enrolment_count)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${STATUS_TONES[record.status] || STATUS_TONES.draft}`}>
                      {statusLabel(record.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && record.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-[#1a7a52] text-[#0f3d2e]"
                        disabled={busy}
                        onClick={() => onResume(record.reference_id)}
                      >
                        Resume draft
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
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
export default function EnrolmentDriveWorkspace({ onBack, defaultStateId, defaultZoneId }: { onBack: () => void; defaultZoneId?: string | null; defaultStateId?: string | null }) {
  const routerNavigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [batch, setBatch] = React.useState<Batch | null>(null);
  const [mode, setMode] = React.useState<"register" | "batch" | "view" | "activity">("register");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const { searchInput, matchesSearch, setSearch } = useListSearch();
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterState, setFilterState] = React.useState("all");
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
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
  const [activityErrors, setActivityErrors] = React.useState<Record<string, string>>({});
  const [expandedActivityId, setExpandedActivityId] = React.useState<string | null>(null);
  const activityFormRef = React.useRef<HTMLDivElement>(null);
  const permissions = catalogue?.permissions || { create: false, review: false, manage: false };
  const canEdit = editable(batch) && permissions.create;

  const validateActivity = (): boolean => {
    const errs: Record<string, string> = {};
    if (planned === "" || planned == null || !Number.isSafeInteger(Number(planned)) || Number(planned) < 0) {
      errs.planned_activities = "Number of planned activities is required";
    }
    if (!draft.activity_category) {
      errs.activity_category = "Activity category is required";
    } else if (!draft.drive_type) {
      draft.drive_type = CATEGORY_TO_DRIVE_KEY[draft.activity_category] || "community-sensitization";
    }
    if (!draft.activity_date) errs.activity_date = "Activity date is required";
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
    if (needsSpecifiedAudience(draft.target_audience) && !draft.other_audience.trim()) {
      errs.other_audience = "Specify the target audience";
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
    // Legacy Management Follow-up links now live on the Enrolment Drives Dashboard.
    if (searchParams.get("tab") !== "actions") return;
    const params = new URLSearchParams({ tab: "enrolment-drives", face: "followup" });
    const stateCode = searchParams.get("state") || defaultStateId || "";
    const issue = searchParams.get("issue") || "";
    if (stateCode) params.set("state", stateCode);
    if (issue) params.set("issue", issue);
    routerNavigate(`/zonal/dashboard?${params.toString()}`, { replace: true });
  }, [searchParams, defaultStateId, routerNavigate]);
  const openBatch = async (id: string, edit = false) => {
    const response = await api.batch(id);
    const activities = response.data.activities || [];
    setBatch(response.data);
    setPlanned(String(response.data.planned_activities ?? ""));
    setReportingDeadline(response.data.reporting_deadline || "");
    setReviewNote("");
    setDraft(activities.length === 1 ? toDraft(activities[0]) : emptyActivity());
    setFiles([]);
    setActivityErrors({});
    setMode(edit ? "batch" : "view");
  };
  const navigate = (next: typeof mode) => run(async () => {
    setSearch("");
    if (next === "register") await refresh();
    setMode(next);
  });
  const syncPlannedActivities = async (current: Batch) => {
    if (!canEdit) return current;
    if (planned === "" || planned == null || !Number.isSafeInteger(Number(planned)) || Number(planned) < 0) {
      throw new Error("Number of planned activities is required");
    }
    if (planned === String(current.planned_activities ?? "")) return current;
    const response = await api.updateBatch(current.reference_id, { planned_activities: planned, revision: current.revision });
    setBatch(response.data);
    setPlanned(String(response.data.planned_activities ?? ""));
    return response.data as Batch;
  };
  const persistActivity = async (complete: boolean, clearAfter: boolean, opts?: { quiet?: boolean }) => {
    if (!batch) return null as string | null;
    let currentBatch = await syncPlannedActivities(batch);
    const existingCount = currentBatch.activities?.length || 0;
    if (!draft.reference_id && existingCount >= 1) {
      throw new Error("Only one activity can be registered per report. Edit the existing activity, or start a new report.");
    }
    const effectiveDriveType = draft.drive_type || CATEGORY_TO_DRIVE_KEY[draft.activity_category] || "community-sensitization";
    if (complete) {
      if (!validateActivity()) return null;
      if (!catalogue?.drive_types.some((type) => type.key === effectiveDriveType)) throw new Error("Select an activity category before saving the activity");
      if (draft.activity_status === "Completed" && !files.length && !draft.evidence?.length) throw new Error("Select supporting evidence for the completed activity");
    } else if (!draft.activity_category && !draft.specific_activity.trim()) {
      throw new Error("Enter at least an activity category or activity details before registering beneficiaries");
    }
    const response = await api.saveActivity(currentBatch.reference_id, draft.reference_id, { ...draft, drive_type: effectiveDriveType, complete });
    const id = response.data.reference_id as string;
    if (files.length) {
      if (!draft.evidence_type) throw new Error("Select an evidence type before uploading files");
      await api.evidence("activities", id, draft.evidence_type, files);
      setFiles([]);
    }
    const finalBatch = (await api.batch(currentBatch.reference_id)).data as Batch;
    setBatch(finalBatch);
    const saved = finalBatch.activities?.find((activity) => activity.reference_id === id) || null;
    if (clearAfter) {
      if (!opts?.quiet) toast.success(complete ? (draft.reference_id ? "Activity updated" : "Activity saved") : "Draft activity saved");
      setDraft(emptyActivity());
      setActivityFormKey((value) => value + 1);
      setActivityErrors({});
      setExpandedActivityId(null);
    } else {
      if (saved) setDraft(toDraft(saved));
      if (!opts?.quiet) toast.success(complete ? "Activity saved" : "Draft activity saved");
      setActivityErrors({});
    }
    setMode("batch");
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return id;
  };
  const transition = (action: string) => run(async () => {
    if (!batch) return;
    const response = await api.transition(batch.reference_id, { action, note: reviewNote, revision: batch.revision });
    setBatch(response.data); setReviewNote(""); toast.success(statusLabel(action)); await refresh();
    if (action === "send_for_review") {
      setMode("register");
    }
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
    setMode("batch");
    if (activityFormRef.current) {
      activityFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const startNewReport = () => run(async () => {
    const stateCode = period.state_code
      || defaultStateId
      || (filterState !== "all" ? filterState : "")
      || catalogue?.states[0]?.code
      || "";
    const payload = {
      state_code: stateCode,
      reporting_year: period.reporting_year || String(new Date().getFullYear()),
      reporting_month: period.reporting_month || String(new Date().getMonth() + 1),
      planned_activities: period.planned_activities || null,
    };
    setPeriod({ ...period, ...payload, planned_activities: period.planned_activities || "" });
    const response = await api.createBatch(payload);
    toast.success("Report opened — complete the form below");
    await openBatch(response.data.reference_id, true);
  });
  const openEnrolmentModal = (activity: Activity, reportId: string | null = null) => {
    void run(async () => {
      let target = activity;
      if (!target.reference_id) {
        // Auto-save a draft so beneficiaries can be registered before a full activity save.
        const id = await persistActivity(false, false, { quiet: true });
        if (!id || !batch) return;
        const refreshed = (await api.batch(batch.reference_id)).data as Batch;
        const saved = refreshed.activities?.find((row) => row.reference_id === id);
        if (!saved) throw new Error("Could not open beneficiary registration for this activity");
        target = saved;
        setDraft(toDraft(saved));
        toast.success("Activity draft saved — continue with beneficiaries");
      }
      setLink(target);
      setLinkedReportId(reportId);
    });
  };
  const closeEnrolmentModal = () => {
    const batchId = batch?.reference_id;
    const activityId = link?.reference_id || draft.reference_id;
    setLink(null);
    setLinkedReportId(null);
    if (!batchId) return;
    void run(async () => {
      await openBatch(batchId, true);
      if (activityId) {
        const refreshed = (await api.batch(batchId)).data as Batch;
        const saved = refreshed.activities?.find((row) => row.reference_id === activityId);
        if (saved) setDraft(toDraft(saved));
      }
    });
  };
  const handleDriveBeneficiarySaved = () => {
    closeEnrolmentModal();
  };
  const stateOptions = catalogue?.states.map((state) => ({ value: state.code, label: state.description })) || [];
  const stateName = (code: string) => catalogue?.states.find((state) => state.code === code)?.description || code;
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: monthLabel(index + 1) }));
  const periodFiltered = batches.filter((row) => (filterYear === "all" || String(row.reporting_year) === filterYear) && (filterMonth === "all" || String(row.reporting_month) === filterMonth) && (filterState === "all" || row.state_code === filterState));
  const filteredBatches = periodFiltered.filter((row) => (filterStatus === "all" || row.status === filterStatus) && matchesSearch([row, stateName(row.state_code), monthLabel(row.reporting_month), statusLabel(row.status)]));
  const registerColumns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "period",
        header: "Period",
        accessorFn: (row) => `${monthLabel(row.reporting_month)} ${row.reporting_year}`,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
            {monthLabel(row.original.reporting_month)} {row.original.reporting_year}
          </span>
        ),
      },
      {
        id: "state",
        header: "State",
        accessorFn: (row) => stateName(row.state_code),
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">{stateName(row.original.state_code)}</span>
        ),
      },
      {
        id: "quarter",
        header: "Quarter",
        accessorFn: (row) => `Q${quarterFromMonth(row.reporting_month)}`,
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">Q{quarterFromMonth(row.original.reporting_month)}</span>
        ),
      },
      {
        id: "planned",
        header: "Planned",
        accessorFn: (row) => row.planned_activities ?? 0,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.planned_activities ?? "—"}</span>
        ),
      },
      {
        id: "activities",
        header: "Activities",
        accessorFn: (row) => row.activity_count || 0,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-900 tabular-nums">{row.original.activity_count || 0}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void run(() => openBatch(row.original.reference_id));
            }}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogue, busy],
  );
  const listMode = mode === "register";
  const handleBack = () => {
    if (link) {
      closeEnrolmentModal();
      return;
    }
    if (mode === "view" || mode === "batch") setMode("register");
    else if (mode === "register") onBack();
    else void navigate("register");
  };
  const pageTitle = mode === "batch" ? "Enrolment Drive Report" : "Enrolment Drives";
  const geoInfo = (current?: Batch) => {
    return (
      <FormGrid>
        <Field label="Reporting month" required>
          <Input
            className={controlClass}
            type="month"
            min="2000-01"
            max="2100-12"
            disabled={!!current}
            value={driveReportingMonth(current?.reporting_year ?? period.reporting_year, current?.reporting_month ?? period.reporting_month)}
            onChange={(event) => setPeriod((previous) => ({ ...previous, ...driveReportingPeriod(event.target.value) }))}
          />
        </Field>
        <Field label="Number of planned activities" required error={activityErrors.planned_activities}>
          <Input
            className={controlClass}
            type="number"
            min={0}
            step={1}
            value={current ? planned : period.planned_activities}
            disabled={!!current && (!canEdit || mode !== "batch")}
            onChange={(event) => {
              const value = event.target.value;
              if (current) setPlanned(value);
              else setPeriod((previous) => ({ ...previous, planned_activities: value }));
              if (activityErrors.planned_activities) {
                setActivityErrors((prev) => {
                  const next = { ...prev };
                  delete next.planned_activities;
                  return next;
                });
              }
            }}
            placeholder="Enter number"
          />
        </Field>
        <Field label="Activity date" required error={activityErrors.activity_date}>
          <Input className={controlClass} type="date" value={draft.activity_date} onChange={(event) => set("activity_date", event.target.value)} />
        </Field>
      </FormGrid>
    );
  };

  const activityTable = (inline = false) => {
    if (!batch) return null;
    const activitiesCount = batch.activities?.length || 0;

    const table = (
      <Table>
        <TableHeader>
          <TableRow className="bg-[#eef6f1] hover:bg-[#eef6f1]">
            {["Date", "Activity Category", "Specific Activity", "Audience reached", "Leads generated", "Enrolments", "Status", "Action"].map((label) => (
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
                  <TableCell>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-semibold text-[#145c3f] tabular-nums">
                        {activity.enrolment_count != null ? formatCount(activity.enrolment_count) : 0}
                      </span>
                      {(activity.enrolment_records?.length || 0) > 0 ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0f3d2e]/80">
                          {activity.enrolment_records!.length} linked
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${activity.activity_status === "Completed" ? STATUS_TONES.submitted : STATUS_TONES.draft}`}>
                      {activity.activity_status || "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 border-[#d4e8dc] text-[#145c3f] text-xs"
                          disabled={busy}
                          onClick={() => openEnrolmentModal(activity)}
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
                <TableRow className="hover:bg-transparent border-0">
                  <TableCell colSpan={8} className="p-0">
                    <div onClick={(event) => event.stopPropagation()}>
                      <LinkedEnrolmentsPanel
                        records={activity.enrolment_records || []}
                        totalBeneficiaries={Number(activity.enrolment_count || 0)}
                        canEdit={canEdit}
                        busy={busy}
                        onResume={(referenceId) => openEnrolmentModal(activity, referenceId)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="p-0">
                      <div className="border-t border-[#e8f3ec] bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                              <TableHead className="w-[220px] text-[11px] font-bold text-[#0f3d2e]">Field</TableHead>
                              <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {([
                              ["Drive type", catalogue?.drive_types.find((t) => t.key === activity.drive_type)?.title || activity.drive_type],
                              ["Category", activity.activity_category],
                              ["Date", activity.activity_date],
                              ["Specific activity", activity.specific_activity],
                              ["Programmes", activity.programs_supported?.join(", ")],
                              ["Status", activity.activity_status],
                              ...(activity.status_reason ? [["Reason", activity.status_reason] as [string, React.ReactNode]] : []),
                              ...(activity.activity_details ? [["Description", activity.activity_details] as [string, React.ReactNode]] : []),
                              ["Location category", activity.location_category],
                              ["Location name", activity.location_name],
                              ["Exact location", activity.exact_location],
                              ["Target audience", [activity.target_audience?.join(", "), needsSpecifiedAudience(activity.target_audience) ? activity.other_audience : ""].filter(Boolean).join(" — ")],
                              ["Number of planned audience (if any)", activity.planned_target_audience != null ? formatCount(activity.planned_target_audience) : null],
                              ["Number of audience reached", activity.target_audience_reached != null ? formatCount(activity.target_audience_reached) : null],
                              ["Number of leads generated", activity.leads_generated != null ? formatCount(activity.leads_generated) : null],
                              ["Linked enrolments", `${formatCount(activity.enrolment_count || 0)} beneficiaries · ${(activity.enrolment_records?.length || 0)} registration${(activity.enrolment_records?.length || 0) === 1 ? "" : "s"}`],
                              ["Funding option", activity.funding_option],
                              ["Budget", activity.activity_budget ? `₦${formatAmount(activity.activity_budget)}` : null],
                              ["Approved amount", activity.approved_amount ? `₦${formatAmount(activity.approved_amount)}` : null],
                              ["Evidence type", activity.evidence_type],
                              ...(activity.remarks ? [["Remarks", activity.remarks] as [string, React.ReactNode]] : []),
                              ...(activity.evidence?.length ? [["Supporting evidence", <EvidenceFiles key="evidence" files={activity.evidence} />] as [string, React.ReactNode]] : []),
                            ] as [string, React.ReactNode][]).map(([label, value]) => (
                              <TableRow key={label} className="hover:bg-[#f8fdfb]">
                                <TableCell className="align-top whitespace-nowrap text-xs font-semibold text-slate-500 bg-[#f8fbf9]">
                                  {label}
                                </TableCell>
                                <TableCell className="align-top text-sm font-medium text-slate-800 whitespace-pre-wrap break-words">
                                  {value == null || value === "" ? "—" : value}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    );

    if (activitiesCount === 0) {
      return (
        <div className="py-6 text-center text-sm text-slate-400">
          No activity recorded for this report.
        </div>
      );
    }

    if (inline) {
      return <div className="overflow-x-auto -mx-1">{table}</div>;
    }

    return (
      <Card className="rounded-xl border border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0 bg-white">
          <div className="overflow-x-auto">{table}</div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageLayout
      title={pageTitle}
      onBack={listMode ? undefined : handleBack}
      actions={
        <>
          {mode === "view" && batch && (
            <>
              <StatusBadge status={batch.status} />
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#1a7a52] text-[#0f3d2e] hover:bg-[#eef6f1]"
                  onClick={() => void run(() => openBatch(batch.reference_id, true))}
                >
                  <Pencil className="w-4 h-4" /> {batch.status === "returned" ? "Edit & Resubmit" : "Edit Report"}
                </Button>
              )}
              {permissions.create && (batch.status === "draft" || batch.status === "returned") && (
                <Button
                  size="sm"
                  className={ACTION}
                  disabled={busy || !batch.activities?.length}
                  onClick={() => void transition("send_for_review")}
                >
                  <Send className="mr-2 h-4 w-4" /> Send for review
                </Button>
              )}
              {permissions.create && batch.status === "endorsed" && (
                <Button size="sm" className={ACTION} disabled={busy} onClick={() => void transition("final_submit")}>
                  Final submit
                </Button>
              )}
            </>
          )}
          {(listMode || mode === "batch" || mode === "view") && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy || loading}
              className="gap-1.5 h-8 text-xs rounded-sm border-[#d4e8dc]"
              onClick={() => void run(async () => {
                if (mode === "view" && batch) await openBatch(batch.reference_id);
                else if (mode === "batch" && batch) await openBatch(batch.reference_id, true);
                else {
                  await refresh();
                }
              })}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
          )}
          {mode === "register" && permissions.create && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/20 h-8 text-xs rounded-sm"
              onClick={() => void startNewReport()}
            >
              <Plus className="w-3.5 h-3.5" />
              New Enrolment Drive Report
            </Button>
          )}
        </>
      }
      contentClassName="space-y-3 pb-6"
    >
      <div className="w-full space-y-3">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
    {loading ? <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading reports...</span></div> : !catalogue ? <Button onClick={() => void run(async () => { await refresh(); })}>Retry</Button> : <>
      {mode === "register" && <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", count: periodFiltered.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft / Returned", count: periodFiltered.filter((row) => ["draft", "returned"].includes(row.status)).length, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Awaiting review", count: periodFiltered.filter((row) => row.status === "awaiting_review").length, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
              { label: "Endorsed", count: periodFiltered.filter((row) => row.status === "endorsed").length, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
              { label: "Submitted", count: periodFiltered.filter((row) => row.status === "submitted").length, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ].map((item) => (
              <div className={`rounded-sm border px-3 py-2.5 ${item.tone}`} key={item.label}>
                <p className="text-2xl font-bold tabular-nums">{item.count}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
              {catalogue.states.length > 1 && (
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger size="sm" className="w-full" displayValue={filterState === "all" ? "All States" : (stateOptions.find((s) => s.value === filterState)?.label || "State")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {stateOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger size="sm" className="w-full" displayValue={filterStatus === "all" ? "All Statuses" : statusLabel(filterStatus)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.keys(STATUS_TONES).map((value) => (
                      <SelectItem key={value} value={value}>{statusLabel(value)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <ShadcnDataTable
            title="ENROLMENT DRIVES REGISTER"
            infoTooltip="Enrolment drive reports by period, state, and submission status."
            columns={registerColumns}
            data={filteredBatches}
            loading={loading}
            searchPlaceholder="Search enrolment drive reports..."
            emptyMessage="No reports found for these filters."
            onRowClick={(row) => { if (!busy) void run(() => openBatch(row.reference_id)); }}
            pageSize={50}
            showTableOptions={false}
          />
      </>}
      {mode === "view" && batch && (
        <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-hidden">
          <CardContent className="p-4 md:p-5 space-y-6">
            <section className="space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Report Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ReviewRow label="Reporting period" value={`${monthLabel(batch.reporting_month)} ${batch.reporting_year} (Q${quarterFromMonth(batch.reporting_month)})`} />
                <ReviewRow label="State / Zone" value={`${stateName(batch.state_code)} · ${catalogue?.zones?.find((z) => z.zonal_code === batch.zonal_code)?.description || batch.zonal_code || "—"}`} />
                <ReviewRow label="Planned activities" value={batch.planned_activities != null ? formatCount(batch.planned_activities) : "—"} />
                <ReviewRow label="Activities recorded" value={formatCount(batch.activities?.length || 0)} />
                <ReviewRow label="Submission date" value={batch.submitted_at ? formatDate(batch.submitted_at) : "—"} />
                <ReviewRow label="Reporting deadline" value={batch.reporting_deadline || "—"} />
                <ReviewRow label="Status" value={statusLabel(batch.status)} />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Activity</h3>
              {activityTable(true)}
            </section>

            {permissions.review && (
              <section className="space-y-3">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">Review and Sign-off</h3>
                <div className="space-y-4">
                  {batch.status === "awaiting_review" && (
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
                    {batch.status === "awaiting_review" && (
                      <>
                        <Button variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => void transition("return")}>
                          Return for correction
                        </Button>
                        <Button className={ACTION} disabled={busy || !reviewNote.trim()} onClick={() => void transition("endorse")}>
                          Endorse report
                        </Button>
                      </>
                    )}
                  </div>
                  {!!batch.reviews?.length && (
                    <div className="space-y-2">
                      {batch.reviews.map((review) => (
                        <div key={review.reference_id} className="rounded-lg bg-[#f4f7f5] border border-[#d4e8dc] p-3 text-sm">
                          <strong>{statusLabel(review.action)}</strong> · {review.actor_name} · Revision {review.revision}
                          <p className="text-slate-600 mt-1">{review.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {batch.status !== "awaiting_review" && !batch.reviews?.length && (
                    <p className="text-sm text-slate-500">No review actions yet for this report.</p>
                  )}
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      )}
      {mode === "batch" && batch && <>
        {canEdit && (
          <div ref={activityFormRef} className="space-y-4">
            <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible">
              <CardContent className="p-4 md:p-5 space-y-6">
                <fieldset disabled={busy || !canEdit} className="space-y-6">
                  {geoInfo(batch)}
                  <FormGrid>
                    <Field label="Activity Category" required error={activityErrors.activity_category}>
                      <Dropdown
                        value={draft.activity_category}
                        options={ENROLMENT_DRIVE_CATEGORIES as unknown as string[]}
                        onChange={(value) => {
                          const mappedDriveType = CATEGORY_TO_DRIVE_KEY[value] || "community-sensitization";
                          setDraft((current) => ({
                            ...current,
                            activity_category: value,
                            drive_type: mappedDriveType,
                          }));
                          if (activityErrors.activity_category || activityErrors.drive_type) {
                            setActivityErrors((prev) => {
                              const next = { ...prev };
                              delete next.activity_category;
                              delete next.drive_type;
                              return next;
                            });
                          }
                        }}
                        placeholder="Select activity category"
                      />
                    </Field>
                    <Field label="Specify activity" required error={activityErrors.specific_activity}>
                      <Input className={controlClass} value={draft.specific_activity} maxLength={255} placeholder="Enter the activity conducted" onChange={(event) => set("specific_activity", event.target.value)} />
                    </Field>
                    <Field label="Programmes supported" required error={activityErrors.programs_supported}>
                      <MultiPicker value={draft.programs_supported} options={catalogue?.programmes || []} onChange={(value) => set("programs_supported", value)} label="programmes" />
                    </Field>
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
                      <Input className={controlClass} value={draft.exact_location} maxLength={500} onChange={(event) => set("exact_location", event.target.value)} placeholder="Enter the venue or address" />
                    </Field>
                    <Field label="Target audience" required error={activityErrors.target_audience || activityErrors.other_audience}>
                      <div className="space-y-2">
                        <MultiPicker
                          value={draft.target_audience}
                          options={catalogue?.audiences || []}
                          onChange={(value) => {
                            set("target_audience", value);
                            if (!needsSpecifiedAudience(value)) set("other_audience", "");
                          }}
                          label="audiences"
                        />
                        {needsSpecifiedAudience(draft.target_audience) && (
                          <Input
                            className={controlClass}
                            value={draft.other_audience}
                            maxLength={255}
                            onChange={(event) => set("other_audience", event.target.value)}
                            placeholder="Specify the target audience"
                          />
                        )}
                      </div>
                    </Field>
                    <Field label="Number of planned audience (if any)">
                      <Input className={controlClass} type="number" min={0} step={1} value={draft.planned_target_audience} onChange={(event) => set("planned_target_audience", event.target.value)} placeholder="Optional" />
                    </Field>
                    <Field label="Number of audience reached">
                      <Input className={controlClass} type="number" min={0} step={1} value={draft.target_audience_reached} onChange={(event) => set("target_audience_reached", event.target.value)} />
                    </Field>
                    <Field label="Number of leads generated">
                      <div className="space-y-2">
                        <Input className={controlClass} type="number" min={0} step={1} value={draft.leads_generated} onChange={(event) => set("leads_generated", event.target.value)} />
                        {canEdit ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-full gap-1.5 border-[#1a7a52] text-[#0f3d2e]"
                            disabled={busy}
                            onClick={() => openEnrolmentModal(draft)}
                          >
                            <Users className="w-3.5 h-3.5" />
                            Register beneficiaries
                          </Button>
                        ) : null}
                        <p className="text-xs text-[#145c3f]">
                          Beneficiaries recorded:{" "}
                          <strong className="tabular-nums">{formatCount(Number(draft.enrolment_count || 0))}</strong>
                          {(draft.enrolment_records?.length || 0) > 0 ? (
                            <span className="text-slate-500 font-normal">
                              {" "}· {draft.enrolment_records!.length} registration{draft.enrolment_records!.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </Field>
                    <Field label="Activity status" required error={activityErrors.activity_status}>
                      <Dropdown value={draft.activity_status} options={catalogue?.statuses || []} onChange={(value) => set("activity_status", value)} placeholder="Select activity status" />
                    </Field>
                    {["Not Conducted", "Deferred", "Cancelled"].includes(draft.activity_status) && (
                      <Field label="Reason" required error={activityErrors.status_reason} className="sm:col-span-2 lg:col-span-3">
                        <textarea className={inputClass} value={draft.status_reason} onChange={(event) => set("status_reason", event.target.value)} placeholder="Explain the activity status" />
                      </Field>
                    )}
                    <Field label="Activity details" required error={activityErrors.activity_details}>
                      <textarea className={inputClass} rows={2} value={draft.activity_details} onChange={(event) => set("activity_details", event.target.value)} placeholder="Describe the activity" />
                    </Field>
                    <Field label="Supporting evidence type" required error={activityErrors.evidence_type}>
                      <Dropdown value={draft.evidence_type} options={catalogue?.evidence_types || []} onChange={(value) => set("evidence_type", value)} placeholder="Select evidence type" />
                    </Field>
                    <Field label="Supporting evidence" required={draft.activity_status === "Completed"} error={activityErrors.evidence}>
                      <Input key={activityFormKey} className={controlClass} type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                      <p className="text-xs text-slate-500">Up to 10 files, 15 MB each.</p>
                    </Field>
                    {!!draft.evidence?.length && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Existing evidence files</p>
                        <EvidenceFiles files={draft.evidence} />
                      </div>
                    )}
                    <Field label="Funding option" required error={activityErrors.funding_option}>
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
                          <Input className={controlClass} type="number" min={0} step="0.01" value={draft.activity_budget} onChange={(event) => set("activity_budget", event.target.value)} />
                        </Field>
                        <Field label="Approved amount (₦)" required error={activityErrors.approved_amount}>
                          <Input className={controlClass} type="number" min={0} step="0.01" value={draft.approved_amount} onChange={(event) => set("approved_amount", event.target.value)} />
                        </Field>
                      </>
                    )}
                    <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                      <textarea className={inputClass} rows={2} value={draft.remarks} onChange={(event) => set("remarks", event.target.value)} placeholder="Enter any additional remarks" />
                    </Field>
                  </FormGrid>
                </fieldset>
              </CardContent>
            </Card>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={busy} onClick={() => void navigate("register")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {permissions.create && (batch.status === "draft" || batch.status === "returned") && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-[#d4e8dc] text-[#0f3d2e]"
                disabled={busy || !canEdit}
                onClick={() => void run(() => persistActivity(false, false))}
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                className={ACTION}
                disabled={busy || !canEdit}
                onClick={() => void run(async () => {
                  const id = await persistActivity(true, false);
                  if (!id) return;
                  const latest = (await api.batch(batch.reference_id)).data as Batch;
                  const response = await api.transition(latest.reference_id, {
                    action: "send_for_review",
                    note: reviewNote,
                    revision: latest.revision,
                  });
                  setBatch(response.data);
                  setReviewNote("");
                  toast.success(statusLabel("send_for_review"));
                  await refresh();
                  setMode("register");
                })}
              >
                <Send className="mr-2 h-4 w-4" />
                Send for review
              </Button>
            </div>
          )}
        </div>
      </>}
    </>}
    </div>

    <Dialog open={Boolean(link?.reference_id && batch)} onOpenChange={(open) => { if (!open) closeEnrolmentModal(); }}>
      <DialogContent
        showCloseButton
        className="max-w-5xl w-[min(96vw,72rem)] max-h-[92vh] overflow-hidden p-0 flex flex-col"
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#d4e8dc] shrink-0">
          <DialogTitle>Register NHIA beneficiaries</DialogTitle>
          <DialogDescription>
            Drive ID{" "}
            <span className="font-mono font-semibold text-[#145c3f]">{link?.reference_id}</span>
            {link?.activity_category ? ` · ${link.activity_category}` : ""}
            {" · "}
            Beneficiaries recorded:{" "}
            <span className="font-semibold text-[#145c3f] tabular-nums">
              {formatCount(Number(link?.enrolment_count || 0))}
            </span>
            {(link?.enrolment_records?.length || 0) > 0
              ? ` · ${link!.enrolment_records!.length} registration${link!.enrolment_records!.length === 1 ? "" : "s"}`
              : ""}
            {" · Add to list, then submit"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {link?.reference_id && batch ? (
            <EnrolmentActivityForm
              key={`${link.reference_id}:${linkedReportId || "new"}`}
              reportId={linkedReportId}
              initialCategory="enrolment"
              defaultStateId={batch.state_code}
              defaultZoneId={batch.zonal_code}
              driveContext={{
                reference_id: link.reference_id,
                programs_supported: link.programs_supported || [],
                state_code: batch.state_code,
                zonal_code: batch.zonal_code,
                reporting_year: batch.reporting_year,
                reporting_month: batch.reporting_month,
                beneficiaries_recorded: Number(link.enrolment_count || 0),
                registration_count: link.enrolment_records?.length || 0,
              }}
              embedded
              onBack={closeEnrolmentModal}
              onCancel={closeEnrolmentModal}
              onSubmitted={handleDriveBeneficiarySaved}
              onDriveBeneficiarySaved={handleDriveBeneficiarySaved}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  </PageLayout>
  );
}
