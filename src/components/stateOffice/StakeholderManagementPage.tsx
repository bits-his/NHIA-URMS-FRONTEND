import * as React from "react";
import {
  ArrowLeft, CheckCircle2, Clock, Eye, FileText, Plus, RefreshCw, XCircle,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";
import { stateOfficeApi } from "@/lib/api";
import { MONTHS, monthLabel, formatCount, formatDate, quarterFromMonth } from "./constants";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import {
  STAKEHOLDER_MANAGEMENT_NAV_TITLE,
  STAKEHOLDER_MANAGEMENT_PATH,
} from "./enrolmentPillarTypes";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import StakeholderEngagementForm from "./StakeholderEngagementForm";
import StakeholderReportDetail from "./StakeholderReportDetail";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200",        icon: <FileText className="w-3.5 h-3.5" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200",       icon: <Clock className="w-3.5 h-3.5" /> },
  returned:         { label: "Returned",        cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3.5 h-3.5" /> },
  endorsed:         { label: "Endorsed",        cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  submitted:        { label: "Submitted",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  approved:         { label: "Approved",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

type Mode = "list" | "create" | "edit" | "view";

/**
 * Stakeholder Management hub — polished list + PPT form/detail.
 * Reporting officers send for review → SC endorses → RO final-submits.
 */
export default function StakeholderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<Mode>("list");
  const [selectedId, setSelectedId] = React.useState<number | string | null>(null);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const { showStateFilter, filterState, setFilterState, states, apiStateId } = useMonthlyStateFilter(defaultStateId);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeApi.stakeholder.list({
        status: filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId ?? undefined,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
      });
      setReports(res.data ?? []);
    } catch (err: any) {
      toast.error("Failed to load reports", { description: err.message });
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => ({
    total: reports.length,
    draft: reports.filter((r) => r.status === "draft" || r.status === "returned").length,
    awaiting_review: reports.filter((r) => r.status === "awaiting_review").length,
    endorsed: reports.filter((r) => r.status === "endorsed").length,
    submitted: reports.filter((r) => r.status === "submitted" || r.status === "approved").length,
  }), [reports]);

  const backToList = () => {
    setMode("list");
    setSelectedId(null);
    load();
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
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
        accessorFn: (row) => row.state?.description || "",
        cell: ({ row }) => (
          <span className="text-sm text-slate-700 whitespace-nowrap">
            {row.original.state?.description || "—"}
          </span>
        ),
      },
      {
        id: "quarter",
        header: "Quarter",
        accessorFn: (row) => `Q${quarterFromMonth(row.reporting_month)}`,
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 whitespace-nowrap">
            Q{quarterFromMonth(row.original.reporting_month)}
          </span>
        ),
      },
      {
        id: "activities",
        header: "Activities",
        accessorFn: (row) => row.lines?.length ?? row.planned_activities ?? 0,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-900 tabular-nums">
            {formatCount(row.original.lines?.length ?? row.original.planned_activities ?? 0)}
          </span>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        accessorFn: (row) => row.submission_date || "",
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {row.original.submission_date ? formatDate(row.original.submission_date) : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const sc = STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.draft;
          return (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
              {sc.icon} {sc.label}
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
              setSelectedId(row.original.reference_id || row.original.id);
              setMode("view");
            }}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        ),
      },
    ],
    []
  );

  if (mode === "create" || mode === "edit") {
    return (
      <StakeholderEngagementForm
        activityModule="engagement-coordination"
        pageTitle={STAKEHOLDER_MANAGEMENT_NAV_TITLE}
        reportId={mode === "edit" ? selectedId : null}
        onBack={backToList}
        onCancel={backToList}
        onSubmitted={backToList}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
      />
    );
  }

  if (mode === "view" && selectedId != null) {
    return (
      <StakeholderReportDetail
        reportId={selectedId}
        onBack={backToList}
        onEdit={canCreate ? () => setMode("edit") : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            {STAKEHOLDER_MANAGEMENT_NAV_TITLE}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2 border-[#d4e8dc]">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
              onClick={() => { setSelectedId(null); setMode("create"); }}
            >
              <Plus className="w-4 h-4" /> New Stakeholder Engagement Report
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft / Returned", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Awaiting review", value: counts.awaiting_review, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
              { label: "Endorsed", value: counts.endorsed, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
              { label: "Submitted", value: counts.submitted, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.tone}`}>
                <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4 grid grid-flow-col auto-cols-fr gap-3">
              {showStateFilter && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Select
                    value={filterState === ALL_STATES ? "all" : filterState}
                    onValueChange={(v) => setFilterState(v === "all" ? ALL_STATES : v)}
                  >
                    <SelectTrigger displayValue={filterState === ALL_STATES ? "All States" : (states.find((s) => String(s.id) === filterState)?.description || "State")}>
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger displayValue={filterYear === "all" ? "All Years" : filterYear}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger displayValue={filterStatus === "all" ? "All Statuses" : (STATUS_CONFIG[filterStatus]?.label || filterStatus)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="STAKEHOLDER ENGAGEMENT REGISTER"
            infoTooltip="Stakeholder engagement reports by period, state, and submission status."
            columns={columns}
            data={reports}
            loading={loading}
            searchPlaceholder="Search stakeholder reports..."
            emptyMessage="No stakeholder reports yet for these filters."
            onRowClick={(r) => {
              setSelectedId(r.reference_id || r.id);
              setMode("view");
            }}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

/** Redirect legacy per-module URLs to the merged hub. */
export function StakeholderManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(STAKEHOLDER_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
