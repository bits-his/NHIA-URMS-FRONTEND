import * as React from "react";
import {
  Plus, Loader2, RefreshCw, Eye, ArrowLeft,
  FileText, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { StateOfficeFormRouter, StateOfficeDetailRouter } from "./registry";
import IgrReportPage from "./IgrReportPage";
import IgrReportDetail from "./IgrReportDetail";
import SshiaFinancialReportPage from "./SshiaFinancialReportPage";
import SshiaFinancialReportDetail from "./SshiaFinancialReportDetail";
import ExpenditureProfileReportPage from "./ExpenditureProfileReportPage";
import ExpenditureProfileReportDetail from "./ExpenditureProfileReportDetail";
import {
  REPORT_CONFIG, MONTHS, monthLabel, quarterFromMonth, formatCount, formatDate,
  reportLineTotal, reportLineCount, ENROLLEE_REGISTER_SCHEMES, type StateOfficeReportType,
} from "./constants";
import { ENROLMENT_ACTIVITIES, enrolmentLineListSummary } from "./enrolmentPillarTypes";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";

interface Report {
  id: number;
  reference_id: string;
  reporting_year: number;
  reporting_month: number;
  submission_date: string | null;
  submitted_by: string | null;
  status: string;
  createdAt?: string;
  zone_id?: number;
  state_id?: number;
  self_paying?: number;
  ops?: number;
  retirees?: number;
  constituency?: number;
  gifship?: number;
  formal_sector?: number;
  total_lives?: number;
  zone?: { id?: number; description: string };
  state?: { id?: number; description: string };
  lines?: any[];
  activity_module?: string | null;
  /** Present when list merges multiple report types (e.g. Enrolment Drives). */
  __reportType?: StateOfficeReportType;
}

interface FormRenderProps {
  reportId: number | null;
  reportType: StateOfficeReportType;
  onBack: () => void;
  onSubmitted: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onPersisted?: (saved: { id: number; status: string; reference_id?: string }) => void;
}

interface Props {
  reportType: StateOfficeReportType;
  /** When set, load and merge these report types into one list (ids tagged with __reportType). */
  reportTypes?: StateOfficeReportType[];
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  /** When set, only reports for this pillar menu are listed */
  activityModule?: string;
  /** Show activity_module column (merged hubs e.g. Stakeholder Management). */
  activityModuleColumn?: boolean;
  activityModuleLabels?: Record<string, string>;
  listTitle?: string;
  renderForm?: (props: FormRenderProps) => React.ReactNode;
  /** Provider Management endorsement statuses on accreditation reports. */
  providerWorkflow?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  returned:         { label: "Returned",  cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3 h-3" /> },
  endorsed:         { label: "Endorsed",  cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3 h-3" /> },
  submitted:        { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:         { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function StateOfficeReportsList({
  reportType, reportTypes, onBack, defaultZoneId, defaultStateId, activityModule, activityModuleColumn, activityModuleLabels, listTitle, renderForm, providerWorkflow,
}: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const typesToLoad = React.useMemo(
    () => (reportTypes?.length ? reportTypes : [reportType]),
    [reportTypes, reportType],
  );
  const multiType = typesToLoad.length > 1;
  const { canCreate, createOnly } = useStateOfficeAccess();
  const authUser = useSelector((s: RootState) => s.auth.user);

  const [mode, setMode] = React.useState<"list" | "create" | "view" | "edit">(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [selectedReportType, setSelectedReportType] = React.useState<StateOfficeReportType>(reportType);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [myDrafts, setMyDrafts] = React.useState<Report[]>([]);
  const [resumingDraft, setResumingDraft] = React.useState(!!createOnly);

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
    stateFilterActive,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const [filterYear,     setFilterYear]     = React.useState("all");
  const [filterMonth,    setFilterMonth]    = React.useState("all");
  const [filterStatus,   setFilterStatus]   = React.useState("all");
  const [filterActivity, setFilterActivity] = React.useState("all");

  const isOwnDraft = React.useCallback((r: Report) => {
    if (!authUser) return true;
    if (authUser.name && r.submitted_by && String(r.submitted_by) === String(authUser.name)) return true;
    return !r.submitted_by;
  }, [authUser]);

  const refreshMyDrafts = React.useCallback(async () => {
    if (!createOnly) return [] as Report[];
    // Resume work-in-progress only. Awaiting-review stays with the coordinator (not reopened as a draft).
    const statuses = providerWorkflow ? ["draft", "returned", "endorsed"] : ["draft"];
    const batches = await Promise.all(
      typesToLoad.map(async (t) => {
        const results = await Promise.all(
          statuses.map((status) =>
            stateOfficeApi[t].list({
              status,
              zone_id: defaultZoneId ?? undefined,
              state_id: apiStateId,
              activity_module: activityModule,
            }),
          ),
        );
        return results.flatMap((res) =>
          ((res.data as Report[]) || []).map((r) => ({ ...r, __reportType: t })),
        );
      }),
    );
    const merged = batches.flat().filter(isOwnDraft).sort((a, b) => b.id - a.id);
    setMyDrafts(merged);
    return merged;
  }, [
    createOnly, providerWorkflow, typesToLoad, defaultZoneId, apiStateId, activityModule, isOwnDraft,
  ]);

  const openDraft = React.useCallback((r: Report) => {
    setSelectedReportType(r.__reportType ?? reportType);
    setSelectedId(r.id);
    setMode("edit");
    setFormKey((k) => k + 1);
  }, [reportType]);

  const startBlankCreate = React.useCallback(() => {
    setSelectedId(null);
    setSelectedReportType(reportType);
    setMode("create");
    setFormKey((k) => k + 1);
  }, [reportType]);

  // Reset nested view when switching report types in the sidebar
  React.useEffect(() => {
    setMode(createOnly ? "create" : "list");
    setSelectedId(null);
    setSelectedReportType(reportType);
    setFilterActivity("all");
    setFormKey((k) => k + 1);
  }, [reportType, createOnly]);

  // Create-only officers: reopen unfinished drafts instead of a blank form
  React.useEffect(() => {
    if (!createOnly) {
      setResumingDraft(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setResumingDraft(true);
      try {
        const drafts = await refreshMyDrafts();
        if (cancelled) return;
        if (drafts.length > 0) openDraft(drafts[0]);
      } catch {
        /* start blank if draft load fails */
      } finally {
        if (!cancelled) setResumingDraft(false);
      }
    })();
    return () => { cancelled = true; };
    // Resume once when the create-only page (or geo/auth context) mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOnly, authUser?.staff_id, authUser?.name, defaultZoneId, defaultStateId, reportType, activityModule]);

  const openReport = (r: Report, nextMode: "view" | "edit") => {
    setSelectedReportType(r.__reportType ?? reportType);
    setSelectedId(r.id);
    setMode(nextMode);
  };

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const listParams = {
        status: filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
        activity_module: activityModule,
      };
      const batches = await Promise.all(
        typesToLoad.map(async (t) => {
          const res = await stateOfficeApi[t].list(listParams);
          return (res.data as Report[]).map((r) => ({ ...r, __reportType: t }));
        }),
      );
      const merged = batches.flat().sort((a, b) => {
        const da = a.submission_date || a.createdAt || "";
        const db = b.submission_date || b.createdAt || "";
        return db.localeCompare(da);
      });
      setReports(merged);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally { setLoading(false); }
  }, [typesToLoad, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth, createOnly, activityModule]);

  React.useEffect(() => { if (!createOnly) load(); }, [load, createOnly]);

  const leaveForm = React.useCallback(() => {
    if (createOnly) {
      void (async () => {
        setResumingDraft(true);
        try {
          const drafts = await refreshMyDrafts();
          if (drafts.length > 0) openDraft(drafts[0]);
          else startBlankCreate();
        } catch {
          startBlankCreate();
        } finally {
          setResumingDraft(false);
        }
      })();
      return;
    }
    setSelectedId(null);
    setMode("list");
    load();
  }, [createOnly, load, refreshMyDrafts, openDraft, startBlankCreate]);

  const leaveDetail = React.useCallback(() => {
    if (createOnly) {
      leaveForm();
      return;
    }
    setSelectedId(null);
    setMode("list");
    load();
  }, [createOnly, leaveForm, load]);

  const handlePersisted = React.useCallback((saved: { id: number; status: string; reference_id?: string }) => {
    if (!createOnly) return;
    if (saved.status === "draft" || saved.status === "returned" || saved.status === "endorsed") {
      setSelectedId(saved.id);
      setMode("edit");
      void refreshMyDrafts().catch(() => {});
    }
  }, [createOnly, refreshMyDrafts]);

  const filteredReports = React.useMemo(() => {
    if (reportType !== "enrolment" || filterActivity === "all") return reports;
    return reports.filter((r) => r.lines?.[0]?.category === filterActivity);
  }, [reports, reportType, filterActivity]);

  const counts = React.useMemo(() => ({
    total:     filteredReports.length,
    draft:     filteredReports.filter(r => r.status === "draft" || r.status === "returned").length,
    awaiting_review: filteredReports.filter(r => r.status === "awaiting_review").length,
    endorsed:  filteredReports.filter(r => r.status === "endorsed").length,
    submitted: filteredReports.filter(r => r.status === "submitted").length,
    approved:  filteredReports.filter(r => r.status === "approved").length,
  }), [filteredReports]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map(r => r.reporting_year)),
    [reports],
  );

  const hasFilters = filterYear !== "all"
    || filterMonth !== "all"
    || filterStatus !== "all"
    || (reportType === "enrolment" && filterActivity !== "all")
    || stateFilterActive;

  const clearFilters = () => {
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    setFilterActivity("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  const showLocationCols = !defaultStateId || !defaultZoneId;

  if (mode === "view" && selectedId) {
    if (selectedReportType === "igr") {
      return (
        <IgrReportDetail
          reportId={selectedId}
          onBack={leaveDetail}
          onEdit={canCreate ? () => setMode("edit") : undefined}
        />
      );
    }
    if (selectedReportType === "sshia-financial") {
      return (
        <SshiaFinancialReportDetail
          reportId={selectedId}
          onBack={leaveDetail}
          onEdit={canCreate ? () => setMode("edit") : undefined}
        />
      );
    }
    if (selectedReportType === "expenditure-profile") {
      return (
        <ExpenditureProfileReportDetail
          reportId={selectedId}
          onBack={leaveDetail}
          onEdit={canCreate ? () => setMode("edit") : undefined}
        />
      );
    }
    return (
      <StateOfficeDetailRouter
        reportType={selectedReportType}
        reportId={selectedId}
        onBack={leaveDetail}
        onEdit={canCreate ? () => setMode("edit") : undefined}
      />
    );
  }

  if (mode === "create" || mode === "edit") {
    if (createOnly && resumingDraft) {
      return (
        <div className="flex flex-col h-full items-center justify-center gap-3 bg-slate-50/30">
          <Loader2 className="w-6 h-6 animate-spin text-[#145c3f]" />
          <p className="text-sm text-slate-500">Loading your draft…</p>
        </div>
      );
    }

    const cancelCreate = createOnly ? onBack : leaveForm;
    const formBack = createOnly ? onBack : (mode === "edit" ? leaveDetail : cancelCreate);
    const formDone = leaveForm;
    const formReportType = mode === "edit" ? selectedReportType : reportType;
    const formReportId = mode === "edit" ? selectedId : null;
    const otherDrafts = createOnly ? myDrafts.filter((d) => d.id !== selectedId) : [];
    const activeDraft = createOnly && selectedId
      ? myDrafts.find((d) => d.id === selectedId)
      : null;

    const formNode = formReportType === "igr" ? (
      <IgrReportPage
        key={formKey}
        reportId={formReportId}
        onBack={formBack}
        onSubmitted={formDone}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    ) : formReportType === "sshia-financial" ? (
      <SshiaFinancialReportPage
        key={formKey}
        reportId={formReportId}
        onBack={formBack}
        onSubmitted={formDone}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    ) : formReportType === "expenditure-profile" ? (
      <ExpenditureProfileReportPage
        key={formKey}
        reportId={formReportId}
        onBack={formBack}
        onSubmitted={formDone}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    ) : renderForm ? (
      <React.Fragment key={formKey}>
        {renderForm({
          reportId: formReportId,
          reportType: formReportType,
          onBack: formBack,
          onSubmitted: formDone,
          defaultZoneId,
          defaultStateId,
          onPersisted: handlePersisted,
        })}
      </React.Fragment>
    ) : (
      <StateOfficeFormRouter
        key={formKey}
        reportType={formReportType}
        reportId={formReportId}
        onBack={formBack}
        onCancel={formBack}
        onSubmitted={formDone}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
        onPersisted={handlePersisted}
      />
    );

    if (!createOnly) return formNode;

    return (
      <div className="flex flex-col h-full min-h-0">
        {(myDrafts.length > 0 || selectedId) && (
          <div className="bg-[#f4f7f5] border-b border-[#d4e8dc] px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600 shrink-0">
              {selectedId
                ? `Continuing draft${activeDraft?.reference_id ? ` ${activeDraft.reference_id}` : ""}`
                : `${myDrafts.length} unfinished draft${myDrafts.length === 1 ? "" : "s"}`}
            </span>
            {otherDrafts.slice(0, 3).map((d) => (
              <Button
                key={d.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => openDraft(d)}
              >
                {d.reference_id || `Draft #${d.id}`}
              </Button>
            ))}
            {selectedId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs ml-auto"
                onClick={startBlankCreate}
              >
                Start new report
              </Button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0">{formNode}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
        <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight truncate">{listTitle ?? cfg.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={() => { setSelectedId(null); setSelectedReportType(reportType); setMode("create"); }}
          >
            <Plus className="w-4 h-4" /> {reportType === "enrollee-register" || reportType === "etmc-tmc-action-point" || reportType === "ict-support-register" || reportType === "adhoc-special-assignment" ? "New Register" : "New Report"}
          </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          <div className={`grid grid-cols-2 gap-4 ${providerWorkflow ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-4"}`}>
            {(providerWorkflow ? [
              { label: "Total", value: counts.total, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
              { label: "Draft / Returned", value: counts.draft, color: "bg-slate-50 border-slate-200", text: "text-slate-600" },
              { label: "Awaiting review", value: counts.awaiting_review, color: "bg-amber-50 border-amber-200", text: "text-amber-800" },
              { label: "Endorsed", value: counts.endorsed, color: "bg-teal-50 border-teal-200", text: "text-teal-800" },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200", text: "text-blue-700" },
              { label: "Approved", value: counts.approved, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ] : [
              { label: "Total",     value: counts.total,     color: "bg-slate-50 border-slate-200",     text: "text-slate-700"  },
              { label: "Draft",     value: counts.draft,     color: "bg-slate-50 border-slate-200",     text: "text-slate-600"  },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200",       text: "text-blue-700"   },
              { label: "Approved",  value: counts.approved,  color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ]).map(c => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}>
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-row flex-wrap items-center gap-3 w-full bg-white rounded-2xl border border-[#d4e8dc] px-5 py-4">
            {showStateFilter && (
              <div className="flex-1 min-w-[140px]">
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-full"
                    displayValue={filterState === ALL_STATES
                      ? "All States"
                      : (states.find(s => String(s.id) === filterState)?.description ?? filterState)}>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATES}>All States</SelectItem>
                    {states.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 min-w-[120px]">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full"
                  displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[130px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full"
                  displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  {providerWorkflow && (
                    <>
                      <SelectItem value="awaiting_review">Awaiting review</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="endorsed">Endorsed</SelectItem>
                    </>
                  )}
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "enrolment" && (
              <div className="flex-1 min-w-[160px]">
                <Select value={filterActivity} onValueChange={setFilterActivity}>
                  <SelectTrigger className="w-full"
                    displayValue={
                      filterActivity === "all"
                        ? "All Activities"
                        : (ENROLMENT_ACTIVITIES.find((a) => a.value === filterActivity)?.label ?? filterActivity)
                    }>
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {ENROLMENT_ACTIVITIES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={clearFilters}>
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading
                  ? "Loading..."
                  : reportType === "enrollee-register" || reportType === "etmc-tmc-action-point" || reportType === "ict-support-register" || reportType === "adhoc-special-assignment"
                    ? `${filteredReports.length} register${filteredReports.length !== 1 ? "s" : ""}`
                    : `${filteredReports.length} report${filteredReports.length !== 1 ? "s" : ""}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">{hasFilters ? "No reports match your filters" : "No reports found"}</p>
                  {!hasFilters && canCreate && (
                    <Button variant="outline" size="sm" className="mt-2 gap-2"
                      onClick={() => { setSelectedId(null); setSelectedReportType(reportType); setMode("create"); }}>
                      <Plus className="w-4 h-4" /> {reportType === "enrollee-register" || reportType === "etmc-tmc-action-point" || reportType === "ict-support-register" || reportType === "adhoc-special-assignment" ? "New Register" : "New Report"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        {reportType === "enrollee-register" ? (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Month</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone ID</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State ID</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                            {ENROLLEE_REGISTER_SCHEMES.map((s) => (
                              <TableHead key={s.key} className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">{s.label}</TableHead>
                            ))}
                            <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Total Lives</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                          </>
                        ) : reportType === "ict-support-register" || reportType === "adhoc-special-assignment" ? (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date Submitted</TableHead>
                            {showLocationCols && (
                              <>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                              </>
                            )}
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Month</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Quarter</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Submitted By</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                          </>
                        ) : reportType === "enrolment" ? (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date</TableHead>
                            {showLocationCols && (
                              <>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                              </>
                            )}
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Activity</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Program</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Outcome</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                          </>
                        ) : reportType === "stakeholder" ? (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Period</TableHead>
                            {showLocationCols && (
                              <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                            )}
                            <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Activities</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Reference</TableHead>
                            {multiType && (
                              <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Drive Type</TableHead>
                            )}
                            {activityModuleColumn && (
                              <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Type</TableHead>
                            )}
                            {showLocationCols && (
                              <>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Zone</TableHead>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">State</TableHead>
                              </>
                            )}
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Year</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Month</TableHead>
                            {reportType === "weekly-actionable" && (
                              <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Week</TableHead>
                            )}
                            {reportType === "etmc-tmc-action-point" && (
                              <>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Session</TableHead>
                                <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Meeting Date</TableHead>
                              </>
                            )}
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Quarter</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">Entries</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 text-right whitespace-nowrap">{cfg.totalLabel}</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Submitted By</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Date Submitted</TableHead>
                            <TableHead className="text-xs font-bold text-slate-600 whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold text-slate-600 whitespace-nowrap">View</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredReports.map((r, i) => {
                      const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
                      const rowType = r.__reportType ?? reportType;
                      const typeLabel = REPORT_CONFIG[rowType]?.title ?? rowType;
                      const enrolmentSummary = reportType === "enrolment"
                        ? enrolmentLineListSummary(r.lines?.[0])
                        : null;
                      return (
                          <motion.tr key={`${rowType}-${r.id}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                            {reportType === "enrollee-register" ? (
                              <>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.reporting_year}</TableCell>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                                <TableCell className="text-sm tabular-nums text-slate-500 whitespace-nowrap">{r.zone_id ?? r.zone?.id ?? "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                                <TableCell className="text-sm tabular-nums text-slate-500 whitespace-nowrap">{r.state_id ?? r.state?.id ?? "—"}</TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                                {ENROLLEE_REGISTER_SCHEMES.map((s) => (
                                  <TableCell key={s.key} className="text-sm text-right tabular-nums text-slate-700 whitespace-nowrap">
                                    {formatCount(r[s.key] ?? 0)}
                                  </TableCell>
                                ))}
                                <TableCell className="text-sm font-bold text-[#145c3f] text-right tabular-nums whitespace-nowrap">
                                  {formatCount(r.total_lives ?? 0)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                    {sc.icon} {sc.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm"
                                    className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => openReport(r, "view")}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </TableCell>
                              </>
                            ) : reportType === "ict-support-register" || reportType === "adhoc-special-assignment" ? (
                              <>
                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(r.submission_date)}</TableCell>
                                {showLocationCols && (
                                  <>
                                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                                    <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                                  </>
                                )}
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.reporting_year}</TableCell>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                                <TableCell className="text-sm text-slate-500 whitespace-nowrap">Q{quarterFromMonth(r.reporting_month)}</TableCell>
                                <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.submitted_by || "—"}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                    {sc.icon} {sc.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm"
                                    className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => openReport(r, "view")}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </TableCell>
                              </>
                            ) : reportType === "enrolment" && enrolmentSummary ? (
                              <>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                                  {monthLabel(r.reporting_month)} {r.reporting_year}
                                </TableCell>
                                {showLocationCols && (
                                  <>
                                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                                    <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                                  </>
                                )}
                                <TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">{enrolmentSummary.activity}</TableCell>
                                <TableCell className="text-sm text-slate-700 whitespace-nowrap">{enrolmentSummary.program}</TableCell>
                                <TableCell className="text-sm font-medium text-slate-800 whitespace-nowrap">{enrolmentSummary.outcome}</TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                    {sc.icon} {sc.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm"
                                    className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => openReport(r, "view")}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </TableCell>
                              </>
                            ) : reportType === "stakeholder" ? (
                              <>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                                  {monthLabel(r.reporting_month)} {r.reporting_year}
                                </TableCell>
                                {showLocationCols && (
                                  <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                                    {r.state?.description || "—"}
                                  </TableCell>
                                )}
                                <TableCell className="text-sm font-semibold text-[#145c3f] text-right tabular-nums">
                                  {formatCount(reportLineCount(rowType, r))}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                    {sc.icon} {sc.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm"
                                    className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
                                    onClick={() => openReport(r, "view")}>
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </Button>
                                </TableCell>
                              </>
                            ) : (
                              <>
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-primary">{r.reference_id}</span>
                            </TableCell>
                            {multiType && (
                              <TableCell className="text-sm text-slate-700 whitespace-nowrap max-w-[180px] truncate" title={typeLabel}>
                                {typeLabel}
                              </TableCell>
                            )}
                            {activityModuleColumn && (
                              <TableCell className="text-sm text-slate-700 whitespace-nowrap max-w-[180px] truncate"
                                title={activityModuleLabels?.[r.activity_module ?? ""] ?? r.activity_module ?? ""}>
                                {activityModuleLabels?.[r.activity_module ?? ""]
                                  ?? r.activity_module
                                  ?? "—"}
                              </TableCell>
                            )}
                            {showLocationCols && (
                              <>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{r.zone?.description || "—"}</TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.state?.description || "—"}</TableCell>
                              </>
                            )}
                            <TableCell className="text-sm font-semibold text-slate-800 whitespace-nowrap">{r.reporting_year}</TableCell>
                            <TableCell className="text-sm text-slate-600 whitespace-nowrap">{monthLabel(r.reporting_month)}</TableCell>
                            {reportType === "weekly-actionable" && (
                              <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                                {(r as any).reporting_week ? `Wk ${(r as any).reporting_week}` : "—"}
                              </TableCell>
                            )}
                            {reportType === "etmc-tmc-action-point" && (
                              <>
                                <TableCell className="text-sm text-slate-600 whitespace-nowrap">{(r as any).etmc_session || "—"}</TableCell>
                                <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate((r as any).meeting_date)}</TableCell>
                              </>
                            )}
                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">Q{quarterFromMonth(r.reporting_month)}</TableCell>
                            <TableCell className="text-sm text-slate-500 text-right tabular-nums">{reportLineCount(rowType, r)}</TableCell>
                            <TableCell className="text-sm font-semibold text-slate-800 text-right tabular-nums">{formatCount(reportLineTotal(rowType, r))}</TableCell>
                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">{r.submitted_by || "—"}</TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(r.submission_date)}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm"
                                className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
                                onClick={() => openReport(r, "view")}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </TableCell>
                              </>
                            )}
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
