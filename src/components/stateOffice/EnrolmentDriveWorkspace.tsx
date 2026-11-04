import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Plus, RefreshCw, Save, Send, Download, Users, Pencil, Trash2, Eye, FileText, Clock, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
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
const emptyActivity = (): Activity => ({ drive_type: "", activity_date: "", activity_category: "", specific_activity: "", location_category: "", location_name: "", exact_location: "", programs_supported: [], target_audience: [], other_audience: "", planned_target_audience: "", target_audience_reached: "", leads_generated: "", activity_status: "", status_reason: "", funding_option: "", activity_budget: "", approved_amount: "", activity_details: "", evidence_type: "", remarks: "" });
const toDraft = (row: Activity): Activity => Object.fromEntries(Object.entries({ ...emptyActivity(), ...row }).map(([key, value]) => [key, value ?? ""])) as Activity;
const editable = (batch: Batch | null) => !!batch && ["draft", "returned"].includes(batch.status);
const statusLabel = (value: string) => ({ awaiting_review: "Awaiting review", final_submit: "Final submission", send_for_review: "Sent for review", returned: "Returned", endorsed: "Endorsed", submitted: "Submitted", draft: "Draft", endorse: "Endorsed", return: "Returned" }[value] || value);
const inputClass = "w-full min-h-[4.5rem] rounded-xl px-3.5 py-2 text-sm bg-[#f4f7f5] border-2 border-[#1a7a52] text-slate-800 shadow-xs outline-none hover:border-[#0f3d2e] hover:bg-white focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25";
const ACTION = "bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20";
const WORKFLOW_STEPS = [
  { id: "period", label: "Reporting period" },
  { id: "activities", label: "Record activities" },
  { id: "beneficiaries", label: "Register beneficiaries" },
  { id: "review", label: "Review & endorse" },
];
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
    // Legacy Management Follow-up links now live on the Enrolment Drives Dashboard.
    if (searchParams.get("tab") !== "actions") return;
    const params = new URLSearchParams({ tab: "enrolment-drives", face: "followup" });
    const stateCode = searchParams.get("state") || defaultStateId || "";
    const issue = searchParams.get("issue") || "";
    if (stateCode) params.set("state", stateCode);
    if (issue) params.set("issue", issue);
    routerNavigate(`/zonal/dashboard?${params.toString()}`, { replace: true });
  }, [searchParams, defaultStateId, routerNavigate]);
  const openBatch = async (id: string, preferredStep?: number) => {
    const response = await api.batch(id);
    const locked = ["awaiting_review", "endorsed", "submitted"].includes(response.data.status);
    // Locked reports open on review unless caller asked for a specific workflow step.
    const step = preferredStep ?? (locked ? 3 : 1);
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
      toast.success(complete ? (draft.reference_id ? "Activity updated in the list" : "Activity added to the list") : "Draft activity saved");
      setDraft(emptyActivity());
      setActivityFormKey((value) => value + 1);
      setActivityErrors({});
      setExpandedActivityId(null);
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
  /** Validate, save to register, then clear the form for the next entry. */
  const addToList = () => run(async () => {
    await persistActivity(true, true);
  });
  const requireActivityListed = () => {
    if (canEdit && (hasPendingDriveActivity(draft) || files.length)) throw new Error("Add the current activity to the list before continuing, or cancel the entry.");
  };
  const saveReportDraft = () => run(async () => {
    if (canEdit && (hasPendingDriveActivity(draft) || files.length)) {
      throw new Error("Add the current activity to the list (or cancel it) before saving the report draft.");
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
  const openEnrolmentModal = (activity: Activity, reportId: string | null = null) => {
    if (!activity.reference_id) {
      toast.error("Save the activity before registering beneficiaries");
      return;
    }
    setLink(activity);
    setLinkedReportId(reportId);
    setBatchStep(2);
    setMode("batch");
  };
  const closeEnrolmentModal = () => {
    const batchId = batch?.reference_id;
    setLink(null);
    setLinkedReportId(null);
    if (batchId) void run(() => openBatch(batchId, 2));
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
  const listMode = mode === "register" && !showCreate;
  const handleBack = () => {
    if (link) {
      closeEnrolmentModal();
      return;
    }
    if (showCreate) setShowCreate(false);
    else if (mode === "view") setMode("register");
    else if (mode === "batch" && batchStep > 0) {
      setBatchStep(batchStep - 1);
    }
    else if (mode === "batch") setMode("register");
    else if (mode === "register") onBack();
    else void navigate("register");
  };
  const pageTitle = showCreate ? "New Enrolment Drive Report" : "Enrolment Drives";
  const existingPeriodBatch = React.useMemo(() => {
    if (!period.state_code || !period.reporting_year || !period.reporting_month) return null;
    return batches.find((row) =>
      row.state_code === period.state_code
      && String(row.reporting_year) === String(period.reporting_year)
      && String(row.reporting_month) === String(Number(period.reporting_month))
    ) || null;
  }, [batches, period.state_code, period.reporting_year, period.reporting_month]);
  const existingPeriodLocked = !!existingPeriodBatch && ["awaiting_review", "endorsed", "submitted"].includes(existingPeriodBatch.status);
  const geoInfo = (current?: Batch) => {
    const stateCode = current?.state_code || period.state_code;
    const zoneCode = current?.zonal_code || catalogue?.states.find((state) => state.code === stateCode)?.zonal_code || "";
    const zoneName = catalogue?.zones?.find((zone) => zone.zonal_code === zoneCode)?.description || zoneCode;
    return (
      <Section title="Reporting information">
        <Field label="State / FCT" required>
          <Dropdown
            value={stateCode}
            options={stateOptions}
            onChange={(value) => setPeriod((previous) => ({ ...previous, state_code: value }))}
            disabled={!!current || catalogue?.states.length === 1}
            placeholder="Select State / FCT"
          />
        </Field>
        <Field label="Zone">
          <Input value={zoneName} readOnly placeholder="Auto-derived from State" />
        </Field>
        <Field label="Reporting month" required>
          <Input
            type="month"
            min="2000-01"
            max="2100-12"
            disabled={!!current}
            value={driveReportingMonth(current?.reporting_year ?? period.reporting_year, current?.reporting_month ?? period.reporting_month)}
            onChange={(event) => setPeriod((previous) => ({ ...previous, ...driveReportingPeriod(event.target.value) }))}
          />
        </Field>
        <Field label="Number of planned activities">
          <Input
            type="number"
            min={0}
            step={1}
            value={current ? planned : period.planned_activities}
            disabled={!!current && (!canEdit || batchStep !== 0 || mode !== "batch")}
            onChange={(event) => current ? setPlanned(event.target.value) : setPeriod((previous) => ({ ...previous, planned_activities: event.target.value }))}
            placeholder="Enter once"
          />
        </Field>
      </Section>
    );
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
                        <Button size="sm" variant="ghost" className="h-7 text-[#145c3f]" onClick={() => openEnrolmentModal(activity, record.reference_id)}>
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

    const registerBody = (
      <>
        <div className={`px-4 py-2.5 border-b border-[#d4e8dc] flex flex-wrap items-center justify-between gap-2 ${inline ? "bg-[#f4f7f5]" : "bg-[#e8f5ee]"}`}>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
            {registration ? "Beneficiary Registration" : "Activity Register"}
          </h3>
          <p className="text-[11px] text-[#145c3f]">
            {activitiesCount} activit{activitiesCount === 1 ? "y" : "ies"} recorded
          </p>
        </div>
        {activitiesCount === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400 px-4">
            {canEdit && batchStep === 1
              ? "No activities in the list yet. Fill the form above and click Add to list."
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
      </>
    );

    if (inline) {
      return (
        <div className="rounded-xl border border-[#d4e8dc] overflow-hidden bg-white">
          {registerBody}
        </div>
      );
    }

    return (
      <Card className="rounded-xl border border-[#d4e8dc] shadow-sm overflow-hidden">
        <CardContent className="p-0 bg-white">
          {registerBody}
        </CardContent>
      </Card>
    );
  };

  return <div className="flex flex-col h-full bg-[#f4f7f5]">
    <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full shrink-0" aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">{pageTitle}</h2>
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
              }
            })}
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />Refresh
          </Button>
        )}
        {mode === "register" && !showCreate && permissions.create && <Button disabled={busy} className={ACTION} onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Enrolment Drive Report</Button>}
        {mode === "batch" && canEdit && batchStep === 1 && (
          <Button variant="outline" size="sm" className="gap-2 border-[#d4e8dc] text-[#145c3f]" disabled={busy} onClick={() => void saveReportDraft()}>
            <Save className="w-4 h-4" />Save Report Draft
          </Button>
        )}
      </div>
    </div>
    {listMode && <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20"><div className="flex gap-0 overflow-x-auto -mb-px" role="tablist" aria-label="Enrolment Drive sections">
      <button type="button" role="tab" aria-selected={mode === "register"} disabled={busy} onClick={() => void navigate("register")} className="group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] border-[#145c3f] text-[#145c3f]"><ClipboardList className="h-4 w-4 shrink-0 text-[#145c3f]" />Enrolment Drives<span className="inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-[#e8f6ee] text-[#145c3f]">{batches.length}</span></button>
    </div></div>}
    <ScrollArea className="flex-1"><div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
    {loading ? <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading reports...</span></div> : !catalogue ? <Button onClick={() => void run(async () => { await refresh(); })}>Retry</Button> : <>
      {mode === "register" && <>
        {showCreate ? <>
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-visible"><CardContent className="p-4 md:p-5 space-y-5">
            <StateOfficeFormSteps steps={WORKFLOW_STEPS} activeIndex={0} onStepChange={() => {}} />
            <div className="border-t border-[#e8f3ec] pt-4 space-y-4">
              {geoInfo()}
              {existingPeriodBatch && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    existingPeriodLocked
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-[#d4e8dc] bg-[#f8fbf9] text-[#0f3d2e]"
                  }`}
                  role="status"
                >
                  <p className="font-semibold">
                    {existingPeriodLocked
                      ? "This month is already reported"
                      : "A draft already exists for this month"}
                  </p>
                  <p className="mt-1 text-[13px] opacity-90">
                    {stateName(existingPeriodBatch.state_code)} · {monthLabel(existingPeriodBatch.reporting_month)} {existingPeriodBatch.reporting_year}
                    {" · "}
                    Status: <strong>{statusLabel(existingPeriodBatch.status)}</strong>
                    {existingPeriodLocked
                      ? ". You cannot start a new report for this period. Open the existing one, or choose another month."
                      : ". Continuing will open that draft instead of creating a new report."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className={ACTION}
                      disabled={busy}
                      onClick={() => void run(async () => {
                        setShowCreate(false);
                        await openBatch(
                          existingPeriodBatch.reference_id,
                          existingPeriodLocked ? 3 : 1,
                        );
                      })}
                    >
                      Open existing report
                    </Button>
                    {existingPeriodLocked && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPeriod((previous) => ({ ...previous, reporting_month: "", reporting_year: "" }))}
                      >
                        Choose another month
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent></Card>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              className={ACTION}
              disabled={
                busy
                || !period.state_code
                || !driveReportingMonth(period.reporting_year, period.reporting_month)
                || existingPeriodLocked
              }
              onClick={() => void run(async () => {
                if (existingPeriodBatch && !existingPeriodLocked) {
                  setShowCreate(false);
                  toast.message("Opening existing draft for this period");
                  await openBatch(existingPeriodBatch.reference_id, 1);
                  return;
                }
                if (existingPeriodLocked) {
                  toast.error("This month is already reported. Open the existing report or pick another month.");
                  return;
                }
                const response = await api.createBatch(period);
                setShowCreate(false);
                await refresh();
                const status = response.data.status as string;
                const locked = ["awaiting_review", "endorsed", "submitted"].includes(status);
                if (response.created) {
                  toast.success("Reporting period opened — continue with activities");
                  await openBatch(response.data.reference_id, 1);
                  return;
                }
                if (locked) {
                  toast.message("A report for this period already exists", {
                    description: `Status: ${statusLabel(status)}. Open it from the register, or pick another month.`,
                  });
                  await openBatch(response.data.reference_id, 3);
                  return;
                }
                toast.message("Continuing existing draft for this period");
                await openBatch(response.data.reference_id, 1);
              })}
            >
              {existingPeriodBatch && !existingPeriodLocked ? "Open draft" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </> : <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[{ label: "Total", count: periodFiltered.length, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" }, { label: "Draft / Returned", count: periodFiltered.filter((row) => ["draft", "returned"].includes(row.status)).length, tone: "text-slate-600 bg-white border-slate-200" }, { label: "Awaiting review", count: periodFiltered.filter((row) => row.status === "awaiting_review").length, tone: "text-amber-800 bg-amber-50/80 border-amber-100" }, { label: "Endorsed", count: periodFiltered.filter((row) => row.status === "endorsed").length, tone: "text-teal-800 bg-teal-50/80 border-teal-100" }, { label: "Submitted", count: periodFiltered.filter((row) => row.status === "submitted").length, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" }].map((item) => <div className={`rounded-xl border px-4 py-3 ${item.tone}`} key={item.label}><p className="text-2xl font-bold tabular-nums">{item.count}</p><p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.label}</p></div>)}
          </div>
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
              {catalogue.states.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger displayValue={filterState === "all" ? "All States" : (stateOptions.find((s) => s.value === filterState)?.label || "State")}>
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger displayValue={filterYear === "all" ? "All Years" : filterYear}>
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger displayValue={filterStatus === "all" ? "All Statuses" : statusLabel(filterStatus)}>
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
      </>}
      {mode === "view" && batch && (
        <div className="space-y-4">
          <SectionBand title="Report Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReviewRow label="Reporting period" value={`${monthLabel(batch.reporting_month)} ${batch.reporting_year} (Q${quarterFromMonth(batch.reporting_month)})`} />
              <ReviewRow label="State / Zone" value={`${stateName(batch.state_code)} · ${catalogue?.zones?.find((z) => z.zonal_code === batch.zonal_code)?.description || batch.zonal_code || "—"}`} />
              <ReviewRow label="Planned activities" value={batch.planned_activities != null ? formatCount(batch.planned_activities) : "—"} />
              <ReviewRow label="Activities recorded" value={formatCount(batch.activities?.length || 0)} />
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
          <StateOfficeFormSteps steps={WORKFLOW_STEPS} activeIndex={batchStep} maximumIndex={3} onStepChange={(step) => void goToBatchStep(step)} />
          {batchStep === 0 && (
            <div className="border-t border-[#e8f3ec] pt-4 space-y-4">
              {geoInfo(batch)}
              {canEdit && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(async () => {
                      const response = await api.updateBatch(batch.reference_id, { planned_activities: planned, revision: batch.revision });
                      setBatch(response.data);
                      toast.success("Plan saved");
                    })}
                  >
                    <Save className="w-4 h-4 mr-2" />Save plan
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent></Card>
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
                    <div className="rounded-lg bg-[#eef6f1] p-3 text-sm text-[#145c3f] sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3">
                      <span>Linked enrolments: <strong>{draft.enrolment_count || 0}</strong></span>
                      {canEdit && draft.reference_id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-[#1a7a52] text-[#0f3d2e]"
                          disabled={busy}
                          onClick={() => openEnrolmentModal(draft)}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Register beneficiaries
                        </Button>
                      ) : null}
                    </div>
                    {!!draft.evidence?.length && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Existing evidence files</p>
                        <EvidenceFiles files={draft.evidence} />
                      </div>
                    )}
                  </FieldSection>
                </fieldset>

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
                      className="gap-2 border-[#d4e8dc] text-[#0f3d2e]"
                      disabled={busy || !canEdit}
                      onClick={() => void run(() => persistActivity(false, false))}
                    >
                      <Save className="w-4 h-4" /> Save Draft
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#1a7a52] text-[#0f3d2e] gap-2 text-xs font-semibold"
                      disabled={busy || !canEdit}
                      onClick={() => void run(() => persistActivity(true, false))}
                    >
                      <Save className="w-4 h-4" /> Save Activity
                    </Button>
                    <Button
                      type="button"
                      className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white gap-2 text-xs font-semibold shadow-xs"
                      disabled={busy || !canEdit}
                      onClick={() => void addToList()}
                    >
                      <Plus className="w-4 h-4" /> {draft.reference_id ? "Update & add another" : "Add Another Activity"}
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#e8f3ec]">
                  {activityTable(true)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Read-only / locked reports: still show the activity register on this step */}
        {batchStep === 1 && !canEdit && activityTable()}
        {batchStep === 2 && (() => {
          const activities = batch.activities || [];
          const driveTitle = (key: string) => catalogue?.drive_types.find((type) => type.key === key)?.title || key || "Activity";
          const statusTone = (status?: string) => {
            if (status === "Completed") return "bg-emerald-100 text-emerald-800 border-emerald-200";
            if (status === "In Progress") return "bg-sky-100 text-sky-800 border-sky-200";
            if (status === "Delayed") return "bg-amber-100 text-amber-800 border-amber-200";
            if (status === "Cancelled") return "bg-rose-100 text-rose-700 border-rose-200";
            return "bg-slate-100 text-slate-600 border-slate-200";
          };
          return (
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
              <div className="relative overflow-hidden border-b border-[#d4e8dc] bg-gradient-to-r from-[#e8f5ee] via-[#f3faf6] to-white px-5 py-5">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#145c3f] text-white shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-[#0f3d2e]">Register beneficiaries</h3>
                    <p className="mt-1 text-sm text-slate-600 max-w-xl">
                      Pick an activity below and record how many people were enrolled from it.
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 md:p-5 space-y-4 bg-[#f7faf8]">
                {activities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#cfe6d8] bg-white px-6 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f5ee] text-[#145c3f]">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-[#0f3d2e]">No activities to enrol against yet</p>
                    <p className="mt-1 text-sm text-slate-500">Go back and add at least one activity first.</p>
                    <Button className={`${ACTION} mt-4`} onClick={() => void goToBatchStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-2" />Back to activities
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activities.map((activity, index) => {
                      const enrolled = Number(activity.enrolment_count || 0);
                      const canRegister = canEdit && (activity.programs_supported?.length || 0) > 0;
                      return (
                        <div
                          key={activity.reference_id}
                          className="rounded-2xl border border-[#d4e8dc] bg-white p-4 md:p-5 shadow-sm hover:border-[#a8d4bc] hover:shadow-md transition-all"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef6f1] text-sm font-bold text-[#145c3f]">
                                {String(index + 1).padStart(2, "0")}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-base font-bold text-[#0f3d2e]">
                                    {activity.activity_category || "Untitled activity"}
                                  </h4>
                                  <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold", statusTone(activity.activity_status))}>
                                    {activity.activity_status || "Draft"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                  <span className="font-medium text-slate-600">{driveTitle(activity.drive_type)}</span>
                                  {activity.activity_date ? ` · ${activity.activity_date}` : ""}
                                  {activity.specific_activity ? ` · ${activity.specific_activity}` : ""}
                                </p>
                                {!!activity.programs_supported?.length && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {activity.programs_supported.slice(0, 4).map((program) => (
                                      <span key={program} className="rounded-full bg-[#f0f7f3] px-2 py-0.5 text-[10px] font-semibold text-[#145c3f]">
                                        {program}
                                      </span>
                                    ))}
                                    {activity.programs_supported.length > 4 && (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        +{activity.programs_supported.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#e8f3ec] bg-[#f8fbf9] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#d4e8dc] shadow-sm">
                                <Users className="h-5 w-5 text-[#145c3f]" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Linked enrolments</p>
                                <p className="text-2xl font-bold tabular-nums text-[#0f3d2e] leading-none mt-1">{formatCount(enrolled)}</p>
                              </div>
                            </div>
                            {canRegister ? (
                              <Button
                                className={`${ACTION} h-11 px-5 text-sm`}
                                disabled={busy}
                                onClick={() => openEnrolmentModal(activity)}
                              >
                                <Users className="w-4 h-4" />
                                {enrolled > 0 ? "Add more enrolments" : "Register beneficiaries"}
                              </Button>
                            ) : !canEdit ? (
                              <Badge variant="outline" className="border-slate-200 text-slate-500">View only</Badge>
                            ) : (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                Add programmes on the activity first
                              </div>
                            )}
                          </div>

                          {!!activity.enrolment_records?.length && (
                            <div className="mt-3 space-y-2">
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-0.5">Enrolment records</p>
                              {activity.enrolment_records.map((record) => (
                                <div
                                  key={record.reference_id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eef3ef] bg-white px-3.5 py-2.5"
                                >
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#eef6f1] px-2 text-xs font-bold tabular-nums text-[#145c3f]">
                                      {record.enrolment_count}
                                    </span>
                                    <span className="text-slate-600">
                                      beneficiaries · <span className="font-medium text-slate-800">{statusLabel(record.status)}</span>
                                    </span>
                                  </div>
                                  {canEdit && record.status === "draft" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-[#d4e8dc] text-[#145c3f]"
                                      onClick={() => openEnrolmentModal(activity, record.reference_id)}
                                    >
                                      Resume draft
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
        {batchStep === 3 && (() => {
          const activities = batch.activities || [];
          const enrolledTotal = activities.reduce((sum, activity) => sum + Number(activity.enrolment_count || 0), 0);
          const completedCount = activities.filter((activity) => activity.activity_status === "Completed").length;
          const driveTitle = (key: string) => catalogue?.drive_types.find((type) => type.key === key)?.title || key || "Other";
          const byType = activities.reduce<Record<string, number>>((acc, activity) => {
            const key = activity.drive_type || "other";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          return (
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#e8f5ee] px-4 py-3 border-b border-[#d4e8dc]">
                <div>
                  <h3 className="text-sm font-bold text-[#0f3d2e]">Summary before submission</h3>
                  <p className="text-xs text-slate-600">
                    {stateName(batch.state_code)} · {monthLabel(batch.reporting_month)} {batch.reporting_year}
                  </p>
                </div>
                <StatusBadge status={batch.status} />
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-[#f8fbf9] border border-[#e8f3ec] px-2 py-2.5">
                    <p className="text-lg font-bold tabular-nums text-[#0f3d2e]">{activities.length}</p>
                    <p className="text-[10px] text-slate-500">Activities</p>
                  </div>
                  <div className="rounded-lg bg-[#f8fbf9] border border-[#e8f3ec] px-2 py-2.5">
                    <p className="text-lg font-bold tabular-nums text-[#0f3d2e]">{completedCount}</p>
                    <p className="text-[10px] text-slate-500">Completed</p>
                  </div>
                  <div className="rounded-lg bg-[#f8fbf9] border border-[#e8f3ec] px-2 py-2.5">
                    <p className="text-lg font-bold tabular-nums text-[#0f3d2e]">{formatCount(enrolledTotal)}</p>
                    <p className="text-[10px] text-slate-500">Enrolments</p>
                  </div>
                  <div className="rounded-lg bg-[#f8fbf9] border border-[#e8f3ec] px-2 py-2.5">
                    <p className="text-lg font-bold tabular-nums text-[#0f3d2e]">{batch.planned_activities != null ? formatCount(batch.planned_activities) : "—"}</p>
                    <p className="text-[10px] text-slate-500">Planned</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8f3ec] divide-y divide-[#eef3ef] overflow-hidden">
                  {activities.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-500 text-center">No activities yet. Go back and add some.</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.reference_id} className="px-3 py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-[#0f3d2e] truncate">
                            {activity.activity_category || "Activity"}
                            {activity.specific_activity ? ` — ${activity.specific_activity}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {driveTitle(activity.drive_type)} · {activity.activity_date || "No date"} · {activity.activity_status || "Draft"}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-[#145c3f] tabular-nums">
                          {formatCount(activity.enrolment_count || 0)} enrolled
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {Object.keys(byType).length > 1 && (
                  <p className="text-[11px] text-slate-500">
                    By type: {Object.entries(byType).map(([key, count]) => `${driveTitle(key)} (${count})`).join(" · ")}
                  </p>
                )}

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-[#145c3f]" onClick={() => void goToBatchStep(1)}>
                      Edit activities
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 text-[#145c3f]" onClick={() => void goToBatchStep(2)}>
                      Edit enrolments
                    </Button>
                  </div>
                )}

                {permissions.review && batch.status === "awaiting_review" && (
                  <Field label="Review comment" required>
                    <textarea
                      className={inputClass}
                      rows={2}
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Comment for the reporting officer"
                    />
                  </Field>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#e8f3ec]">
                  <p className="text-xs text-slate-500">
                    {batch.status === "draft" || batch.status === "returned"
                      ? "Looks correct? Send for review."
                      : batch.status === "awaiting_review"
                        ? permissions.review
                          ? "Endorse or return with a comment."
                          : "Waiting for the State Coordinator to review this report."
                        : batch.status === "endorsed"
                          ? "Ready for final submission."
                          : statusLabel(batch.status)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (batch.status === "draft" || batch.status === "returned") && (
                      <Button className={ACTION} disabled={busy || !activities.length} onClick={() => void transition("send_for_review")}>
                        <Send className="mr-2 h-4 w-4" />Send for review
                      </Button>
                    )}
                    {permissions.review && batch.status === "awaiting_review" && (
                      <>
                        <Button variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => void transition("return")}>Return</Button>
                        <Button className={ACTION} disabled={busy || !reviewNote.trim()} onClick={() => void transition("endorse")}>Endorse</Button>
                      </>
                    )}
                    {permissions.create && batch.status === "endorsed" && (
                      <Button className={ACTION} disabled={busy} onClick={() => void transition("final_submit")}>Final submit</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={busy} onClick={() => batchStep ? void goToBatchStep(batchStep - 1) : void navigate("register")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          {batchStep < 3 && <Button className={ACTION} disabled={busy || (batchStep === 1 && !batch.activities?.length)} onClick={() => void goToBatchStep(batchStep + 1)}>{batchStep === 1 ? "Register beneficiaries" : batchStep === 2 ? "Review & endorse" : "Continue"}<ArrowRight className="w-4 h-4" /></Button>}
        </div>
      </>}
    </>}
    </div></ScrollArea>

    <Dialog open={Boolean(link?.reference_id && batch)} onOpenChange={(open) => { if (!open) closeEnrolmentModal(); }}>
      <DialogContent
        showCloseButton
        className="max-w-5xl w-[min(96vw,72rem)] max-h-[92vh] overflow-hidden p-0 flex flex-col"
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#d4e8dc] shrink-0">
          <DialogTitle>Register beneficiaries</DialogTitle>
          <DialogDescription>
            Existing Enrolment Form · Drive ID{" "}
            <span className="font-mono font-semibold text-[#145c3f]">{link?.reference_id}</span>
            {link?.activity_category ? ` · ${link.activity_category}` : ""}
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
              driveContext={{ reference_id: link.reference_id, programs_supported: link.programs_supported }}
              embedded
              onBack={closeEnrolmentModal}
              onCancel={closeEnrolmentModal}
              onSubmitted={closeEnrolmentModal}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
