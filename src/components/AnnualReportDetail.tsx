import * as React from "react";
import {
  ArrowLeft, Loader2, FileText, CheckCircle2,
  Clock, XCircle, Send, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { annualReportApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuarterlyRow {
  id: number;
  category: string;
  q1: string; q2: string; q3: string; q4: string;
  sub_total: string;
}

interface ReportDetail {
  reference_id: string;
  reporting_year: number;
  state: string;
  staff_no: number | null;
  total_vehicles: number | null;
  total_hcf_under_nhia: number | null;
  total_accredited_hcf: number | null;
  approved_budget: string | null;
  total_amount_utilized: string | null;
  total_accredited_cemonc: number | null;
  total_cemonc_beneficiaries: number | null;
  total_accredited_ffp: number | null;
  total_ffp_beneficiaries: number | null;
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
  submitted_by: string | null;
  createdAt: string;
  updatedAt: string;
  quarterly_data: QuarterlyRow[];
}

interface AnnualReportDetailProps {
  referenceId: string;
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReportDetail["status"], { label: string; className: string; icon: React.ReactNode }> = {
  draft:        { label: "Draft",        className: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  submitted:    { label: "Submitted",    className: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Send className="w-3.5 h-3.5" /> },
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700 border-amber-200",       icon: <Clock className="w-3.5 h-3.5" /> },
  approved:     { label: "Approved",     className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:     { label: "Rejected",     className: "bg-rose-100 text-rose-700 border-rose-200",          icon: <XCircle className="w-3.5 h-3.5" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
  gifshipEnrolments:    "GIFSHIP Enrolments",
  premiumGIFSHIP:       "Premium on GIFSHIP",
  ops:                  "OPS",
  newEnrolmentsFSSHIP:  "New Enrolments / Mop-up (FSSHIP)",
  extraDependants:      "Extra Dependants",
  premiumExtraDependant:"Premium on Extra-Dependant",
  additionalDependants: "Additional Dependants",
  changeOfProvider:     "Change of Provider",
};

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

function formatNaira(val: string | null) {
  if (!val) return "—";
  return `N ${Number(val).toLocaleString()}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnualReportDetail({ referenceId, onBack }: AnnualReportDetailProps) {
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await annualReportApi.get(referenceId);
        setReport(res.data as ReportDetail);
      } catch (err: any) {
        toast.error("Failed to load report", { description: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [referenceId]);

  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await annualReportApi.updateStatus(report.reference_id, "submitted");
      setReport(prev => prev ? { ...prev, status: "submitted" } : prev);
      toast.success("Report submitted successfully", {
        description: `${report.reference_id} is now pending Zonal review.`,
      });
    } catch (err: any) {
      toast.error("Failed to submit", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm">Report not found</p>
        <Button variant="outline" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const sc = STATUS_CONFIG[report.status];

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Badge className={`text-xs px-3 py-1 flex items-center gap-1.5 border ${sc.className}`}>
            {sc.icon} {sc.label}
          </Badge>
          {report.status === "draft" && (
            <Button
              className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Send className="w-4 h-4" /> Submit Report</>
              }
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-8 space-y-6">

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-500">
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Created</p>
                <p className="text-slate-700 font-semibold">{formatDate(report.createdAt)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-slate-700 font-semibold">{formatDate(report.updatedAt)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit border ${sc.className}`}>
                  {sc.icon} {sc.label}
                </Badge>
              </div>
            </div>

            {/* General Information */}
            <Card className="rounded-2xl border-[#d4e8dc]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <Field label="Reporting Year" value={report.reporting_year} />
                <Field label="State" value={report.state} />
                <Field label="Staff No." value={report.staff_no} />
                <Field label="Total Vehicles" value={report.total_vehicles} />
                <Field label="Total HCF Under NHIA" value={report.total_hcf_under_nhia} />
                <Field label={`Total Accredited HCFs in ${report.reporting_year}`} value={report.total_accredited_hcf} />
                <Field label={`Approved Budget ${report.reporting_year}`} value={formatNaira(report.approved_budget)} />
                <Field label={`Total Amount Utilized ${report.reporting_year}`} value={formatNaira(report.total_amount_utilized)} />
              </CardContent>
            </Card>

            {/* CEmONC & FFP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">CEmONC Data</CardTitle>
                  <CardDescription className="text-xs">Year {report.reporting_year}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  <Field label="Accredited CEmONC HCFs" value={report.total_accredited_cemonc} />
                  <Field label="CEmONC Beneficiaries" value={report.total_cemonc_beneficiaries} />
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">FFP Data</CardTitle>
                  <CardDescription className="text-xs">Year {report.reporting_year}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  <Field label="Accredited FFP Facilities" value={report.total_accredited_ffp} />
                  <Field label="FFP Beneficiaries" value={report.total_ffp_beneficiaries} />
                </CardContent>
              </Card>
            </div>

            {/* Quarterly Data */}
            {report.quarterly_data && report.quarterly_data.length > 0 && (
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Quarterly Performance Data</CardTitle>
                  <CardDescription className="text-xs">Year {report.reporting_year}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 pb-3 border-b border-slate-200 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</span>
                    {["Q1","Q2","Q3","Q4"].map(q => (
                      <span key={q} className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">{q}</span>
                    ))}
                    <span className="text-xs font-bold uppercase tracking-wider text-primary text-center">Sub-Total</span>
                  </div>
                  {report.quarterly_data.map(row => {
                    const total = Number(row.sub_total);
                    return (
                      <div key={row.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center py-2 border-b border-slate-100 last:border-0 text-sm">
                        <span className="text-slate-700 font-medium pr-2">
                          {CATEGORY_LABELS[row.category] || row.category}
                        </span>
                        {[row.q1, row.q2, row.q3, row.q4].map((v, i) => (
                          <span key={i} className="text-center text-slate-600">
                            {Number(v) > 0 ? Number(v).toLocaleString() : "—"}
                          </span>
                        ))}
                        <span className={`text-center font-bold ${total > 0 ? "text-primary" : "text-slate-400"}`}>
                          {total > 0 ? total.toLocaleString() : "—"}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
