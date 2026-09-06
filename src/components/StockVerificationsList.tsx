import * as React from "react";
import { ArrowLeft, Plus, Eye, RefreshCw, Loader2, PackageSearch, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stockApi } from "@/lib/api";
import StockVerificationPage from "./StockVerificationPage";

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

const STATUS_LABELS: Record<string, string> = {
  all: "All Statuses", draft: "Draft", submitted: "Submitted", approved: "Approved",
};

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
  const [mode, setMode] = React.useState<"list" | "form">("list");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [verifications, setVerifications] = React.useState<Verification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterType,   setFilterType]   = React.useState("all");

  const load = React.useCallback(async () => {
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
  }, [filterStatus, filterType]);

  React.useEffect(() => { load(); }, [load]);

  const counts = React.useMemo(() => ({
    total:     verifications.length,
    draft:     verifications.filter(v => v.status === "draft").length,
    submitted: verifications.filter(v => v.status === "submitted").length,
    approved:  verifications.filter(v => v.status === "approved").length,
  }), [verifications]);

  const openNew = () => { setSelectedId(null); setMode("form"); };
  const openView = (id: number) => { setSelectedId(id); setMode("form"); };
  const closeForm = () => { setSelectedId(null); setMode("list"); load(); };

  if (mode === "form") {
    return (
      <StockVerificationPage
        verificationId={selectedId}
        onBack={closeForm}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-end sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20" onClick={openNew}>
            <Plus className="w-4 h-4" /> New Verification
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total",     value: counts.total,     color: "bg-slate-50 border-slate-200",     text: "text-slate-700"  },
              { label: "Draft",     value: counts.draft,     color: "bg-slate-50 border-slate-200",     text: "text-slate-600"  },
              { label: "Submitted", value: counts.submitted, color: "bg-blue-50 border-blue-200",       text: "text-blue-700"   },
              { label: "Approved",  value: counts.approved,  color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
            ].map(c => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 border ${c.color}`}>
                <p className={`text-3xl font-black ${c.text}`}>{c.value}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-row items-center gap-3 w-full">
                <div className="flex-1 min-w-0">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full"
                    displayValue={STATUS_LABELS[filterStatus] ?? "Status"}>
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
                <div className="flex-1 min-w-0">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full"
                    displayValue={TYPE_LABELS[filterType] ?? "Type"}>
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
                {(filterStatus !== "all" || filterType !== "all") && (
                  <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0"
                    onClick={() => { setFilterStatus("all"); setFilterType("all"); }}>
                    <XCircle className="w-3.5 h-3.5" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#d4e8dc]">
              <CardTitle className="text-sm font-bold">
                {loading ? "Loading..." : `${verifications.length} verification(s)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading...</span>
                </div>
              ) : verifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <PackageSearch className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-medium">No verifications found</p>
                  <Button variant="outline" size="sm" onClick={openNew} className="mt-2 gap-2">
                    <Plus className="w-4 h-4" /> New Verification
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold text-slate-600">Reference</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Zone</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">State</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Store Keeper</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Audit Officer</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Date</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
                      <TableHead className="text-right text-xs font-bold text-slate-600">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((v, i) => {
                      const sc = STATUS_CONFIG[v.status];
                      return (
                        <motion.tr key={v.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="hover:bg-[#f8fdfb] transition-colors border-b border-slate-100 last:border-0">
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-primary">{v.reference_id}</span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{v.zone?.description || "—"}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-800">{v.state?.description || "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {TYPE_LABELS[v.stocktaking_type] || v.stocktaking_type}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{v.store_keeper || "—"}</TableCell>
                          <TableCell className="text-sm text-slate-500">{v.audit_officer || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-400">{safeDate(v.verification_date || v.createdAt)}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.cls}`}>
                              {sc.icon} {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-primary hover:bg-primary/10"
                              onClick={() => openView(v.id)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
