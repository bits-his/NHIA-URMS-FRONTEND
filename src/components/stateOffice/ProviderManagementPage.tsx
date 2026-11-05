import * as React from "react";
import {
  Award, CheckCircle2, ClipboardCheck, Clock, Eye, FileText,
  Plus, RefreshCw, Stethoscope, type LucideIcon, XCircle,
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
import { MONTHS, monthLabel, formatDate, quarterFromMonth } from "./constants";
import { buildReportingYearOptions } from "../monthly/reportingYears";
import { ALL_STATES, useMonthlyStateFilter } from "../monthly/useMonthlyStateFilter";
import {
  PROVIDER_MANAGEMENT_NAV_TITLE,
  PROVIDER_MANAGEMENT_PATH,
} from "./enrolmentPillarTypes";
import PageLayout from "@/src/components/PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";
import {
  PROVIDER_FORM_TYPES,
  type ProviderFormKey,
} from "./providerManagementTypes";
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

const TAB_ICONS: Record<ProviderFormKey, LucideIcon> = {
  accreditation: Award,
  reaccreditation: RefreshCw,
  "qa-inspections": ClipboardCheck,
  "medical-audits": Stethoscope,
};

type Mode = "list" | "create" | "edit" | "view";

function reportModule(r: { activity_module?: string; form_type?: string }): ProviderFormKey | string {
  return String(r.activity_module || r.form_type || "");
}

/**
 * Provider Management hub — tabbed by form type (accreditation, reaccreditation, QA, audits).
 */
export default function ProviderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  const { canCreate } = useStateOfficeAccess();
  const [mode, setMode] = React.useState<Mode>("list");
  const [selectedId, setSelectedId] = React.useState<number | string | null>(null);
  const [selectedModule, setSelectedModule] = React.useState<ProviderFormKey>("accreditation");
  const [activeTab, setActiveTab] = React.useState<ProviderFormKey>("accreditation");
  const [formKey, setFormKey] = React.useState(0);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterYear, setFilterYear] = React.useState("all");
  const [filterMonth, setFilterMonth] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const yearOptions = React.useMemo(() => buildReportingYearOptions(), []);
  const { showStateFilter, filterState, setFilterState, states, apiStateId } = useMonthlyStateFilter(defaultStateId);

  const activeMeta = PROVIDER_FORM_TYPES.find((f) => f.key === activeTab) ?? PROVIDER_FORM_TYPES[0];
  const newButtonLabel = activeMeta.newLabel;

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
      const res = await stateOfficeApi.listAllProviderReports(filters);
      const rows = (res.data ?? []).map((r: any) => ({
        ...r,
        activity_module: r.activity_module || r.form_type,
      }));
      setReports(rows);
    } catch (err: any) {
      toast.error("Failed to load reports", { description: err.message });
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, defaultZoneId, apiStateId, filterYear, filterMonth]);

  React.useEffect(() => {
    if (mode === "list") load();
  }, [load, mode]);

  const tabCounts = React.useMemo(() => {
    const map = Object.fromEntries(
      PROVIDER_FORM_TYPES.map((f) => [f.key, 0])
    ) as Record<ProviderFormKey, number>;
    for (const r of reports) {
      const mod = reportModule(r);
      if (mod in map) map[mod as ProviderFormKey] += 1;
    }
    return map;
  }, [reports]);

  const filtered = React.useMemo(
    () => reports.filter((r) => reportModule(r) === activeTab),
    [reports, activeTab]
  );

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "period",
        header: "Period",
        accessorFn: (row) => `${monthLabel(row.reporting_month)} ${row.reporting_year}`,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
              {monthLabel(row.original.reporting_month)} {row.original.reporting_year}
            </p>
            <p className="text-[11px] text-slate-400">Q{quarterFromMonth(row.original.reporting_month)}</p>
          </div>
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
        id: "activities",
        header: "Programme",
        accessorFn: (row) => row.lines?.[0]?.related_programme
          || (Array.isArray(row.lines?.[0]?.programs_supported) ? row.lines[0].programs_supported[0] : "")
          || "",
        cell: ({ row }) => {
          const line = row.original.lines?.[0];
          const programme = line?.related_programme
            || (Array.isArray(line?.programs_supported) ? line.programs_supported[0] : null)
            || "—";
          return (
            <span className="text-sm text-slate-700 line-clamp-2 max-w-[14rem]">
              {programme}
            </span>
          );
        },
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
              setSelectedModule((row.original.activity_module || row.original.form_type || "accreditation") as ProviderFormKey);
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

  const counts = React.useMemo(() => ({
    total: filtered.length,
    draft: filtered.filter((r) => r.status === "draft" || r.status === "returned").length,
    awaiting_review: filtered.filter((r) => r.status === "awaiting_review").length,
    endorsed: filtered.filter((r) => r.status === "endorsed").length,
    submitted: filtered.filter((r) => r.status === "submitted" || r.status === "approved").length,
  }), [filtered]);

  const backToList = () => {
    setMode("list");
    setSelectedId(null);
    setFormKey((k) => k + 1);
    load();
  };

  const openCreate = () => {
    setSelectedId(null);
    setSelectedModule(activeTab);
    setFormKey((k) => k + 1);
    setMode("create");
  };

  const switchFormType = (key: ProviderFormKey) => {
    setActiveTab(key);
    setSelectedModule(key);
    if (mode === "create") {
      setFormKey((k) => k + 1);
      return;
    }
    // Editing/viewing a saved report: leave the form and open that activity's list.
    setMode("list");
    setSelectedId(null);
    setFormKey((k) => k + 1);
    void load();
  };

  if (mode === "create" || mode === "edit") {
    return (
      <ProviderManagementForm
        key={formKey}
        reportId={mode === "edit" ? selectedId : null}
        initialFormKey={selectedModule}
        onBack={backToList}
        onCancel={backToList}
        onSubmitted={backToList}
        defaultZoneId={defaultZoneId}
        defaultStateId={defaultStateId}
        onFormTypeChange={switchFormType}
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
    <PageLayout
      title={PROVIDER_MANAGEMENT_NAV_TITLE}
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
          tabs={PROVIDER_FORM_TYPES.map((tab) => ({
            id: tab.key,
            label: tab.tabLabel,
            icon: TAB_ICONS[tab.key],
            count: tabCounts[tab.key] ?? 0,
          }))}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          ariaLabel="Provider activities"
        />
      }
    >
      <div className="w-full space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
              { label: "Draft / Returned", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
              { label: "Awaiting review", value: counts.awaiting_review, tone: "text-amber-800 bg-amber-50/80 border-amber-100" },
              { label: "Endorsed", value: counts.endorsed, tone: "text-teal-800 bg-teal-50/80 border-teal-100" },
              { label: "Submitted", value: counts.submitted, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border px-4 py-3 ${c.tone}`}>
                <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
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
            title={`${activeMeta.tabLabel.toUpperCase()} REGISTER`}
            infoTooltip={`${activeMeta.label} reports by period, state, and submission status.`}
            columns={columns}
            data={filtered}
            loading={loading}
            searchPlaceholder={`Search ${activeMeta.label.toLowerCase()}...`}
            emptyMessage={`No ${activeMeta.label.toLowerCase()} reports yet for these filters.`}
            onRowClick={(r) => {
              setSelectedId(r.reference_id || r.id);
              setSelectedModule((r.activity_module || r.form_type || "accreditation") as ProviderFormKey);
              setMode("view");
            }}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
    </PageLayout>
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
