import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, FileText, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomTable, { type CustomTableField } from "@/components/CustomTable";
import { stateOfficeApi } from "@/lib/api";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import { MONTHS, monthLabel, type StateOfficeReportType } from "./constants";
import BeneficiaryManagementForm from "./BeneficiaryManagementForm";
import BeneficiaryReportView from "./BeneficiaryReportView";
import {
  BENEFICIARY_LIST_FILTERS,
  BENEFICIARY_MANAGEMENT_NAV_TITLE,
  BENEFICIARY_MANAGEMENT_PATH,
  BENEFICIARY_REPORT_TYPES,
  beneficiaryListSummary,
} from "./beneficiaryManagementTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

type ReportType = (typeof BENEFICIARY_REPORT_TYPES)[number];
type Mode = "list" | "new" | "view" | "edit";

interface Report {
  id: number;
  reporting_year: number;
  reporting_month: number;
  status: "draft" | "submitted" | "approved";
  createdAt?: string;
  submission_date?: string | null;
  zone?: { description?: string };
  state?: { description?: string };
  lines?: unknown[];
  __reportType: ReportType;
}

const REPORT_TYPES = new Set<string>(BENEFICIARY_REPORT_TYPES);

const STATUS = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Submitted", cls: "bg-blue-50 text-blue-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
} as const;

function isReportType(value: string | null): value is ReportType {
  return !!value && REPORT_TYPES.has(value);
}

export default function BeneficiaryManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate, createOnly } = useStateOfficeAccess();
  const modeParam = searchParams.get("mode");
  const mode: Mode =
    modeParam === "new" || modeParam === "view" || modeParam === "edit"
      ? modeParam
      : createOnly
        ? "new"
        : "list";
  const queryId = Number(searchParams.get("id"));
  const queryType = searchParams.get("type");
  const reportId = Number.isFinite(queryId) && queryId > 0 ? queryId : null;
  const reportType: ReportType = isReportType(queryType) ? queryType : "extra-dependant";

  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(mode === "list");
  const [formKey, setFormKey] = React.useState(0);
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterActivity, setFilterActivity] = React.useState("all");

  const {
    showStateFilter,
    states,
    filterState,
    setFilterState,
    apiStateId,
  } = useMonthlyStateFilter(defaultStateId, defaultZoneId);

  const showLocation = !defaultStateId || !defaultZoneId;

  const setQuery = React.useCallback((
    next: { mode?: Mode; id?: number | null; type?: string | null },
    opts?: { replace?: boolean },
  ) => {
    const params = new URLSearchParams();
    const nextMode = next.mode ?? "list";
    if (nextMode !== "list") {
      params.set("mode", nextMode);
      if (next.id != null) params.set("id", String(next.id));
      if (next.type) params.set("type", next.type);
    }
    setSearchParams(params, { replace: !!opts?.replace });
  }, [setSearchParams]);

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
  }, [createOnly, filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => {
    if (mode === "list") load();
  }, [mode, load]);

  React.useEffect(() => {
    if ((mode === "view" || mode === "edit") && (!reportId || !isReportType(queryType))) {
      setQuery({ mode: createOnly ? "new" : "list" }, { replace: true });
    }
  }, [mode, reportId, queryType, createOnly, setQuery]);

  const filtered = React.useMemo(() => {
    if (filterActivity === "all") return reports;
    return reports.filter((row) => beneficiaryListSummary(row).key === filterActivity);
  }, [reports, filterActivity]);

  const yearOptions = React.useMemo(
    () => buildReportingYearOptions(reports.map((row) => row.reporting_year)),
    [reports],
  );

  const openList = React.useCallback(() => {
    if (createOnly) {
      onBack();
      return;
    }
    setQuery({ mode: "list" });
    setFormKey((key) => key + 1);
  }, [createOnly, onBack, setQuery]);

  const fields: CustomTableField[] = [
    {
      title: "Period",
      value: "period",
      className: "w-[14%]",
      custom: true,
      component: (row: Report) => (
        <span className="text-[11px] font-medium text-slate-800 whitespace-nowrap">
          {monthLabel(row.reporting_month)} {row.reporting_year}
        </span>
      ),
    },
    ...(showLocation
      ? [
          {
            title: "Zone",
            value: "zone",
            className: "w-[12%]",
            custom: true,
            component: (row: Report) => (
              <span className="text-[11px] truncate block">{row.zone?.description || "—"}</span>
            ),
          },
          {
            title: "State",
            value: "state",
            className: "w-[12%]",
            custom: true,
            component: (row: Report) => (
              <span className="text-[11px] font-medium truncate block">{row.state?.description || "—"}</span>
            ),
          },
        ] satisfies CustomTableField[]
      : []),
    {
      title: "Activity",
      value: "activity",
      className: "w-[18%]",
      custom: true,
      component: (row: Report) => (
        <span className="text-[11px] font-semibold text-[#145c3f]">
          {beneficiaryListSummary(row).activity}
        </span>
      ),
    },
    {
      title: "Subject",
      value: "subject",
      className: "w-[22%]",
      custom: true,
      component: (row: Report) => {
        const subject = beneficiaryListSummary(row).subject;
        return (
          <span className="text-[11px] text-slate-700 truncate block" title={subject}>
            {subject}
          </span>
        );
      },
    },
    {
      title: "Status",
      value: "status",
      className: "w-[12%]",
      custom: true,
      component: (row: Report) => {
        const status = STATUS[row.status] ?? STATUS.draft;
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      title: "",
      value: "action",
      className: "w-[8%] text-right",
      custom: true,
      component: (row: Report) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] font-semibold border-[#d4e8dc] hover:bg-[#e8f5ee] hover:text-[#145c3f]"
            onClick={() => setQuery({ mode: "view", id: row.id, type: row.__reportType })}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  if (mode === "view" && reportId) {
    return (
      <BeneficiaryReportView
        reportType={reportType as StateOfficeReportType}
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
        reportType={(mode === "edit" ? reportType : "extra-dependant") as StateOfficeReportType}
        reportId={mode === "edit" ? reportId : null}
        onBack={openList}
        onCancel={openList}
        onSubmitted={openList}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    );
  }

  const hasFilters = filterYear !== "all" || filterMonth !== "all" || filterStatus !== "all"
    || filterActivity !== "all" || (showStateFilter && filterState !== ALL_STATES);
  const counts = {
    total: filtered.length,
    draft: filtered.filter((row) => row.status === "draft").length,
    submitted: filtered.filter((row) => row.status === "submitted").length,
    approved: filtered.filter((row) => row.status === "approved").length,
  };
  const statCards = [
    { label: "Total", value: counts.total, icon: <FileText className="w-3.5 h-3.5 text-[#25a872]" />, accent: "border-[#d4e8dc] bg-white" },
    { label: "Draft", value: counts.draft, icon: <Clock className="w-3.5 h-3.5 text-amber-600" />, accent: "border-amber-200 bg-amber-50/50" },
    { label: "Submitted", value: counts.submitted, icon: <Send className="w-3.5 h-3.5 text-blue-600" />, accent: "border-blue-200 bg-blue-50/50" },
    { label: "Approved", value: counts.approved, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, accent: "border-emerald-200 bg-emerald-50/50" },
  ];

  return (
    <div className="bg-[#f4f7f5] min-h-full">
      <div className="bg-white border-b px-4 md:px-5 py-2.5 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight truncate">{BENEFICIARY_MANAGEMENT_NAV_TITLE}</h2>
          <p className="text-[11px] text-slate-500">
            {loading ? "Loading…" : `${filtered.length} report${filtered.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="h-8 bg-orange-action hover:bg-orange-600 gap-1.5 text-xs"
              onClick={() => {
                setFormKey((key) => key + 1);
                setQuery({ mode: "new" });
              }}
            >
              <Plus className="w-3.5 h-3.5" /> New Report
            </Button>
          )}
        </div>
      </div>

      <div className="w-full px-4 md:px-5 py-3 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-lg border px-3 py-2 flex items-center gap-2.5 ${card.accent}`}>
              {card.icon}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">{loading ? "—" : card.value}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[#d4e8dc] bg-white p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {showStateFilter && (
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="h-8 w-full text-xs" displayValue={filterState === ALL_STATES ? "State" : (states.find((s) => String(s.id) === filterState)?.description ?? "State")}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATES}>All States</SelectItem>
                  {states.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-8 w-full text-xs" displayValue={filterYear === "all" ? "Year" : filterYear}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 w-full text-xs" displayValue={filterMonth === "all" ? "Month" : monthLabel(filterMonth)}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((month) => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-full text-xs" displayValue={filterStatus === "all" ? "Status" : STATUS[filterStatus as keyof typeof STATUS]?.label}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActivity} onValueChange={setFilterActivity}>
              <SelectTrigger className="h-8 w-full text-xs" displayValue={filterActivity === "all" ? "Activity" : (BENEFICIARY_LIST_FILTERS.find((item) => item.value === filterActivity)?.label ?? "Activity")}>
                <SelectValue placeholder="Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                {BENEFICIARY_LIST_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <div className="col-span-full flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-500 text-[11px]"
                  onClick={() => {
                    setFilterYear("all");
                    setFilterMonth("all");
                    setFilterStatus("all");
                    setFilterActivity("all");
                    if (showStateFilter) setFilterState(ALL_STATES);
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        <CustomTable
          data={filtered}
          fields={fields}
          loading={loading}
          pageSize={15}
          message="No reports found — create a report or adjust the filters"
          fitViewport
        />
      </div>
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
