import * as React from "react";
import { useListSearch } from "./useListSearch";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRightLeft, Building2, CheckCircle2, Clock, Eye, FileText,
  Loader2, Plus, RefreshCw, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel, type StateOfficeReportType } from "./constants";
import BeneficiaryManagementForm from "./BeneficiaryManagementForm";
import BeneficiaryManagementReportDetail from "./BeneficiaryManagementReportDetail";
import {
  BENEFICIARY_ACTIVITIES,
  BENEFICIARY_MANAGEMENT_NAV_TITLE,
  BENEFICIARY_MANAGEMENT_PATH,
  BENEFICIARY_REPORT_TYPES,
  activityApiType,
  beneficiaryListSummary,
  beneficiaryTabMatches,
  type BeneficiaryActivityKey,
} from "./beneficiaryManagementTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type ReportType = (typeof BENEFICIARY_REPORT_TYPES)[number];
type Mode = "list" | "new" | "view" | "edit";

interface Report {
  id: number | string;
  reference_id?: string;
  reporting_year: number;
  reporting_month: number;
  status: "draft" | "submitted" | "approved";
  createdAt?: string;
  submission_date?: string | null;
  zone?: { description?: string };
  state?: { description?: string };
  lines?: unknown[];
  endorsed?: boolean | number;
  __reportType: ReportType;
}

const REPORT_TYPES = new Set<string>(BENEFICIARY_REPORT_TYPES);

const ACTIVITY_ICONS: Record<BeneficiaryActivityKey, LucideIcon> = {
  additional: UserPlus,
  extra: Users,
  provider: ArrowRightLeft,
  mda: Building2,
};

const STATUS = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200", icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "In review", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  endorsed: { label: "Endorsed", cls: "bg-teal-100 text-teal-800 border-teal-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
} as const;

function reportStatus(row: { status: keyof typeof STATUS; endorsed?: boolean | number }) {
  if (row.status === "draft" && row.endorsed) return STATUS.endorsed;
  return STATUS[row.status] ?? STATUS.draft;
}

function isReportType(value: string | null): value is ReportType {
  return !!value && REPORT_TYPES.has(value);
}

function isActivityKey(value: string | null | undefined): value is BeneficiaryActivityKey {
  return !!value && BENEFICIARY_ACTIVITIES.some((a) => a.key === value);
}

export default function BeneficiaryManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate, canReview } = useStateOfficeAccess();
  const modeParam = searchParams.get("mode");
  const mode: Mode =
    modeParam === "new" || modeParam === "view" || modeParam === "edit"
      ? modeParam
      : "list";
  const queryIdRaw = searchParams.get("id");
  const queryType = searchParams.get("type");
  const queryActivity = searchParams.get("activity");
  const reportId = queryIdRaw && String(queryIdRaw).trim() ? String(queryIdRaw).trim() : null;
  const reportType: ReportType = isReportType(queryType) ? queryType : "extra-dependant";

  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(mode === "list");
  const [formKey, setFormKey] = React.useState(0);
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState<BeneficiaryActivityKey>(
    BENEFICIARY_ACTIVITIES[0].key,
  );

  const activeActivity = BENEFICIARY_ACTIVITIES.find((a) => a.key === activeTab) ?? BENEFICIARY_ACTIVITIES[0];
  const newButtonLabel = activeActivity.newLabel;
  const createActivity: BeneficiaryActivityKey = isActivityKey(queryActivity) ? queryActivity : activeTab;

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const showLocation = !defaultStateId || !defaultZoneId;

  const setQuery = React.useCallback((
    next: {
      mode?: Mode;
      id?: number | string | null;
      type?: string | null;
      activity?: BeneficiaryActivityKey | null;
    },
    opts?: { replace?: boolean },
  ) => {
    const params = new URLSearchParams();
    const nextMode = next.mode ?? "list";
    if (nextMode !== "list") {
      params.set("mode", nextMode);
      if (next.id != null) params.set("id", String(next.id));
      if (next.type) params.set("type", next.type);
      if (next.activity) params.set("activity", next.activity);
    }
    setSearchParams(params, { replace: !!opts?.replace });
  }, [setSearchParams]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const listParams = {
        status: filterStatus === "endorsed" || filterStatus === "draft"
          ? "draft"
          : filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
      };
      const batches = await Promise.all(
        BENEFICIARY_REPORT_TYPES.map(async (type) => {
          const res = await stateOfficeApi[type].list(listParams);
          return (res.data as Omit<Report, "__reportType">[]).map((row) => ({ ...row, __reportType: type }));
        }),
      );
      const merged = batches.flat().sort((a, b) => {
        const da = a.submission_date || a.createdAt || "";
        const db = b.submission_date || b.createdAt || "";
        return db.localeCompare(da);
      });
      setReports(merged);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load";
      toast.error("Failed to load", { description: message });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => {
    if (mode === "list") load();
  }, [mode, load]);

  React.useEffect(() => {
    if ((mode === "view" || mode === "edit") && (!reportId || !isReportType(queryType))) {
      setQuery({ mode: "list" }, { replace: true });
    }
  }, [mode, reportId, queryType, setQuery]);

  const statusFiltered = React.useMemo(() => {
    let rows = reports;
    if (filterStatus === "draft") rows = rows.filter((row) => row.status === "draft" && !row.endorsed);
    if (filterStatus === "endorsed") rows = rows.filter((row) => row.status === "draft" && !!row.endorsed);
    return rows;
  }, [reports, filterStatus]);

  const activityTabCounts = React.useMemo(() => {
    const map = Object.fromEntries(BENEFICIARY_ACTIVITIES.map((a) => [a.key, 0])) as Record<BeneficiaryActivityKey, number>;
    for (const row of statusFiltered) {
      const key = beneficiaryListSummary(row).key;
      for (const activity of BENEFICIARY_ACTIVITIES) {
        if (beneficiaryTabMatches(key, activity.key)) map[activity.key] += 1;
      }
    }
    return map;
  }, [statusFiltered]);

  const { matchesSearch, searchInput } = useListSearch();
  const filtered = React.useMemo(
    () => statusFiltered.filter((row) => beneficiaryTabMatches(beneficiaryListSummary(row).key, activeTab)
      && matchesSearch([row, beneficiaryListSummary(row), monthLabel(row.reporting_month)])),
    [statusFiltered, activeTab, matchesSearch],
  );

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map((row) => row.reporting_year)),
    [reports],
  );

  const openList = React.useCallback(() => {
    setQuery({ mode: "list" });
    setFormKey((key) => key + 1);
  }, [setQuery]);

  const openCreate = React.useCallback(() => {
    setFormKey((key) => key + 1);
    setQuery({
      mode: "new",
      type: activityApiType(activeTab),
      activity: activeTab,
    });
  }, [activeTab, setQuery]);

  if (mode === "view" && reportId) {
    return (
      <BeneficiaryManagementReportDetail
        reportType={reportType}
        reportId={reportId}
        onBack={openList}
        onEdit={canCreate ? () => setQuery({ mode: "edit", id: reportId, type: reportType }) : undefined}
      />
    );
  }

  if (mode === "new" || mode === "edit") {
    return (
      <BeneficiaryManagementForm
        key={formKey}
        reportType={(mode === "edit" ? reportType : activityApiType(createActivity)) as StateOfficeReportType}
        reportId={mode === "edit" ? reportId : null}
        onBack={openList}
        onCancel={openList}
        onSubmitted={openList}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
        initialActivity={mode === "new" ? createActivity : null}
      />
    );
  }

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all"
    || (showStateFilter && filterState !== ALL_STATES);
  const counts = {
    total: filtered.length,
    draft: filtered.filter((row) => row.status === "draft" && !row.endorsed).length,
    endorsed: filtered.filter((row) => row.status === "draft" && !!row.endorsed).length,
    submitted: filtered.filter((row) => row.status === "submitted").length,
    approved: filtered.filter((row) => row.status === "approved").length,
  };
  const statCards = [
    { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
    { label: "Draft", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
    { label: "In review", value: counts.submitted, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
    { label: "Endorsed", value: counts.endorsed, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
    { label: "Approved", value: counts.approved, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {BENEFICIARY_MANAGEMENT_NAV_TITLE}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {canReview
                ? "Review and endorse beneficiary reports"
                : "Send for review, then submit as approved after endorsement"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 border-[#d4e8dc]">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" /> {newButtonLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div
          className="flex gap-0 overflow-x-auto -mb-px"
          role="tablist"
          aria-label="Beneficiary activities"
        >
          {BENEFICIARY_ACTIVITIES.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = ACTIVITY_ICONS[tab.key];
            const count = activityTabCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors outline-none focus-visible:bg-[#f4f7f5] ${
                  active
                    ? "border-[#145c3f] text-[#145c3f]"
                    : "border-transparent text-slate-500 hover:text-[#0f3d2e] hover:border-[#c5ddd0]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-[#145c3f]" : "text-slate-400 group-hover:text-[#145c3f]"}`}
                  strokeWidth={2}
                />
                <span>{tab.tabLabel}</span>
                <span
                  className={`inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    active
                      ? "bg-[#e8f6ee] text-[#145c3f]"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#e8f6ee] group-hover:text-[#145c3f]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.tone}`}>
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : card.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          <div className={`grid gap-3 w-full rounded-xl border border-[#d4e8dc] bg-white px-4 py-4 ${
            showStateFilter ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"
          }`}>
            {showStateFilter && (
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={filterState === ALL_STATES ? "All States" : (states.find((s) => String(s.id) === filterState)?.description ?? filterState)}>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATES}>All States</SelectItem>
                  {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((month) => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={filterStatus === "all" ? "All Statuses" : STATUS[filterStatus as keyof typeof STATUS]?.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">In review</SelectItem>
                <SelectItem value="endorsed">Endorsed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <div className="col-span-full flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500"
                  onClick={() => {
                    setFilterYear("all");
                    setFilterMonth("all");
                    setFilterStatus("all");
                    if (showStateFilter) setFilterState(ALL_STATES);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {searchInput}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading reports...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm text-slate-500">
                    {hasFilters
                      ? "No reports match your filters."
                      : `No ${activeActivity.tabLabel} reports yet.`}
                  </p>
                  {canCreate && (
                    <Button
                      className="bg-orange-action hover:bg-orange-600 gap-2"
                      onClick={openCreate}
                    >
                      <Plus className="w-4 h-4" /> {newButtonLabel}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e8f5ee] hover:bg-[#e8f5ee] border-b border-[#d4e8dc]">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Period</TableHead>
                        {showLocation && (
                          <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Zone</TableHead>
                        )}
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">State</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Subject</TableHead>
                        {activeTab === "provider" && (
                          <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Type</TableHead>
                        )}
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Status</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => {
                        const status = reportStatus(row);
                        const summary = beneficiaryListSummary(row);
                        return (
                          <TableRow key={`${row.__reportType}-${row.id}`} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">
                              {monthLabel(row.reporting_month)} {row.reporting_year}
                            </TableCell>
                            {showLocation && (
                              <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                                {row.zone?.description || "—"}
                              </TableCell>
                            )}
                            <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                              {row.state?.description || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 max-w-[16rem] truncate" title={summary.subject}>
                              {summary.subject}
                            </TableCell>
                            {activeTab === "provider" && (
                              <TableCell className="text-sm font-semibold text-[#145c3f] whitespace-nowrap">
                                {summary.activity}
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${status.cls}`}>
                                {status.icon} {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]"
                                onClick={() => setQuery({ mode: "view", id: row.reference_id || row.id, type: row.__reportType })}
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
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

export function BeneficiaryManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(BENEFICIARY_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
