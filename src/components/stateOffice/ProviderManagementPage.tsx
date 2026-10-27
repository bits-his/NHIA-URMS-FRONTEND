import * as React from "react";
import {
  ArrowLeft, CheckCircle2, Clock, Eye, FileText, Loader2, Plus, RefreshCw, XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateOfficeApi } from "@/lib/api";
import { MONTHS, monthLabel, formatCount, formatDate, quarterFromMonth } from "./constants";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import {
  PROVIDER_MANAGEMENT_NAV_TITLE,
  PROVIDER_MANAGEMENT_PATH,
  PROVIDER_PILLAR_CHILDREN,
} from "./enrolmentPillarTypes";
import { formMeta, type ProviderFormKey } from "./providerManagementTypes";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import ProviderManagementForm from "./ProviderManagementForm";
import ProviderReportDetail from "./ProviderReportDetail";

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

const MODULE_LABELS = Object.fromEntries(
  PROVIDER_PILLAR_CHILDREN.map((c) => [c.key, c.navLabel]),
);

type Mode = "list" | "create" | "edit" | "view";

/**
 * Provider Management hub — same list/detail/review flow as Stakeholder Management.
 * Reporting officers see their own reports; coordinators endorse / return.
 */
export default function ProviderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<Mode>("list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [selectedModule, setSelectedModule] = React.useState<ProviderFormKey>("accreditation");
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterModule, setFilterModule] = React.useState("all");
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const { showStateFilter, filterState, setFilterState, states, apiStateId } = useMonthlyStateFilter(defaultStateId);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        status: filterStatus !== "all" ? filterStatus : undefined,
        zone_id: defaultZoneId ?? undefined,
        state_id: apiStateId ?? undefined,
        year: filterYear !== "all" ? filterYear : undefined,
        month: filterMonth !== "all" ? filterMonth : undefined,
      };
      const res = filterModule === "all"
        ? await stateOfficeApi.listAllProviderReports(filters)
        : await stateOfficeApi.providerByFormKey(filterModule).list(filters);
      const rows = (res.data ?? []).map((r: any) => ({
        ...r,
        activity_module: r.activity_module || filterModule,
      }));
      setReports(rows);
    } catch (err: any) {
      toast.error("Failed to load reports", { description: err.message });
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth, filterModule]);

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
    setSelectedModule("accreditation");
    load();
  };

  if (mode === "create" || mode === "edit") {
    return (
      <ProviderManagementForm
        reportId={mode === "edit" ? selectedId : null}
        initialFormKey={selectedModule}
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
      <ProviderReportDetail
        reportId={selectedId}
        formKey={selectedModule}
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
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              {PROVIDER_MANAGEMENT_NAV_TITLE}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {canReview
                ? "Review and endorse provider management reports"
                : "Your reports — draft, send for review, then final-submit after endorsement"}
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
              onClick={() => { setSelectedId(null); setMode("create"); }}
            >
              <Plus className="w-4 h-4" /> New Report
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

          <div className={`grid gap-3 w-full rounded-xl border border-[#d4e8dc] bg-white px-4 py-4 ${
            showStateFilter
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          }`}>
            {showStateFilter && (
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                  displayValue={filterState === ALL_STATES
                    ? "All States"
                    : (states.find((s) => String(s.id) === filterState)?.description ?? filterState)}>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATES}>All States</SelectItem>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]" displayValue={filterYear === "all" ? "All Years" : filterYear}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                displayValue={filterMonth === "all" ? "All Months" : monthLabel(filterMonth)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                displayValue={filterModule === "all" ? "All form types" : (MODULE_LABELS[filterModule] || filterModule)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All form types</SelectItem>
                {PROVIDER_PILLAR_CHILDREN.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.navLabel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full h-10 bg-[#f4f7f5] border-2 border-[#1a7a52]"
                displayValue={filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus]?.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <p className="text-sm text-slate-500">No provider reports yet for these filters.</p>
                  {canCreate && (
                    <Button
                      className="bg-orange-action hover:bg-orange-600 gap-2"
                      onClick={() => { setSelectedId(null); setMode("create"); }}
                    >
                      <Plus className="w-4 h-4" /> Create first report
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e8f5ee] hover:bg-[#e8f5ee] border-b border-[#d4e8dc]">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Period</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">State</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Form type</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] text-right">Activities</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Submitted</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e]">Status</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((r) => {
                        const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
                        const activities = r.lines?.length ?? r.planned_activities ?? 0;
                        const mod = String(r.activity_module || "");
                        const typeLabel = MODULE_LABELS[mod]
                          || formMeta(mod as ProviderFormKey).label
                          || mod
                          || "—";
                        return (
                          <TableRow key={r.id} className="hover:bg-[#f8fdfb] border-b border-[#e8f3ec] last:border-0">
                            <TableCell className="text-sm font-semibold text-[#0f3d2e] whitespace-nowrap">
                              {monthLabel(r.reporting_month)} {r.reporting_year}
                              <span className="block text-[11px] font-normal text-slate-400">
                                Q{quarterFromMonth(r.reporting_month)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 whitespace-nowrap">
                              {r.state?.description || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 whitespace-nowrap">{typeLabel}</TableCell>
                            <TableCell className="text-sm font-semibold text-[#145c3f] text-right tabular-nums">
                              {formatCount(activities)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                              {r.submission_date ? formatDate(r.submission_date) : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-[#145c3f] hover:bg-[#eef6f1]"
                                onClick={() => {
                                  setSelectedId(r.id);
                                  setSelectedModule((r.activity_module || "accreditation") as ProviderFormKey);
                                  setMode("view");
                                }}
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

/** Redirect legacy per-module URLs to the merged hub. */
export function ProviderManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(PROVIDER_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
