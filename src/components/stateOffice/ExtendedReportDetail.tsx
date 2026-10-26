import * as React from "react";
import { useSelector } from "react-redux";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2, Pencil, XCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import type { RootState } from "@/src/store/store";
import { isDeptStateCoordinator, isDeptZonalCoordinator } from "@/src/access/departmentRoles";
import {
  REPORT_CONFIG, ACCREDITATION_INDICATORS, ACCREDITATION_PROCESS_TYPES,
  ACCREDITATION_ENTRY_TYPES, expandAccreditationLines,
  COMPLAINT_SUMMARY_CATEGORIES, COMPLAINT_STATUS_TYPES,
  EXTRA_DEPENDANT_RELATIONSHIPS, EXTRA_DEPENDANT_STATUSES, parseSupportingDocuments,
  YES_NO_OPTIONS, HCP_CHANGE_CHANNELS, HCP_CHANGE_STATUSES,
  ENROLMENT_DRIVE_PROGRAMS, formatAmount,
  monthLabel, quarterFromMonth, labelOf, formatCount, formatDate, type StateOfficeReportType,
} from "./constants";
import { isEnrolmentDriveType } from "./enrolmentDriveTypes";

interface Props {
  reportType: StateOfficeReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
  onReviewed?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3.5 h-3.5" /> },
  returned:         { label: "Returned",  cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: <FileText className="w-3.5 h-3.5" /> },
  endorsed:         { label: "Endorsed",  cls: "bg-teal-100 text-teal-800 border-teal-200",          icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  submitted:        { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3.5 h-3.5" /> },
  approved:         { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function ExtendedReportDetail({ reportType, reportId, onBack, onEdit, onReviewed }: Props) {
  const cfg = REPORT_CONFIG[reportType];
  const api = stateOfficeApi[reportType];
  const authUser = useSelector((s: RootState) => s.auth.user);
  const canReview = isDeptStateCoordinator(authUser?.role || "") || isDeptZonalCoordinator(authUser?.role || "");
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [acting, setActing] = React.useState(false);
  /** Document: coordinator adds comments, then Endorse / Return / Approve. */
  const [reviewAction, setReviewAction] = React.useState<"endorse" | "return" | "approve" | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");

  const reload = React.useCallback(async () => {
    const res = await api.get(reportId);
    setReport(res.data);
    return res.data;
  }, [api, reportId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(reportId);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, reportId]);

  const statusCfg = report ? (STATUS_CONFIG[report.status] || null) : null;
  const quarter = report ? quarterFromMonth(report.reporting_month) : 0;
  const canEditProvider = reportType === "accreditation"
    && ["draft", "returned", "endorsed"].includes(report?.status);
  const canEditStandard = report?.status === "draft";
  const providerWorkflow = reportType === "accreditation";
  const showEndorse = canReview && providerWorkflow && report?.status === "awaiting_review";
  const showApprove = canReview && providerWorkflow && report?.status === "submitted";

  const openReview = (action: "endorse" | "return" | "approve") => {
    setReviewNote("");
    setReviewAction(action);
  };

  const closeReview = () => {
    if (acting) return;
    setReviewAction(null);
    setReviewNote("");
  };

  const confirmReview = async () => {
    if (!reviewAction) return;
    const note = reviewNote.trim();
    if (reviewAction === "return" && !note) {
      toast.error("A comment is required when returning a report");
      return;
    }
    setActing(true);
    try {
      if (reviewAction === "endorse") {
        await api.updateStatus(reportId, "endorsed", note || undefined);
        toast.success("Report endorsed", { description: "The officer can now submit this report." });
      } else if (reviewAction === "approve") {
        await api.updateStatus(reportId, "approved", note || undefined);
        toast.success("Report approved");
      } else {
        const next = report?.status === "awaiting_review" ? "returned" : "draft";
        await api.updateStatus(reportId, next, note);
        toast.success(next === "returned" ? "Returned for correction" : "Returned to draft");
      }
      setReviewAction(null);
      setReviewNote("");
      await reload();
      onReviewed?.();
    } catch (err: any) {
      toast.error(
        reviewAction === "endorse" ? "Endorsement failed"
          : reviewAction === "approve" ? "Approval failed"
            : "Could not return report",
        { description: err.message },
      );
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {onEdit && ((reportType === "accreditation" ? canEditProvider : canEditStandard)) && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2"><Pencil className="w-4 h-4" /> Edit</Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Loading report...</span>
            </div>
          ) : !report ? (
            <div className="text-center py-24 text-slate-400 text-sm">Report not found.</div>
          ) : (
            <>
              <Card className="rounded-2xl border-[#d4e8dc]">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div><CardTitle className="text-base">Report Summary</CardTitle><CardDescription>Basic information</CardDescription></div>
                  {statusCfg && <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>{statusCfg.icon} {statusCfg.label}</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                    <InfoField label="Zone" value={report.zone?.description ?? "—"} />
                    <InfoField label="State" value={report.state?.description ?? "—"} />
                    <InfoField label="Month" value={monthLabel(report.reporting_month)} />
                    <InfoField label="Quarter" value={`Q${quarter}`} />
                    <InfoField label="Year" value={String(report.reporting_year)} />
                    <InfoField label="Submitted" value={formatDate(report.submission_date)} />
                    <InfoField label="By" value={report.submitted_by ?? "—"} />
                  </div>
                </CardContent>
              </Card>

              {reportType === "complaints" && (
                <>
                  <DataCard title="Complaints Summary" headers={["Category", "Number"]}
                    rows={(report.summary_lines ?? []).map((l: any) => [labelOf(COMPLAINT_SUMMARY_CATEGORIES, l.category), formatCount(l.complaint_count)])} />
                  <DataCard title="Complaint Status" headers={["Status", "Number"]}
                    rows={(report.status_lines ?? []).map((l: any) => [labelOf(COMPLAINT_STATUS_TYPES, l.status), formatCount(l.status_count)])} />
                  <DataCard title="Compliance Visits" headers={["Facility", "Date", "Purpose", "Outcome"]}
                    rows={(report.visit_lines ?? []).map((l: any) => [l.facility_visited, l.visit_date || "—", l.purpose || "—", l.outcome || "—"])} />
                  <DataCard title="Reconciliation Meetings" headers={["HMO", "Facility", "Amount", "Status", "Comment"]}
                    rows={(report.reconciliation_lines ?? []).map((l: any) => [l.hmo, l.facility, formatCount(l.amount_owed), l.recon_status || "—", l.comment || "—"])} />
                </>
              )}

              {reportType === "accreditation" && (() => {
                const rawLines = report.lines ?? [];
                const templateLines = rawLines
                  .map((l: any) => {
                    const t = l.activity_template;
                    if (!t) return null;
                    const tpl = typeof t === "string" ? (() => { try { return JSON.parse(t); } catch { return null; } })() : t;
                    if (!tpl || typeof tpl !== "object") return null;
                    return { ...l, ...tpl };
                  })
                  .filter(Boolean);
                if (templateLines.length > 0) {
                  const coveredTotal = templateLines.reduce(
                    (s: number, l: any) => s + (Number(l.facilities_covered ?? l.stakeholders_engaged) || 0),
                    0,
                  );
                  return (
                    <>
                      {(report.coordinator_reviewed_by || report.coordinator_review_note) && (
                        <Card className="rounded-2xl border-[#d4e8dc]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Coordinator review</CardTitle>
                          </CardHeader>
                          <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                            <InfoField label="Reviewed by" value={report.coordinator_reviewed_by || "—"} />
                            <InfoField label="Reviewed at" value={report.coordinator_reviewed_at ? formatDate(report.coordinator_reviewed_at) : "—"} />
                            <div className="sm:col-span-2">
                              <InfoField label="Comment" value={report.coordinator_review_note || "—"} />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <DataCard title="Activity Summary"
                        headers={["Form", "Activities", "Completed", "Facilities Covered"]}
                        rows={[[
                          report.activity_module || "—",
                          formatCount(templateLines.length),
                          formatCount(templateLines.filter((l: any) => l.activity_status === "Completed").length),
                          formatCount(coveredTotal),
                        ]]} />
                      <DataCard title="Provider Management Activities"
                        headers={["ID", "Date", "Programme", "BHCPF Type", "Planned", "Covered", "Funding", "Status", "Remarks"]}
                        rows={templateLines.map((l: any) => [
                          l.provider_management_id || l.engagement_code || "—",
                          l.activity_date || "—",
                          l.related_programme || (Array.isArray(l.programs_supported) ? l.programs_supported.join(", ") : null) || "—",
                          l.bhcpf_activity_type || "—",
                          formatCount(l.facilities_planned ?? l.planned_target_stakeholders),
                          formatCount(l.facilities_covered ?? l.stakeholders_engaged),
                          l.funding_option || "—",
                          l.activity_status || "—",
                          l.remarks || "—",
                        ])} />
                      {templateLines.some((l: any) => l.metrics && Object.keys(l.metrics).length) && (
                        <DataCard title="Activity-specific metrics"
                          headers={["ID", "Metric", "Value"]}
                          rows={templateLines.flatMap((l: any) => {
                            const metrics = l.metrics && typeof l.metrics === "object" ? l.metrics : {};
                            const linked = l.related_programme === "BHCPF"
                              ? (l.bhcpf_activity_type === "Reaccreditation"
                                ? [["Number of PHCs Re-accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                : [["Number of PHCs Accredited", l.facilities_covered ?? l.stakeholders_engaged]])
                              : (l.form_type === "reaccreditation" || l.engagement_category === "Re-accreditation"
                                ? [["Number of Facilities Re-accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                : (l.form_type === "accreditation" || l.engagement_category === "Accreditation"
                                  ? [["Number of Facilities Accredited", l.facilities_covered ?? l.stakeholders_engaged]]
                                  : []));
                            return [
                              ...Object.entries(metrics).map(([k, v]) => [
                                l.provider_management_id || "—", k, formatCount(v as any),
                              ]),
                              ...linked.map(([k, v]) => [l.provider_management_id || "—", `${k} (linked)`, formatCount(v as any)]),
                            ];
                          })} />
                      )}
                    </>
                  );
                }
                return (
                  <DataCard title="Accreditation"
                    headers={["Accreditation", "Category", "Primary", "Secondary", "Total"]}
                    rows={expandAccreditationLines(rawLines).map((r) => [
                      labelOf(ACCREDITATION_PROCESS_TYPES, r.process, r.process),
                      labelOf(ACCREDITATION_ENTRY_TYPES, r.entry, r.entry),
                      formatCount(r.primary_count),
                      formatCount(r.secondary_count),
                      formatCount(r.primary_count + r.secondary_count),
                    ])} />
                );
              })()}

              {reportType === "stakeholder" && (
                <>
                  <DataCard title="Activity Summary" headers={["Planned Activities", "Activities Conducted", "Activities Recorded", "Stakeholders Engaged"]}
                    rows={[[
                      report.planned_activities ?? "—",
                      formatCount((report.lines ?? []).filter((l: any) => l.activity_status === "Completed").length),
                      formatCount(report.lines?.length ?? 0),
                      formatCount((report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.stakeholders_engaged ?? l.audience_size) || 0), 0)),
                    ]]} />
                  <DataCard title="Stakeholder Engagement"
                    headers={["ID", "Date", "Category", "Stakeholders", "Location", "Programs", "Engaged", "Follow-up", "Outcome", "Status", "Remarks"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.engagement_code || "—",
                      l.activity_date || "—",
                      l.engagement_category || l.activity || "—",
                      l.stakeholder_names || (Array.isArray(l.stakeholder_categories) ? l.stakeholder_categories.join(", ") : null) || l.organization || "—",
                      [l.location_category, l.location_name || l.location].filter(Boolean).join(" — ") || "—",
                      (Array.isArray(l.programs_supported) ? l.programs_supported.join(", ") : null) || "—",
                      formatCount(l.stakeholders_engaged ?? l.audience_size),
                      l.follow_up_required || "—",
                      l.specific_outcome || l.key_outcomes || "—",
                      l.activity_status || "—",
                      l.remarks || "—",
                    ])} />
                </>
              )}

              {isEnrolmentDriveType(reportType) && (
                <>
                  <DataCard title="Activity Summary" headers={["Planned Activities", "Activities Conducted", "Activities Recorded", "New Enrolments"]}
                    rows={[[
                      report.planned_activities ?? "—",
                      formatCount((report.lines ?? []).filter((l: any) => l.activity_status === "Completed").length),
                      formatCount(report.lines?.length ?? 0),
                      formatCount((report.lines ?? []).reduce((s: number, l: any) => s + (Number(l.new_enrolments) || 0), 0)),
                    ]]} />
                  <DataCard title="Enrolment Drive Activities"
                    headers={["ID", "Date", "Activity", "Specific Activity", "Funding", "Budget (₦)", "Approved (₦)", "Target Audience", "Location", "Program ID", "Programs", "Details", "Planned Audience", "Reached", "Leads", "New Enrolments", "Status", "Evidence", "Remarks"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.drive_code || "—",
                      l.activity_date || "—",
                      l.activity_category,
                      l.specific_activity || "—",
                      l.funding_option || "—",
                      l.activity_budget != null ? formatAmount(l.activity_budget) : "—",
                      l.approved_amount != null ? formatAmount(l.approved_amount) : "—",
                      (l.target_audience ?? []).join(", ") || "—",
                      [l.location_category, l.location_name].filter(Boolean).join(" — ") || "—",
                      (l.programs_supported ?? []).map((p: string) => ENROLMENT_DRIVE_PROGRAMS.find((x) => x.label === p)?.code).filter(Boolean).join(", ") || "—",
                      (l.programs_supported ?? []).join(", ") || "—",
                      l.activity_details || "—",
                      l.planned_target_audience ?? "—",
                      l.target_audience_reached ?? "—",
                      l.leads_generated ?? "—",
                      l.new_enrolments ?? "—",
                      l.activity_status || "—",
                      (() => {
                        const docs = parseSupportingDocuments(l.supporting_documents).filter((d) => d.path);
                        if (!docs.length) return "—";
                        return (
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            {docs.map((d) => (
                              <a key={d.path} className="text-[#1a7a52] underline" href={apiFileUrl(d.path)} target="_blank" rel="noreferrer">{d.name || "Document"}</a>
                            ))}
                          </div>
                        );
                      })(),
                      l.remarks || "—",
                    ])} />
                </>
              )}

              {reportType === "hmo-selection" && (
                <DataCard title="MDA Change of HMO Selection Process"
                  headers={["Date", "MDA", "Former HMO", "Reason", "Invited", "Attended", "Guideline", "Transparent", "Selected HMO", "Evidence", "Full report"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.selection_date || "—",
                    l.mda,
                    l.former_hmo || "—",
                    l.reason_for_change || "—",
                    l.hmos_invited ?? "—",
                    l.hmos_attended ?? l.hmos_in_attendance ?? "—",
                    labelOf(YES_NO_OPTIONS, l.compliance_guideline, l.compliance_guideline || "—"),
                    labelOf(YES_NO_OPTIONS, l.transparent_process, l.transparent_process || "—"),
                    l.selected_hmo || "—",
                    l.evidence_path ? <a className="text-[#1a7a52] underline" href={apiFileUrl(l.evidence_path)} target="_blank" rel="noreferrer">{l.evidence_name || "Evidence"}</a> : "—",
                    l.report_path ? <a className="text-[#1a7a52] underline" href={apiFileUrl(l.report_path)} target="_blank" rel="noreferrer">{l.report_name || "Report"}</a> : "—",
                  ])} />
              )}

              {reportType === "extra-dependant" && (
                <DataCard title="Additional / Extra Dependent"
                  headers={["Enrollee", "Principle NHIA", "Age", "Relationship", "Program", "Request", "End date", "Status", "Documents"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.enrollee_name,
                    l.principle_nhia_number,
                    l.age ?? "—",
                    labelOf(EXTRA_DEPENDANT_RELATIONSHIPS, l.relationship, l.relationship),
                    l.program || "—",
                    l.request_date || "—",
                    l.process_end_date || "—",
                    labelOf(EXTRA_DEPENDANT_STATUSES, l.line_status, l.line_status),
                    (() => {
                      const docs = parseSupportingDocuments(l.supporting_documents).filter((d) => d.path);
                      if (!docs.length) return "—";
                      return (
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          {docs.map((d) => (
                            <a key={d.path} className="text-[#1a7a52] underline" href={apiFileUrl(d.path)} target="_blank" rel="noreferrer">{d.name || "Document"}</a>
                          ))}
                        </div>
                      );
                    })(),
                  ])} />
              )}

              {reportType === "hcf-change" && (
                <DataCard title="Change of HCP"
                  headers={["Date", "Enrollee", "NHIA", "Entity", "Current", "New", "Reason", "Criteria", "Channel", "Request", "End date", "Status"]}
                  rows={(report.lines ?? []).map((l: any) => [
                    l.record_date || "—",
                    l.enrollee_name,
                    l.nhia_number,
                    (l.entity_type || "—").toString().toUpperCase(),
                    l.current_hcp_hmo || "—",
                    l.new_hcp_hmo || "—",
                    l.reason_for_transfer || "—",
                    labelOf(YES_NO_OPTIONS, l.met_criteria, l.met_criteria || "—"),
                    labelOf(HCP_CHANGE_CHANNELS, l.request_channel, l.request_channel || "—"),
                    l.request_date || "—",
                    l.process_end_date || "—",
                    labelOf(HCP_CHANGE_STATUSES, l.line_status, l.line_status),
                  ])} />
              )}

              {reportType === "challenges" && (
                (report.lines ?? []).length > 0 ? (
                  <DataCard title="Challenges"
                    headers={["ID", "Category", "Specific", "Severity", "Impact", "Support", "Department", "Status", "Recommendation"]}
                    rows={(report.lines ?? []).map((l: any) => [
                      l.challenge_code || "—",
                      l.challenge_category || "—",
                      l.specific_challenge || "—",
                      l.severity || "—",
                      l.impact || "—",
                      l.support_required || "—",
                      l.responsible_department || "—",
                      l.status || "—",
                      l.key_recommendation || "—",
                    ])} />
                ) : (
                  <>
                    <Card className="rounded-2xl border-[#d4e8dc]">
                      <CardHeader><CardTitle className="text-base">Challenges</CardTitle></CardHeader>
                      <CardContent><p className="text-sm whitespace-pre-wrap text-slate-700">{report.challenges || "—"}</p></CardContent>
                    </Card>
                    <Card className="rounded-2xl border-[#d4e8dc]">
                      <CardHeader><CardTitle className="text-base">Recommendations</CardTitle></CardHeader>
                      <CardContent><p className="text-sm whitespace-pre-wrap text-slate-700">{report.recommendations || "—"}</p></CardContent>
                    </Card>
                  </>
                )
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {(showEndorse || showApprove) && (
        <div className="shrink-0 border-t border-[#d4e8dc] bg-white px-4 md:px-6 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {showEndorse
              ? "Add a comment if needed, then confirm Endorse — or return for correction with a required comment."
              : "Add a comment if needed, then confirm Approve — or return with a required comment."}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50 gap-2"
              disabled={acting}
              onClick={() => openReview("return")}
            >
              <XCircle className="w-4 h-4" /> {showEndorse ? "Return for Correction" : "Return"}
            </Button>
            <Button
              className="bg-[#016630] hover:bg-[#014d24] gap-2"
              disabled={acting}
              onClick={() => openReview(showEndorse ? "endorse" : "approve")}
            >
              <CheckCircle2 className="w-4 h-4" />
              {showEndorse ? "Endorse" : "Approve"}
            </Button>
          </div>
        </div>
      )}

      {reviewAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeReview} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#d4e8dc] bg-white p-5 shadow-xl space-y-3">
            <p className="text-sm font-bold text-slate-900">
              {reviewAction === "endorse" && "Confirm endorsement"}
              {reviewAction === "approve" && "Confirm approval"}
              {reviewAction === "return" && (showEndorse ? "Return for correction" : "Return report to draft")}
            </p>
            <p className="text-xs text-slate-500">
              {report?.reference_id || `Report #${reportId}`}
              {reviewAction === "endorse" && " — confirm you have reviewed this report. Comments are optional."}
              {reviewAction === "approve" && " — confirm final approval. Comments are optional."}
              {reviewAction === "return" && " — explain what must be corrected (required)."}
            </p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={4}
              placeholder={reviewAction === "return" ? "Review comment (required)…" : "Review comment (optional)…"}
              className="w-full rounded-xl border border-[#d4e8dc] bg-[#f8fdfb] p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-[#1a7a52]/30"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeReview} disabled={acting}>
                Cancel
              </Button>
              <Button
                className={`flex-1 gap-2 ${
                  reviewAction === "return"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-[#016630] hover:bg-[#014d24]"
                }`}
                disabled={acting || (reviewAction === "return" && !reviewNote.trim())}
                onClick={() => void confirmReview()}
              >
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {reviewAction === "endorse" && "Confirm Endorse"}
                {reviewAction === "approve" && "Confirm Approve"}
                {reviewAction === "return" && "Return with comment"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataCard({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
      <CardHeader className="pb-2 border-b border-[#d4e8dc] bg-[#f8fdfb]">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{rows.length} row(s)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0fdf7]">
                  {headers.map(h => <TableHead key={h} className="text-xs font-bold">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((cells, i) => (
                  <TableRow key={i}>{cells.map((c, j) => <TableCell key={j} className="text-sm">{c}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
