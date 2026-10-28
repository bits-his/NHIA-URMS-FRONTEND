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
  monthLabel, quarterFromMonth, formatCount, formatDate, formatAmount,
  parseSupportingDocuments,
} from "./constants";
import {
  enrolmentDriveConfig,
  isEnrolmentDriveType,
  type EnrolmentDriveReportType,
} from "./enrolmentDriveTypes";

interface Props {
  reportType: EnrolmentDriveReportType | string;
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
  if (s.includes("complete") || s.includes("conducted")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progress") || s.includes("pending") || s.includes("planned")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s.includes("cancel") || s.includes("not")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function EnrolmentDriveReportDetail({ reportType, reportId, onBack, onEdit }: Props) {
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const apiType = isEnrolmentDriveType(reportType)
    ? reportType
    : (enrolmentDriveConfig(reportType) ? reportType as EnrolmentDriveReportType : null);

  React.useEffect(() => {
    if (!apiType) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi[apiType].get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId, apiType]);

  const line = report?.lines?.[0] ?? null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const driveTitle = enrolmentDriveConfig(String(apiType || reportType))?.title
    || String(report?.drive_type || "Enrolment Drive").replace(/-/g, " ");
  const docs = parseSupportingDocuments(line?.supporting_documents).filter((d) => d.path);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Enrolment Drives</h2>
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
                    <h3 className="text-base font-bold text-[#0f3d2e]">
                      {line.activity_category || driveTitle}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {[
                        driveTitle,
                        report.zone?.description,
                        report.state?.description,
                        monthLabel(report.reporting_month),
                        `Q${quarter}`,
                        String(report.reporting_year),
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {line.activity_status ? (
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", statusTone(line.activity_status))}>
                      {line.activity_status}
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
                  <InfoField label="Activity date" value={line.activity_date} />
                  <InfoField label="Drive code" value={line.drive_code} />
                  <InfoField label="Activity" value={line.activity_category} />
                  <InfoField label="Specific activity" value={line.specific_activity} />
                  <InfoField label="Funding option" value={line.funding_option} />
                  <InfoField
                    label="Activity budget"
                    value={line.activity_budget != null ? `₦${formatAmount(line.activity_budget)}` : null}
                  />
                  <InfoField
                    label="Approved amount"
                    value={line.approved_amount != null ? `₦${formatAmount(line.approved_amount)}` : null}
                  />
                  <InfoField
                    label="Target audience"
                    value={Array.isArray(line.target_audience) ? line.target_audience.join(", ") : line.target_audience}
                  />
                  <InfoField label="Location category" value={line.location_category} />
                  <InfoField label="Location" value={line.location_name} />
                  <InfoField
                    label="Programs supported"
                    value={Array.isArray(line.programs_supported) ? line.programs_supported.join(", ") : line.programs_supported}
                  />
                  <InfoField label="Activity status" value={line.activity_status} />
                  <InfoField
                    label="Planned audience"
                    value={line.planned_target_audience != null ? formatCount(line.planned_target_audience) : null}
                  />
                  <InfoField
                    label="Audience reached"
                    value={line.target_audience_reached != null ? formatCount(line.target_audience_reached) : null}
                  />
                  <InfoField
                    label="Leads generated"
                    value={line.leads_generated != null ? formatCount(line.leads_generated) : null}
                  />
                  <InfoField
                    label="New enrolments"
                    value={line.new_enrolments != null ? formatCount(line.new_enrolments) : null}
                  />
                </div>

                {line.activity_details ? (
                  <div className="space-y-1 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Activity details</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.activity_details}</p>
                  </div>
                ) : null}

                {docs.length > 0 ? (
                  <div className="space-y-2 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Supporting evidence</p>
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

                {line.remarks ? (
                  <div className="space-y-1 pt-1 border-t border-[#e8f3ec]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.remarks}</p>
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
