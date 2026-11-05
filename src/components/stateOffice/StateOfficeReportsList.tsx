import * as React from "react";
import { useListSearch } from "./useListSearch";
import {
  Plus, Loader2, RefreshCw, ArrowLeft,
  FileText, Clock, CheckCircle2, XCircle,
  type LucideIcon,
} from "lucide-react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { useStateOfficeReportsListTable } from "./StateOfficeReportsListTableConfig";
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
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
import ExpenditureProfileReportPage from "./ExpenditureProfileReportPage";
import ExpenditureProfileReportDetail from "./ExpenditureProfileReportDetail";
import {
  REPORT_CONFIG, MONTHS, monthLabel,
  labelOf, SSHIA_SUB_HEADS,
  type StateOfficeReportType,
} from "./constants";
import { ENROLMENT_ACTIVITIES, enrolmentLineListSummary } from "./enrolmentPillarTypes";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import {
  SubmitConfirmModal,
  useReportingOfficerSubmitConfirm,
} from "@/src/components/SubmitConfirmModal";

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
  /** Pre-select activity when creating from an activity tab (e.g. enrolment). */
  initialCategory?: string | null;
}

interface ActivityTab {
  value: string;
  label: string;
  newLabel: string;
  description?: string;
  icon?: LucideIcon;
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
  /** Enrolment-style columns: period, activity, subject, status. */
  activityRows?: {
    options: { value: string; label: string }[];
    summarize: (report: Report) => { key: string; activity: string; subject: string };
  };
  /**
   * When set, show activity tabs at the top; list + New button follow the selected tab.
   * Replaces the activity dropdown filter.
   */
  activityTabs?: ActivityTab[];
  /** Override the create button label (e.g. "New Enrolment Drive"). */
  createButtonLabel?: string;
  renderForm?: (props: FormRenderProps) => React.ReactNode;
  /** Provider Management endorsement statuses on accreditation reports. */
  providerWorkflow?: boolean;
  /**
   * Reporting officers get a register of their own submissions (draft + submitted),
   * not a form-only screen. Coordinators still see the full state list.
   */
  officerOwnList?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200",        icon: <FileText className="w-3 h-3" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  returned:         { label: "Returned",        cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3 h-3" /> },
  endorsed:         { label: "Endorsed",        cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3 h-3" /> },
  submitted:        { label: "Submitted",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  approved:         { label: "Approved",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export default function StateOfficeReportsList({
  reportType, reportTypes, onBack, defaultZoneId, defaultStateId, activityModule, activityModuleColumn, activityModuleLabels, listTitle, activityRows, activityTabs, createButtonLabel, renderForm, providerWorkflow, officerOwnList,
}: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const typesToLoad = React.useMemo(
    () => (reportTypes?.length ? reportTypes : [reportType]),
    [reportTypes, reportType],
  );
  const multiType = typesToLoad.length > 1;
  const { canCreate, canReview, createOnly: baseCreateOnly } = useStateOfficeAccess();
  const submitConfirm = useReportingOfficerSubmitConfirm();
  const [finalBusy, setFinalBusy] = React.useState(false);
  const authUser = useSelector((s: RootState) => s.auth.user);
  // Match Stakeholder Management: officers with the endorsement workflow see their own list
  // (draft → awaiting review → endorsed → final submit), not a create-only form-first screen.
  // Enrolment Activity (officerOwnList): same — register of own submissions, not form-only.
  const createOnly = (providerWorkflow || officerOwnList) ? false : baseCreateOnly;
  const listMineOnly = !!officerOwnList && baseCreateOnly;
  const isFinanceList =
    reportType === "igr"
    || reportType === "sshia-financial"
    || reportType === "expenditure-profile";
  const hasActivityTabs = !!activityTabs?.length;
  const defaultActivityTab = activityTabs?.[0]?.value ?? "all";

  const [mode, setMode] = React.useState<"list" | "create" | "view" | "edit">(createOnly ? "create" : "list");
  const [formKey, setFormKey] = React.useState(0);
  const [selectedId, setSelectedId] = React.useState<number | string | null>(null);
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
  const [filterActivity, setFilterActivity] = React.useState(defaultActivityTab);
  const activeActivityTab = hasActivityTabs
    ? (activityTabs!.find((t) => t.value === filterActivity) ?? activityTabs![0])
    : null;
  const newButtonLabel = activeActivityTab?.newLabel
    ?? createButtonLabel
    ?? (reportType === "enrollee-register" || reportType === "etmc-tmc-action-point" || reportType === "ict-support-register" || reportType === "adhoc-special-assignment"
      ? "New Register"
      : "New Report");
  const createInitialCategory = hasActivityTabs ? (activeActivityTab?.value ?? null) : null;

  const isOwnDraft = React.useCallback((r: Report & { created_by_user_id?: number | null }) => {
    if (!authUser) return true;
    if (authUser.id != null && r.created_by_user_id != null && Number(r.created_by_user_id) === Number(authUser.id)) return true;
    if (authUser.name && r.submitted_by && String(r.submitted_by) === String(authUser.name)) return true;
    return !r.submitted_by && r.created_by_user_id == null;
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
              mine: 1,
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
    setFilterActivity(defaultActivityTab);
    setFormKey((k) => k + 1);
  }, [reportType, createOnly, defaultActivityTab]);

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

  const requestFinalSubmit = (r: Report) => {
    const type = (r.__reportType ?? reportType) as StateOfficeReportType;
    submitConfirm.requestSubmit(async () => {
      setFinalBusy(true);
      try {
        await stateOfficeApi[type].updateStatus(r.id, "submitted");
        toast.success("Final submission complete");
        await load();
        return true;
      } catch (err: unknown) {
        toast.error((err as Error).message || "Final submission failed");
        return false;
      } finally {
        setFinalBusy(false);
      }
    }, {
      force: true,
      title: "Confirm final submission",
      description:
        "This completes the report after State Coordinator endorsement. You will not be able to edit it afterwards.",
      confirmLabel: "Yes, final submit",
    });
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
        ...(listMineOnly ? { mine: 1 as const } : {}),
      };
      const batches = await Promise.all(
        typesToLoad.map(async (t) => {
          const res = await stateOfficeApi[t].list(listParams);
          return (res.data as Report[]).map((r) => ({ ...r, __reportType: t }));
        }),
      );
      let merged = batches.flat().sort((a, b) => {
        const da = a.submission_date || a.createdAt || "";
        const db = b.submission_date || b.createdAt || "";
        return db.localeCompare(da);
      });
      if (listMineOnly) merged = merged.filter(isOwnDraft);
      setReports(merged);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally { setLoading(false); }
  }, [typesToLoad, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth, createOnly, activityModule, listMineOnly, isOwnDraft]);

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

  const { search, setSearch, matchesSearch } = useListSearch();
  const filteredReports = React.useMemo(() => {
    const matching = reports.filter((r) => matchesSearch([
      r, monthLabel(r.reporting_month),
      activityRows?.summarize(r),
      reportType === "enrolment" ? enrolmentLineListSummary(r.lines?.[0] ?? {}) : null,
    ]));
    if (filterActivity === "all") return matching;
    if (activityRows) return matching.filter((r) => activityRows.summarize(r).key === filterActivity);
    if (reportType === "enrolment" || hasActivityTabs) {
      return matching.filter((r) => r.lines?.[0]?.category === filterActivity);
    }
    return matching;
  }, [reports, reportType, filterActivity, activityRows, hasActivityTabs, matchesSearch]);

  /** SSHIA list: one unified row per office + quarter. */
  const sshiaListRows = React.useMemo(() => {
    if (reportType !== "sshia-financial") return [] as Array<{
      report: Report;
      filledLabels: string[];
      filledCount: number;
    }>;
    return filteredReports.map((r) => {
      const lines = Array.isArray((r as any).lines) ? (r as any).lines as any[] : [];
      const filledLabels: string[] = [];

      if (lines.length) {
        for (const line of lines) {
          filledLabels.push(
            labelOf(SSHIA_SUB_HEADS as any, String(line.sub_head || ""), String(line.sub_head || "—")),
          );
        }
      } else {
        for (const h of SSHIA_SUB_HEADS) {
          const p = h.prefix;
          const opening = (r as any)[`${p}_opening_balance`] ?? null;
          const receipts = (r as any)[`${p}_receipts`] ?? null;
          const actual = (r as any)[`${p}_actual_expenditure`] ?? null;
          const lives = (r as any)[`${p}_bhcpf_lives`] ?? null;
          if (opening == null && receipts == null && actual == null && lives == null) continue;
          filledLabels.push(h.label);
        }
      }

      return {
        report: r,
        filledLabels,
        filledCount: filledLabels.length,
      };
    });
  }, [filteredReports, reportType]);

  const activityTabCounts = React.useMemo(() => {
    if (!hasActivityTabs) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const tab of activityTabs!) map[tab.value] = 0;
    for (const r of reports) {
      const key = activityRows
        ? activityRows.summarize(r).key
        : String(r.lines?.[0]?.category ?? "");
      if (key in map) map[key] += 1;
    }
    return map;
  }, [hasActivityTabs, activityTabs, reports, activityRows]);

  const counts = React.useMemo(() => ({
    total:     filteredReports.length,
    draft:     filteredReports.filter(r => r.status === "draft" || r.status === "returned").length,
    awaiting_review: filteredReports.filter(r => r.status === "awaiting_review").length,
    endorsed:  filteredReports.filter(r => r.status === "endorsed").length,
    // Stakeholder-style: final submission is the done state (submitted or approved)
    submitted: filteredReports.filter(r => r.status === "submitted" || r.status === "approved").length,
    approved:  filteredReports.filter(r => r.status === "approved").length,
  }), [filteredReports]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map(r => r.reporting_year)),
    [reports],
  );

  const hasFilters = !!search.trim() || filterYear !== "all"
    || filterMonth !== "all"
    || filterStatus !== "all"
    || (!hasActivityTabs && (reportType === "enrolment" || !!activityRows) && filterActivity !== "all")
    || stateFilterActive;

  const clearFilters = () => {
    setSearch("");
    setFilterYear("all");
    setFilterMonth("all");
    setFilterStatus("all");
    if (!hasActivityTabs) setFilterActivity("all");
    if (showStateFilter) setFilterState(ALL_STATES);
  };

  const showLocationCols = !defaultStateId || !defaultZoneId;

  const {
    columns: listColumns,
    tableData: listTableData,
    registerTitle: listRegisterTitle,
    emptyMessage: listEmptyMessage,
    onRowClick: listOnRowClick,
  } = useStateOfficeReportsListTable({
    reportType,
    cfg,
    filteredReports,
    sshiaListRows,
    showLocationCols,
    hasActivityTabs,
    multiType,
    activityModuleColumn,
    activityModuleLabels,
    activityRows,
    canCreate,
    finalBusy,
    openReport,
    requestFinalSubmit,
    listTitle,
    activeActivityTab,
    hasFilters,
  });

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
          initialCategory: mode === "create" ? createInitialCategory : null,
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
        initialCategory={mode === "create" ? createInitialCategory : null}
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
    <PageLayout
      title={listTitle ?? activeActivityTab?.label ?? cfg.title}
      showBack={false}
      contentClassName="space-y-3 pb-6"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-sm">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/20 h-8 text-xs rounded-sm"
              onClick={() => { setSelectedId(null); setSelectedReportType(reportType); setMode("create"); setFormKey((k) => k + 1); }}
            >
              <Plus className="w-3.5 h-3.5" /> {newButtonLabel}
            </Button>
          )}
        </div>
      }
      tabs={
        hasActivityTabs ? (
          <UnderHeaderNavTabs
            tabs={activityTabs!.map((tab) => ({
              id: tab.value,
              label: tab.label,
              icon: tab.icon,
              count: activityTabCounts[tab.value] ?? 0,
            }))}
            activeTab={filterActivity}
            onChange={(val) => setFilterActivity(val as any)}
            ariaLabel="Enrolment activities"
          />
        ) : undefined
      }
    >
      <ScrollArea className="flex-1">
        <div className="w-full space-y-3">
          {activityRows ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span><span className="font-semibold text-slate-800">{counts.total}</span> reports</span>
              <span><span className="font-semibold text-slate-800">{counts.draft}</span> draft</span>
              <span><span className="font-semibold text-slate-800">{counts.submitted}</span> submitted</span>
              <span><span className="font-semibold text-slate-800">{counts.approved}</span> approved</span>
            </div>
          ) : (
          <div className={`grid grid-cols-2 gap-3 ${providerWorkflow || hasActivityTabs ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
            {(providerWorkflow || hasActivityTabs ? [
              { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft / Returned", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Awaiting review", value: counts.awaiting_review, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
              { label: "Endorsed", value: counts.endorsed, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
              { label: "Submitted", value: counts.submitted, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ] : [
              { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Submitted", value: counts.submitted, tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
              { label: "Approved", value: counts.approved, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ]).map((c) => (
              <div key={c.label} className={`rounded-sm border px-3 py-2.5 ${c.tone}`}>
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
          )}

          <Card className="rounded-sm border-[#d4e8dc]">
            <CardContent className="pt-2.5 pb-2.5 space-y-2">
              <div className="grid grid-flow-col auto-cols-fr gap-2.5">
                {showStateFilter && (
                  <div className="space-y-1 min-w-0">
                    <Label className="text-xs text-muted-foreground">State</Label>
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

                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Year</Label>
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

                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Month</Label>
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

                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Status</Label>
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

                {!hasActivityTabs && (reportType === "enrolment" || activityRows) && (
                  <div className="space-y-1 min-w-0">
                    <Label className="text-xs text-muted-foreground">Activity</Label>
                    <Select value={filterActivity} onValueChange={setFilterActivity}>
                      <SelectTrigger className="w-full"
                        displayValue={
                          filterActivity === "all"
                            ? "All Activities"
                            : ((activityRows?.options ?? ENROLMENT_ACTIVITIES).find((a) => a.value === filterActivity)?.label ?? filterActivity)
                        }>
                        <SelectValue placeholder="All Activities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        {(activityRows?.options ?? ENROLMENT_ACTIVITIES).map((a) => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {hasFilters && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={clearFilters}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ShadcnDataTable
            title={listRegisterTitle}
            columns={listColumns}
            data={listTableData}
            loading={loading}
            searchPlaceholder="Search reports..."
            searchValue={search}
            onSearchChange={setSearch}
            emptyMessage={listEmptyMessage}
            onRowClick={listOnRowClick}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>

      {isFinanceList && (
        <SubmitConfirmModal
          open={submitConfirm.open}
          busy={submitConfirm.busy || finalBusy}
          title={submitConfirm.title}
          description={submitConfirm.description}
          confirmLabel={submitConfirm.confirmLabel}
          onConfirm={submitConfirm.confirm}
          onCancel={submitConfirm.cancel}
        />
      )}

      
    </PageLayout>
  );
}
