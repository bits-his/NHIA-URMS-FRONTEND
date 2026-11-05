import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinanceRowActions } from "./shared/FinanceRowActions";
import {
  REPORT_CONFIG, monthLabel, quarterFromMonth, formatCount, formatDate, formatDateShort, formatAmount, formatNaira,
  labelOf, IGR_SERVICE_TYPES, reportLineTotal, reportLineCount, ENROLLEE_REGISTER_SCHEMES,
  type StateOfficeReportType,
} from "./constants";
import { enrolmentLineListSummary } from "./enrolmentPillarTypes";

export interface Report {
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
  __reportType?: StateOfficeReportType;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200",        icon: <FileText className="w-3 h-3" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
  returned:         { label: "Returned",        cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3 h-3" /> },
  endorsed:         { label: "Endorsed",        cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3 h-3" /> },
  submitted:        { label: "Submitted",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  approved:         { label: "Approved",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

export type SshiaListRow = {
  report: Report;
  filledLabels: string[];
  filledCount: number;
};

function statusBadge(status: string) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
      {sc.icon} {sc.label}
    </Badge>
  );
}

function viewButton(onClick: () => void) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <Eye className="w-3.5 h-3.5" /> View
    </Button>
  );
}

type TableConfigInput = {
  reportType: StateOfficeReportType;
  cfg: (typeof REPORT_CONFIG)[StateOfficeReportType];
  filteredReports: Report[];
  sshiaListRows: SshiaListRow[];
  showLocationCols: boolean;
  hasActivityTabs: boolean;
  multiType: boolean;
  activityModuleColumn?: boolean;
  activityModuleLabels?: Record<string, string>;
  activityRows?: {
    options: { value: string; label: string }[];
    summarize: (report: Report) => { key: string; activity: string; subject: string };
  };
  canCreate: boolean;
  finalBusy: boolean;
  openReport: (r: Report, nextMode: "view" | "edit") => void;
  requestFinalSubmit: (r: Report) => void;
  listTitle?: string;
  activeActivityTab: { value: string; label: string } | null;
  hasFilters: boolean;
};

export function useStateOfficeReportsListTable(input: TableConfigInput) {
  const {
    reportType, cfg, filteredReports, sshiaListRows, showLocationCols, hasActivityTabs, multiType,
    activityModuleColumn, activityModuleLabels, activityRows, canCreate, finalBusy,
    openReport, requestFinalSubmit, listTitle, activeActivityTab, hasFilters,
  } = input;

  const registerTitle = React.useMemo(() => {
    if (reportType === "enrolment") {
      return `${(activeActivityTab?.label || listTitle || "Enrolment Activity").toUpperCase()} REGISTER`;
    }
    return `${(listTitle || cfg.title || "REPORTS").toUpperCase()} REGISTER`;
  }, [reportType, activeActivityTab?.label, listTitle, cfg.title]);

  const emptyMessage = React.useMemo(() => {
    if (hasFilters) return "No reports match your filters";
    if (hasActivityTabs && activeActivityTab) return `No ${activeActivityTab.label} reports yet`;
    return "No reports found";
  }, [hasFilters, hasActivityTabs, activeActivityTab]);

  const tableData = React.useMemo((): (Report | SshiaListRow)[] => {
    if (reportType === "sshia-financial") return sshiaListRows;
    return filteredReports;
  }, [reportType, sshiaListRows, filteredReports]);

  const financeActions = React.useCallback((r: Report) => (
    <FinanceRowActions
      status={r.status}
      canCreate={canCreate}
      finalBusy={finalBusy}
      onView={() => openReport(r, "view")}
      onUpdate={() => openReport(r, "edit")}
      onFinalSubmit={() => requestFinalSubmit(r)}
    />
  ), [canCreate, finalBusy, openReport, requestFinalSubmit]);

  const columns = React.useMemo((): ColumnDef<Report | SshiaListRow>[] => {
    if (reportType === "igr") {
      return [
        { id: "date", header: "Date", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm text-slate-700 tabular-nums">{formatDateShort((r as any).entry_date || r.submission_date)}</span>;
        }},
        { id: "state", header: "State", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-slate-800">{r.state?.description || "—"}</span>;
        }},
        { id: "service", header: "Service Type", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm text-slate-800">{labelOf(IGR_SERVICE_TYPES, String((r as any).service_type || r.lines?.[0]?.service_type || ""))}</span>;
        }},
        { id: "principal", header: "Principal", cell: ({ row }) => {
          const r = row.original as Report;
          const name = String((r as any).principal_name || r.lines?.[0]?.principal_name || "—");
          return <span className="text-sm font-medium text-slate-800 max-w-[160px] truncate block" title={name}>{name}</span>;
        }},
        { id: "receipt", header: "Receipt No.", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-mono text-slate-700">{String((r as any).receipt_no || r.lines?.[0]?.receipt_no || "—")}</span>;
        }},
        { id: "amount", header: "Amount (₦)", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-[#145c3f] tabular-nums">{formatAmount((r as any).amount ?? r.lines?.[0]?.amount ?? 0)}</span>;
        }},
        { id: "payment_date", header: "Payment Date", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm text-slate-600 tabular-nums">{formatDateShort((r as any).payment_date || r.lines?.[0]?.payment_date)}</span>;
        }},
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "actions", header: "Actions", cell: ({ row }) => financeActions(row.original as Report) },
      ];
    }

    if (reportType === "sshia-financial") {
      return [
        { id: "period", header: "Period", cell: ({ row }) => {
          const r = (row.original as SshiaListRow).report;
          const quarter = (r as any).reporting_quarter || quarterFromMonth(r.reporting_month);
          return (
            <span className="text-sm text-slate-700">
              <span className="font-medium">{monthLabel(r.reporting_month)} {r.reporting_year}</span>
              <span className="text-slate-400"> · Q{quarter}</span>
            </span>
          );
        }},
        { id: "state", header: "State", cell: ({ row }) => {
          const r = (row.original as SshiaListRow).report;
          return <span className="text-sm font-semibold text-slate-800">{r.state?.description || "—"}</span>;
        }},
        { id: "subheads", header: "Sub-heads filled", cell: ({ row }) => {
          const { filledCount, filledLabels } = row.original as SshiaListRow;
          if (filledCount === 0) return <span className="text-sm text-slate-400">None yet</span>;
          return (
            <div className="flex flex-wrap gap-1.5 max-w-[22rem]">
              {filledLabels.map((label) => (
                <span key={label} className="inline-flex items-center rounded-md border border-[#d4e8dc] bg-[#f4faf7] px-2 py-0.5 text-[11px] font-medium text-[#145c3f]">
                  {label}
                </span>
              ))}
              <span className="inline-flex items-center text-[11px] text-slate-400 px-0.5">{filledCount} of 4</span>
            </div>
          );
        }},
        { id: "submitted_by", header: "Submitted by", cell: ({ row }) => {
          const r = (row.original as SshiaListRow).report;
          return <span className="text-sm text-slate-600">{r.submitted_by || "—"}</span>;
        }},
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as SshiaListRow).report.status) },
        { id: "actions", header: "Actions", cell: ({ row }) => financeActions((row.original as SshiaListRow).report) },
      ];
    }

    if (reportType === "expenditure-profile") {
      return [
        { id: "period", header: "Period", cell: ({ row }) => {
          const r = row.original as Report;
          return (
            <span className="text-sm text-slate-700">
              <span className="font-medium">{monthLabel(r.reporting_month)} {r.reporting_year}</span>
              <span className="text-slate-400"> · Q{(r as any).reporting_quarter || quarterFromMonth(r.reporting_month)}</span>
            </span>
          );
        }},
        { id: "state", header: "State", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-slate-800">{r.state?.description || "—"}</span>;
        }},
        { id: "total", header: "Total (₦)", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-[#145c3f] tabular-nums">{formatNaira(reportLineTotal("expenditure-profile", r))}</span>;
        }},
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "actions", header: "Actions", cell: ({ row }) => financeActions(row.original as Report) },
      ];
    }

    if (reportType === "enrollee-register") {
      return [
        { id: "year", header: "Year", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).reporting_year}</span> },
        { id: "month", header: "Month", cell: ({ row }) => <span className="text-sm text-slate-600">{monthLabel((row.original as Report).reporting_month)}</span> },
        { id: "zone_id", header: "Zone ID", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm tabular-nums text-slate-500">{r.zone_id ?? r.zone?.id ?? "—"}</span>;
        }},
        { id: "zone", header: "Zone", cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original as Report).zone?.description || "—"}</span> },
        { id: "state_id", header: "State ID", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm tabular-nums text-slate-500">{r.state_id ?? r.state?.id ?? "—"}</span>;
        }},
        { id: "state", header: "State", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).state?.description || "—"}</span> },
        ...ENROLLEE_REGISTER_SCHEMES.map((s) => ({
          id: s.key,
          header: s.label,
          cell: ({ row }: { row: { original: Report | SshiaListRow } }) => (
            <span className="text-sm tabular-nums text-slate-700">{formatCount(Number((row.original as Report)[s.key as keyof Report] ?? 0))}</span>
          ),
        })),
        { id: "total_lives", header: "Total Lives", cell: ({ row }) => (
          <span className="text-sm font-bold text-[#145c3f] tabular-nums">{formatCount((row.original as Report).total_lives ?? 0)}</span>
        )},
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "view", header: "View", cell: ({ row }) => viewButton(() => openReport(row.original as Report, "view")) },
      ];
    }

    if (reportType === "ict-support-register" || reportType === "adhoc-special-assignment") {
      const cols: ColumnDef<Report | SshiaListRow>[] = [
        { id: "date_submitted", header: "Date Submitted", cell: ({ row }) => (
          <span className="text-xs text-slate-500">{formatDate((row.original as Report).submission_date)}</span>
        )},
      ];
      if (showLocationCols) {
        cols.push(
          { id: "zone", header: "Zone", cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original as Report).zone?.description || "—"}</span> },
          { id: "state", header: "State", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).state?.description || "—"}</span> },
        );
      }
      cols.push(
        { id: "year", header: "Year", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).reporting_year}</span> },
        { id: "month", header: "Month", cell: ({ row }) => <span className="text-sm text-slate-600">{monthLabel((row.original as Report).reporting_month)}</span> },
        { id: "quarter", header: "Quarter", cell: ({ row }) => <span className="text-sm text-slate-500">Q{quarterFromMonth((row.original as Report).reporting_month)}</span> },
        { id: "submitted_by", header: "Submitted By", cell: ({ row }) => <span className="text-sm text-slate-500">{(row.original as Report).submitted_by || "—"}</span> },
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "view", header: "View", cell: ({ row }) => viewButton(() => openReport(row.original as Report, "view")) },
      );
      return cols;
    }

    if (reportType === "enrolment") {
      const cols: ColumnDef<Report | SshiaListRow>[] = [
        { id: "date", header: "Date", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-slate-800">{monthLabel(r.reporting_month)} {r.reporting_year}</span>;
        }},
      ];
      if (showLocationCols) {
        cols.push(
          { id: "zone", header: "Zone", cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original as Report).zone?.description || "—"}</span> },
          { id: "state", header: "State", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).state?.description || "—"}</span> },
        );
      }
      if (!hasActivityTabs) {
        cols.push({
          id: "activity",
          header: "Activity",
          cell: ({ row }) => {
            const summary = enrolmentLineListSummary((row.original as Report).lines?.[0]);
            return <span className="text-sm font-semibold text-[#0f3d2e]">{summary.activity}</span>;
          },
        });
      }
      cols.push(
        {
          id: "program",
          header: "Program",
          cell: ({ row }) => {
            const summary = enrolmentLineListSummary((row.original as Report).lines?.[0]);
            return <span className="text-sm text-slate-700">{summary.program}</span>;
          },
        },
      );
      if (hasActivityTabs) {
        cols.push({
          id: "detail",
          header: "Detail",
          cell: ({ row }) => {
            const summary = enrolmentLineListSummary((row.original as Report).lines?.[0]);
            return <span className="text-sm text-slate-600 max-w-[220px] truncate block" title={summary.detail}>{summary.detail}</span>;
          },
        });
      }
      cols.push(
        {
          id: "outcome",
          header: "Outcome",
          cell: ({ row }) => {
            const summary = enrolmentLineListSummary((row.original as Report).lines?.[0]);
            return <span className="text-sm font-medium text-slate-800">{summary.outcome}</span>;
          },
        },
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "view", header: "View", cell: ({ row }) => viewButton(() => openReport(row.original as Report, "view")) },
      );
      return cols;
    }

    if (reportType === "stakeholder") {
      const cols: ColumnDef<Report | SshiaListRow>[] = [
        { id: "period", header: "Period", cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm font-semibold text-slate-800">{monthLabel(r.reporting_month)} {r.reporting_year}</span>;
        }},
      ];
      if (showLocationCols) {
        cols.push({
          id: "state",
          header: "State",
          cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).state?.description || "—"}</span>,
        });
      }
      cols.push(
        {
          id: "activities",
          header: "Activities",
          cell: ({ row }) => {
            const r = row.original as Report;
            const rowType = r.__reportType ?? reportType;
            return <span className="text-sm font-semibold text-[#145c3f] tabular-nums">{formatCount(reportLineCount(rowType, r))}</span>;
          },
        },
        { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
        { id: "view", header: "View", cell: ({ row }) => viewButton(() => openReport(row.original as Report, "view")) },
      );
      return cols;
    }

    // Default / generic
    const cols: ColumnDef<Report | SshiaListRow>[] = [
      {
        id: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">{(row.original as Report).reference_id}</span>
        ),
      },
    ];
    if (multiType) {
      cols.push({
        id: "drive_type",
        header: "Drive Type",
        cell: ({ row }) => {
          const r = row.original as Report;
          const rowType = r.__reportType ?? reportType;
          const typeLabel = REPORT_CONFIG[rowType]?.title ?? rowType;
          return <span className="text-sm text-slate-700 max-w-[180px] truncate block" title={typeLabel}>{typeLabel}</span>;
        },
      });
    }
    if (activityModuleColumn) {
      cols.push({
        id: "type",
        header: "Type",
        cell: ({ row }) => {
          const r = row.original as Report;
          const label = activityModuleLabels?.[r.activity_module ?? ""] ?? r.activity_module ?? "—";
          return <span className="text-sm text-slate-700 max-w-[180px] truncate block" title={label}>{label}</span>;
        },
      });
    }
    if (showLocationCols) {
      cols.push(
        { id: "zone", header: "Zone", cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original as Report).zone?.description || "—"}</span> },
        { id: "state", header: "State", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).state?.description || "—"}</span> },
      );
    }
    cols.push(
      { id: "year", header: "Year", cell: ({ row }) => <span className="text-sm font-semibold text-slate-800">{(row.original as Report).reporting_year}</span> },
      { id: "month", header: "Month", cell: ({ row }) => <span className="text-sm text-slate-600">{monthLabel((row.original as Report).reporting_month)}</span> },
    );
    if (reportType === "weekly-actionable") {
      cols.push({
        id: "week",
        header: "Week",
        cell: ({ row }) => {
          const r = row.original as Report;
          return <span className="text-sm text-slate-600">{(r as any).reporting_week ? `Wk ${(r as any).reporting_week}` : "—"}</span>;
        },
      });
    }
    if (reportType === "etmc-tmc-action-point") {
      cols.push(
        { id: "session", header: "Session", cell: ({ row }) => <span className="text-sm text-slate-600">{(row.original as Report as any).etmc_session || "—"}</span> },
        { id: "meeting_date", header: "Meeting Date", cell: ({ row }) => <span className="text-xs text-slate-500">{formatDate((row.original as Report as any).meeting_date)}</span> },
      );
    }
    cols.push(
      { id: "quarter", header: "Quarter", cell: ({ row }) => <span className="text-sm text-slate-500">Q{quarterFromMonth((row.original as Report).reporting_month)}</span> },
      {
        id: "entries",
        header: "Entries",
        cell: ({ row }) => {
          const r = row.original as Report;
          const rowType = r.__reportType ?? reportType;
          return <span className="text-sm text-slate-500 tabular-nums">{reportLineCount(rowType, r)}</span>;
        },
      },
      {
        id: "total",
        header: cfg.totalLabel,
        cell: ({ row }) => {
          const r = row.original as Report;
          const rowType = r.__reportType ?? reportType;
          return <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCount(reportLineTotal(rowType, r))}</span>;
        },
      },
      { id: "submitted_by", header: "Submitted By", cell: ({ row }) => <span className="text-sm text-slate-500">{(row.original as Report).submitted_by || "—"}</span> },
      { id: "date_submitted", header: "Date Submitted", cell: ({ row }) => <span className="text-xs text-slate-500">{formatDate((row.original as Report).submission_date)}</span> },
      { id: "status", header: "Status", cell: ({ row }) => statusBadge((row.original as Report).status) },
      { id: "view", header: "View", cell: ({ row }) => viewButton(() => openReport(row.original as Report, "view")) },
    );
    return cols;
  }, [
    reportType, cfg.totalLabel, showLocationCols, hasActivityTabs, multiType, activityModuleColumn,
    activityModuleLabels, financeActions, openReport,
  ]);

  const onRowClick = React.useCallback((row: Report | SshiaListRow) => {
    if (reportType === "sshia-financial") {
      openReport((row as SshiaListRow).report, "view");
    } else {
      openReport(row as Report, "view");
    }
  }, [reportType, openReport]);

  return { columns, tableData, registerTitle, emptyMessage, onRowClick };
}
