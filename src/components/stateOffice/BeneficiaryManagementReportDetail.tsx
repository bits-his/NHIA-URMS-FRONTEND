import * as React from "react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { apiFileUrl, stateOfficeApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  monthLabel, quarterFromMonth, formatDate,
  parseSupportingDocuments,
} from "./constants";
import { beneficiaryListSummary } from "./beneficiaryManagementTypes";

interface Props {
  reportType: "extra-dependant" | "hcf-change" | "hmo-selection" | string;
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("approved") || s.includes("process")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("pending") || s.includes("progress")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function BeneficiaryManagementReportDetail({
  reportType, reportId, onBack, onEdit,
}: Props) {
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const apiKey = (["extra-dependant", "hcf-change", "hmo-selection"].includes(reportType)
    ? reportType
    : "extra-dependant") as "extra-dependant" | "hcf-change" | "hmo-selection";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi[apiKey].get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId, apiKey]);

  const line = report?.lines?.[0] ?? null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const summary = beneficiaryListSummary({
    __reportType: apiKey,
    lines: report?.lines,
  });
  const docs = parseSupportingDocuments(line?.supporting_documents).filter((d) => d.path);
  if (line?.evidence_path) docs.push({ name: line.evidence_name || "Evidence", path: line.evidence_path });
  if (line?.report_path) docs.push({ name: line.report_name || "Report", path: line.report_path });

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Beneficiary Management</h2>
            {report?.reference_id ? (
              <p className="text-xs font-mono font-semibold text-[#145c3f] truncate">{report.reference_id}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusCfg && (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          )}
          {report?.endorsed && report?.status === "draft" ? (
            <Badge className="text-[10px] px-2 py-0.5 border bg-emerald-50 text-emerald-700 border-emerald-200">
              Endorsed
            </Badge>
          ) : null}
          {report?.status === "draft" && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" /> Edit Draft
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading report...</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : !line ? (
            <div className="text-center py-24 text-slate-400 text-sm">No activity recorded.</div>
          ) : (
            <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-[#e8f3ec] bg-gradient-to-r from-[#f4fbf7] to-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-bold text-[#0f3d2e]">{summary.activity}</h3>
                    <p className="text-xs text-slate-500">
                      {[
                        summary.subject,
                        report.zone?.description,
                        report.state?.description,
                        monthLabel(report.reporting_month),
                        `Q${quarter}`,
                        String(report.reporting_year),
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {(line.line_status || line.activity_status) ? (
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", statusTone(line.line_status || line.activity_status))}>
                      {line.line_status || line.activity_status}
                    </Badge>
                  ) : null}
                </div>
                {(report.submission_date || report.submitted_by) && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    {[
                      report.submission_date ? `Submitted ${formatDate(report.submission_date)}` : null,
                      report.submitted_by ? `by ${report.submitted_by}` : null,
                    ].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>

              <CardContent className="p-4 md:p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
                  <InfoField label="Enrollee" value={line.enrollee_name} />
                  <InfoField label="NHIA number" value={line.nhia_number || line.principle_nhia_number} />
                  <InfoField label="Enrolment ref" value={line.enrolment_reference_id || report.enrolment_reference_id} />
                  <InfoField label="Programme" value={line.program_name || String(line.program || "").split("|")[0]} />
                  <InfoField label="MDA" value={line.mda || line.details?.mda} />
                  <InfoField label="Request date" value={line.request_date || line.record_date || line.selection_date} />
                  <InfoField label="Process end" value={line.process_end_date} />
                  <InfoField label="Dependant entity" value={line.relationship || line.dependant_entity} />
                  <InfoField label="Relationship" value={line.relationship_kind} />
                  <InfoField label="HCF" value={line.hcf} />
                  <InfoField label="Alternative provider" value={line.alternative_provider} />
                  <InfoField label="HMO" value={line.hmo_name} />
                  <InfoField label="Change type" value={line.entity_type || line.change_entity_type} />
                  <InfoField label="Current provider" value={line.current_provider || line.current_hcp_hmo} />
                  <InfoField label="New provider" value={line.new_provider || line.new_hcp_hmo} />
                  <InfoField label="Reason" value={line.reason_for_transfer || line.reason_category || line.reason_for_change} />
                  <InfoField label="Met criteria" value={line.met_criteria} />
                  <InfoField label="Former HMO" value={line.former_hmo} />
                  <InfoField label="Selected HMO" value={line.selected_hmo} />
                  <InfoField label="HMOs invited" value={line.hmos_invited} />
                  <InfoField label="HMOs attended" value={line.hmos_attended} />
                  <InfoField label="Surname" value={line.surname} />
                  <InfoField label="First name" value={line.first_name} />
                  <InfoField label="NIN" value={line.nin} />
                  <InfoField label="Phone" value={line.phone_number} />
                </div>

                {line.remarks ? (
                  <div className="space-y-1 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.remarks}</p>
                  </div>
                ) : null}

                {docs.length > 0 ? (
                  <div className="space-y-2 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Documents</p>
                    <div className="flex flex-col gap-1">
                      {docs.map((d) => (
                        <a
                          key={d.path}
                          className="text-sm font-medium text-[#1a7a52] underline"
                          href={apiFileUrl(d.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.name || "Document"}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.coordinator_review_note ? (
                  <div className="space-y-1 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Coordinator review</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.coordinator_review_note}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
