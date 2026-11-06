import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRightLeft, Building2, CheckCircle2, Clock, Eye, FileText,
  Plus, RefreshCw, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel, type StateOfficeReportType } from "./constants";
import BeneficiaryManagementForm from "./BeneficiaryManagementForm";
import BeneficiaryManagementReportDetail from "./BeneficiaryManagementReportDetail";
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
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

  const filtered = React.useMemo(
    () => statusFiltered.filter((row) => beneficiaryTabMatches(beneficiaryListSummary(row).key, activeTab)),
    [statusFiltered, activeTab],
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

  const columns = React.useMemo<ColumnDef<Report>[]>(
    () => {
      const cols: ColumnDef<Report>[] = [
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
      ];
      if (showLocation) {
        cols.push({
          id: "zone",
          header: "Zone",
          accessorFn: (row) => row.zone?.description || "",
          cell: ({ row }) => (
            <span className="text-sm text-slate-700 whitespace-nowrap">
              {row.original.zone?.description || "—"}
            </span>
          ),
        });
      }
      cols.push(
        {
          id: "state",
          header: "State",
          accessorFn: (row) => row.state?.description || "",
          cell: ({ row }) => (
            <span className="text-sm text-slate-700 whitespace-nowrap">
              {row.original.state?.description || "—"}
            </span>
          ),
        },
        {
          id: "subject",
          header: "Subject",
          accessorFn: (row) => beneficiaryListSummary(row).subject,
          cell: ({ row }) => {
            const summary = beneficiaryListSummary(row.original);
            return (
              <span className="text-sm text-slate-700 max-w-[16rem] truncate block" title={summary.subject}>
                {summary.subject}
              </span>
            );
          },
        },
      );
      if (activeTab === "provider") {
        cols.push({
          id: "type",
          header: "Type",
          accessorFn: (row) => beneficiaryListSummary(row).activity,
          cell: ({ row }) => (
            <span className="text-sm font-semibold text-[#145c3f] whitespace-nowrap">
              {beneficiaryListSummary(row.original).activity}
            </span>
          ),
        });
      }
      cols.push(
        {
          id: "status",
          header: "Status",
          accessorFn: (row) => reportStatus(row).label,
          cell: ({ row }) => {
            const status = reportStatus(row.original);
            return (
              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${status.cls}`}>
                {status.icon} {status.label}
              </Badge>
            );
          },
        },
        {
          id: "actions",
          header: "Action",
          enableSorting: false,
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]"
              onClick={(e) => {
                e.stopPropagation();
                setQuery({
                  mode: "view",
                  id: row.original.reference_id || row.original.id,
                  type: row.original.__reportType,
                });
              }}
            >
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
          ),
        },
      );
      return cols;
    },
    [activeTab, showLocation, setQuery],
  );

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
    <PageLayout
      title={BENEFICIARY_MANAGEMENT_NAV_TITLE}
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md border-[#d4e8dc]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/20 h-8 text-xs rounded-md"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5" /> {newButtonLabel}
            </Button>
          )}
        </div>
      }
      tabs={
        <UnderHeaderNavTabs
          tabs={BENEFICIARY_ACTIVITIES.map((tab) => ({
            id: tab.key,
            label: tab.tabLabel,
            icon: ACTIVITY_ICONS[tab.key],
            count: activityTabCounts[tab.key] ?? 0,
          }))}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          ariaLabel="Beneficiary activities"
        />
      }
    >
      <div className="w-full space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className={`rounded-xl border px-4 py-3 ${card.tone}`}>
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : card.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-sm border border-[#d4e8dc] py-0 gap-0 shadow-2xs bg-white">
            <CardContent className="py-1.5 px-3 grid grid-flow-col auto-cols-fr gap-2.5 items-end">
              {showStateFilter && (
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">State</Label>
                  <Select
                    value={filterState === ALL_STATES ? "all" : filterState}
                    onValueChange={(v) => setFilterState(v === "all" ? ALL_STATES : v)}
                  >
                    <SelectTrigger size="sm" displayValue={filterState === ALL_STATES ? "All States" : (states.find((s) => String(s.id) === filterState)?.description || "State")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {states.map((s) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>{s.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger size="sm" displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger size="sm" displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger size="sm" displayValue={
                    filterStatus === "all" ? "All Statuses"
                      : filterStatus === "draft" ? "Draft"
                      : filterStatus === "submitted" ? "In review"
                      : filterStatus === "endorsed" ? "Endorsed"
                      : filterStatus === "approved" ? "Approved"
                      : filterStatus
                  }><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">In review</SelectItem>
                    <SelectItem value="endorsed">Endorsed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title={`${activeActivity.tabLabel.toUpperCase()} REGISTER`}
            infoTooltip={`${activeActivity.tabLabel} beneficiary reports by period and status.`}
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder={`Search ${activeActivity.tabLabel.toLowerCase()}...`}
            emptyMessage={`No ${activeActivity.tabLabel} reports yet.`}
            onRowClick={(row) => setQuery({
              mode: "view",
              id: row.reference_id || row.id,
              type: row.__reportType,
            })}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
    </PageLayout>
  );
}

export function BeneficiaryManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(BENEFICIARY_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
