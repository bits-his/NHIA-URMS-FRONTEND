import * as React from "react";
import { ArrowLeft, Plus, Eye, RefreshCw, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stockApi } from "@/lib/api";
import StockVerificationPage from "./StockVerificationPage";
import PageLayout from "@/src/components/PageLayout";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";
import { RegisterStatsCards } from "@/src/components/stateOffice/RegisterStatsCards";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";

interface Verification {
  id: number;
  reference_id: string;
  stocktaking_type: string;
  store_keeper: string | null;
  audit_officer: string | null;
  verification_date: string | null;
  status: "draft" | "submitted" | "approved";
  createdAt: string;
  zone?: { description: string };
  state?: { description: string };
  department?: { name: string };
  unit?: { name: string };
}

interface Props {
  onBack: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3 h-3" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3 h-3" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const TYPE_LABELS: Record<string, string> = {
  all: "All Types", annual: "Annual", monthly: "Monthly", periodic: "Periodic", surprise: "Surprise",
};

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default function StockVerificationsList({ onBack }: Props) {
  const { canCreate, createOnly } = useCreateReviewAccess();
  const [mode, setMode] = React.useState<"list" | "form">(createOnly ? "form" : "list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [verifications, setVerifications] = React.useState<Verification[]>([]);
  const [loading, setLoading] = React.useState(!createOnly);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterType, setFilterType] = React.useState("all");

  const load = React.useCallback(async () => {
    if (createOnly) return;
    setLoading(true);
    try {
      const res = await stockApi.listVerifications({
        status: filterStatus !== "all" ? filterStatus : undefined,
        type:   filterType   !== "all" ? filterType   : undefined,
      });
      setVerifications(res.data as Verification[]);
    } catch (err: any) {
      toast.error("Failed to load", { description: err.message });
    } finally { setLoading(false); }
  }, [filterStatus, filterType, createOnly]);

  React.useEffect(() => { if (!createOnly) load(); }, [load, createOnly]);

  const counts = React.useMemo(() => ({
    total:     verifications.length,
    draft:     verifications.filter(v => v.status === "draft").length,
    submitted: verifications.filter(v => v.status === "submitted").length,
    approved:  verifications.filter(v => v.status === "approved").length,
  }), [verifications]);

  const openNew = () => {
    if (!canCreate) return;
    setSelectedId(null);
    setMode("form");
  };
  const openView = (id: number) => { setSelectedId(id); setMode("form"); };
  const closeForm = () => {
    if (createOnly) {
      setSelectedId(null);
      setFormKey((k) => k + 1);
      setMode("form");
      return;
    }
    setSelectedId(null);
    setMode("list");
    load();
  };

  const columns: ColumnDef<Verification>[] = React.useMemo(
    () => [
      {
        accessorKey: "reference_id",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary">{row.original.reference_id}</span>
        ),
      },
      {
        id: "zone",
        header: "Zone",
        accessorFn: (row) => row.zone?.description || "—",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">{row.original.zone?.description || "—"}</span>
        ),
      },
      {
        id: "state",
        header: "State",
        accessorFn: (row) => row.state?.description || "—",
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-800">{row.original.state?.description || "—"}</span>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => TYPE_LABELS[row.stocktaking_type] || row.stocktaking_type,
        cell: ({ row }) => (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {TYPE_LABELS[row.original.stocktaking_type] || row.original.stocktaking_type}
          </span>
        ),
      },
      {
        accessorKey: "store_keeper",
        header: "Store keeper",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500">{row.original.store_keeper || "—"}</span>
        ),
      },
      {
        id: "date",
        header: "Date",
        accessorFn: (row) => safeDate(row.verification_date || row.createdAt),
        cell: ({ row }) => (
          <span className="text-xs text-slate-400">
            {safeDate(row.original.verification_date || row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const sc = STATUS_CONFIG[row.original.status];
          return (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
              {sc.icon} {sc.label}
            </Badge>
          );
        },
      },
      {
        id: "view",
        header: "View",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-slate-500 hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              openView(row.original.id);
            }}
          >
            <Eye className="w-3.5 h-3.5" /> View
          </Button>
        ),
      },
    ],
    []
  );

  if (mode === "form") {
    return (
      <StockVerificationPage
        key={formKey}
        verificationId={selectedId}
        onBack={createOnly && !selectedId ? onBack : closeForm}
        onSubmitted={closeForm}
      />
    );
  }

  const hasFilters = filterStatus !== "all" || filterType !== "all";

  return (
    <PageLayout
      title="Stock & Asset Verifications"
      onBack={onBack}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5 h-8 text-xs rounded-md">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canCreate && (
            <Button
              size="sm"
              className="bg-orange-action hover:bg-orange-600 gap-1.5 shadow-md shadow-orange-500/20 h-8 text-xs rounded-md"
              onClick={openNew}
            >
              <Plus className="w-3.5 h-3.5" /> New Verification
            </Button>
          )}
        </div>
      }
      contentClassName="space-y-4 pb-8"
    >
      <div className="w-full space-y-4">
        <RegisterStatsCards
          loading={loading}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          stats={[
            { label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]" },
            { label: "Draft", value: counts.draft, tone: "text-slate-600 bg-white border-slate-200" },
            { label: "Submitted", value: counts.submitted, tone: "text-blue-700 bg-blue-50/80 border-blue-100" },
            { label: "Approved", value: counts.approved, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100" },
          ]}
        />

        <Card className="rounded-lg border-[#d4e8dc] shadow-2xs">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="grid grid-flow-col auto-cols-fr gap-3">
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full" displayValue={
                      filterStatus === "all" ? "All Statuses" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label
                    }>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full" displayValue={TYPE_LABELS[filterType] ?? "Type"}>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="periodic">Periodic</SelectItem>
                      <SelectItem value="surprise">Surprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 gap-1 shrink-0"
                    onClick={() => { setFilterStatus("all"); setFilterType("all"); }}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ShadcnDataTable
            title="STOCK VERIFICATION REGISTER"
            columns={columns}
            data={verifications}
            loading={loading}
            searchPlaceholder="Search by reference, zone, state, store keeper..."
            emptyMessage="No verifications found"
            onRowClick={(row) => openView(row.id)}
            pageSize={50}
            showTableOptions={false}
          />
        </div>
    </PageLayout>
  );
}
