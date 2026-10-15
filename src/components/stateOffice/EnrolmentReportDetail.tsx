import * as React from "react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  monthLabel, quarterFromMonth, formatCount, formatDate, formatAmount,
} from "./constants";
import { ENROLMENT_ACTIVITIES } from "./enrolmentPillarTypes";

interface Props {
  reportType: "enrolment";
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

const DETAIL_LABELS: Record<string, string> = {
  surname: "Surname",
  first_name: "First Name",
  middle_name: "Middle Name",
  nin: "NIN",
  nin_number: "NIN",
  organization_mda: "Organization/MDA",
  entity_type: "Entity Type",
  blood_group: "Blood Group",
  marital_status: "Marital Status",
  state_of_origin: "State of Origin",
  lga_of_origin: "LGA of Origin",
  state_of_residence: "State of Residence",
  lga_of_residence: "LGA of Residence",
  hmo: "HMO",
  hcf: "HCF",
  alternative_provider: "Alternative Provider",
  phone_number: "Phone Number",
  program_type: "Program Type",
  project_community_name: "Project/Community Name",
  sponsor_name: "Sponsor/Payer",
  sponsor_phone: "Sponsor Phone",
  sponsor_email: "Sponsor Email",
  registration_date: "Registration Date",
  enrolment_date_auto: "Enrolment Effective Date",
  renewal_date: "Renewal Window Start",
  expiry_date: "Expiry Date",
  renewal_status: "Renewal Status",
  year: "Year",
  induction_month: "Induction Month",
  stream: "Stream",
  batch: "Batch",
  number_mobilized: "Number Mobilized/Enrolled",
  start_date: "Start Date",
  end_date: "End Date",
  institution_name: "Institution",
  students_enrolled: "Students Enrolled",
  sshia_name: "SSHIA",
  number_enrolled: "Number Enrolled",
  mha_name: "MHA",
  community_members_enrolled: "Community Members Enrolled",
  equity_program: "Equity Program",
  beneficiaries_count: "Beneficiaries",
  sshia_program: "SSHIA Program",
  enrollee_name: "Enrollee Name",
  organization_name: "Organization",
  validation_status: "Validation Status",
  validation_date: "Validation Date",
  not_validated_reason: "Not Validated Reason",
  request_category: "Request Category",
  nhia_number: "NHIA Number",
  payment_reference: "Payment Reference",
  id_card_status: "ID Card Status",
  issue_date: "Issue Date",
  supporting_evidence: "Supporting Evidence",
  status_reason: "Status Reason",
  beneficiary_status: "Beneficiary Status",
};

function activityLabel(category: string | null | undefined) {
  return ENROLMENT_ACTIVITIES.find((a) => a.value === category)?.label
    || String(category || "—").replace(/_/g, " ");
}

function parseDetails(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, string>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

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
  if (
    s.includes("complete")
    || (s.includes("validat") && !s.includes("not"))
    || s === "issued"
    || s === "renewed"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progress") || s.includes("pending") || s.includes("due soon") || s.includes("not yet")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (s.includes("cancel") || s.includes("overdue") || s.includes("not valid")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function detailEntries(details: Record<string, string>) {
  return Object.entries(details).filter(([key, value]) => {
    if (!value || String(value).trim() === "") return false;
    if (key.endsWith("_id") || key.endsWith("_code")) return false;
    return true;
  });
}

export default function EnrolmentReportDetail({ reportId, onBack, onEdit }: Props) {
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi.enrolment.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  const line = report?.lines?.[0] ?? null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Enrolment Activity Reporting</h2>
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
                      {activityLabel(line.category)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {[
                        report.zone?.description,
                        report.state?.description,
                        monthLabel(report.reporting_month),
                        `Q${quarter}`,
                        String(report.reporting_year),
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {(() => {
                    const details = parseDetails(line.program_details);
                    const lineStatus = line.activity_status
                      || details.id_card_status
                      || details.validation_status;
                    return lineStatus ? (
                      <Badge variant="outline" className={cn("text-[10px] font-semibold", statusTone(lineStatus))}>
                        {lineStatus}
                      </Badge>
                    ) : null;
                  })()}
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
                {(() => {
                  const details = parseDetails(line.program_details);
                  const extras = detailEntries(details);
                  const fields: [string, React.ReactNode][] = [
                    ["Activity date", line.activity_date],
                    ["Channel", line.enrolment_channel],
                    ["Enrolment type", line.enrolment_type],
                    ["Program", line.program_name],
                    ["Enrolment mode", line.enrolment_category],
                    ["Beneficiary category", line.beneficiary_category],
                    ["Beneficiary status", line.beneficiary_status || details.beneficiary_status],
                    ["Funding option", line.funding_option],
                    ["Supporting evidence", line.supporting_evidence || details.supporting_evidence],
                    ["Activity status", line.activity_status],
                    ["Status reason", line.status_reason || details.status_reason],
                    ["Number enrolled", line.enrolment_count != null ? formatCount(line.enrolment_count) : null],
                    ["Enrolees validated", line.enrollees_validated != null ? formatCount(line.enrollees_validated) : null],
                    ["Activity budget", line.activity_budget != null ? `₦${formatAmount(line.activity_budget)}` : null],
                    ["Approved amount", line.approved_amount != null ? `₦${formatAmount(line.approved_amount)}` : null],
                    ...extras.map(([k, v]): [string, React.ReactNode] => [
                      DETAIL_LABELS[k] || k.replace(/_/g, " "),
                      String(v),
                    ]),
                  ];

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
                      {fields.map(([label, value]) => (
                        <InfoField key={label} label={label} value={value} />
                      ))}
                    </div>
                  );
                })()}

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
