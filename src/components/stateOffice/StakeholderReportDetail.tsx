import * as React from "react";
import {
  ArrowLeft, Check, CheckCircle2, Clock, FileText, Loader2, Pencil, Send, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useStateOfficeAccess } from "@/src/access/createReviewAccess";
import { SubmitConfirmModal } from "@/src/components/SubmitConfirmModal";
import {
  monthLabel, formatDate, formatAmount, parseSupportingDocuments,
} from "./constants";

interface Props {
  reportType?: "stakeholder";
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  draft:            { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  awaiting_review:  { label: "Awaiting review", cls: "bg-amber-100 text-amber-800 border-amber-200",      icon: <Clock className="w-3.5 h-3.5" /> },
  returned:         { label: "Returned",        cls: "bg-rose-100 text-rose-700 border-rose-200",         icon: <XCircle className="w-3.5 h-3.5" /> },
  endorsed:         { label: "Endorsed",        cls: "bg-teal-100 text-teal-800 border-teal-200",         icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  submitted:        { label: "Submitted",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  approved:         { label: "Approved",        cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

/** Turn arrays / JSON-string arrays into readable comma-separated text */
function asText(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    const parts = v.map((x) => asText(x)).filter((x) => x && x !== "—");
    return parts.length ? parts.join(", ") : "—";
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "—";
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
      try {
        return asText(JSON.parse(t));
      } catch {
        /* keep raw */
      }
    }
    return t.replace(/_/g, " ");
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.label || o.name || o.description) {
      return asText(o.label ?? o.name ?? o.description);
    }
    return asText(Object.values(o));
  }
  return String(v);
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  const display = typeof value === "string" || typeof value === "number" || Array.isArray(value)
    ? asText(value)
    : value;
  if (display == null || display === "" || display === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{display}</p>
    </div>
  );
}

function outcomesOf(line: any): { outcome_category: string; specific_outcome: string }[] {
  if (Array.isArray(line.outcomes) && line.outcomes.length) {
    return line.outcomes
      .map((o: any) => ({
        outcome_category: o.outcome_category ?? "",
        specific_outcome: o.specific_outcome ?? "",
      }))
      .filter((o: any) => o.outcome_category || o.specific_outcome);
  }
  if (line.outcome_category || line.specific_outcome) {
    return [{
      outcome_category: line.outcome_category ?? "",
      specific_outcome: line.specific_outcome ?? line.key_outcomes ?? "",
    }];
  }
  return [];
}

function plannedAudience(line: any): string {
  try {
    const d = typeof line.activity_details === "string"
      ? JSON.parse(line.activity_details)
      : line.activity_details;
    return asText(d?.planned_target_audience_text || line.planned_target_audience);
  } catch {
    return asText(line.planned_target_audience);
  }
}

function lineHasEvidence(line: any) {
  return parseSupportingDocuments(line.supporting_documents).some((d) => d.path);
}

type ChecklistKey = "activities" | "outcomes" | "followUp" | "evidence";

const CHECKLIST_ITEMS: { key: ChecklistKey; title: string; hint: string }[] = [
  { key: "activities", title: "Activity record complete", hint: "Check mandatory activity fields" },
  { key: "outcomes", title: "Outcome mapping valid", hint: "Check category and specific outcome pairing" },
  { key: "followUp", title: "Follow-up information complete", hint: "Check all required fields where Follow-up = Yes" },
  { key: "evidence", title: "Supporting evidence attached", hint: "Check mandatory attachment is present" },
];

const EMPTY_CHECKS: Record<ChecklistKey, boolean> = {
  activities: false,
  outcomes: false,
  followUp: false,
  evidence: false,
};

function SectionBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-4 bg-[#f4f7f5]">{children}</div>
    </section>
  );
}

/** Flat single-activity detail (no register table). */
function ActivityDetail({ line }: { line: any }) {
  const outcomes = outcomesOf(line);
  const docs = parseSupportingDocuments(line.supporting_documents).filter((d) => d.path);
  const funded = line.funding_option === "Yes" || line.funding_option === "Budgeted (Approved Release)";
  const fu = line.follow_up_details && typeof line.follow_up_details === "object" ? line.follow_up_details : {};
  const code = line.engagement_code || null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
      <InfoField label="Engagement ID" value={code} />
      <InfoField label="Activity date" value={line.activity_date} />
      <InfoField label="Engagement category" value={line.engagement_category} />
      <InfoField
        label="Stakeholder name(s)"
        value={
          asText(line.stakeholder_categories) !== "—"
            ? asText(line.stakeholder_categories)
            : asText(line.stakeholder_names)
        }
      />
      <InfoField label="Specific activity" value={line.specific_activity} />
      <InfoField label="Engagement purpose" value={line.engagement_purpose} />
      <InfoField label="Planned target audience" value={plannedAudience(line)} />
      <InfoField label="Target audience reached" value={asText(line.target_audience_reached)} />
      <InfoField label="Programme supported" value={asText(line.programs_supported)} />
      <InfoField label="Location category" value={asText(line.location_category)} />
      <InfoField label="Location name" value={line.location_name} />
      <InfoField label="Specify location" value={line.location_specify} />
      {outcomes.map((o, i) => (
        <React.Fragment key={`${o.outcome_category}-${o.specific_outcome}-${i}`}>
          <InfoField label={outcomes.length > 1 ? `Outcome category ${i + 1}` : "Outcome category"} value={o.outcome_category} />
          <InfoField label={outcomes.length > 1 ? `Specific outcome ${i + 1}` : "Specific activity outcome"} value={o.specific_outcome} />
        </React.Fragment>
      ))}
      <InfoField label="Funding option" value={line.funding_option} />
      {funded && (
        <>
          <InfoField
            label="Funding amount"
            value={line.activity_budget != null ? `₦${formatAmount(line.activity_budget)}` : null}
          />
          <InfoField
            label="Approved amount"
            value={line.approved_amount != null ? `₦${formatAmount(line.approved_amount)}` : null}
          />
        </>
      )}
      <InfoField label="Activity status" value={line.activity_status} />
      <InfoField label="Follow-up required" value={line.follow_up_required} />
      {line.follow_up_required === "Yes" && (
        <>
          <InfoField label="Follow-up visit date" value={line.follow_up_date} />
          <InfoField label="Follow-up priority" value={fu.priority} />
          <InfoField label="Follow-up status" value={fu.status} />
          <InfoField label="Follow-up action / purpose" value={fu.action} />
          <InfoField label="Responsible officer / unit" value={fu.responsible} />
          <InfoField label="Follow-up activity conducted" value={fu.activity_conducted} />
          <InfoField label="Follow-up findings" value={fu.findings} />
          <InfoField label="Outstanding issues" value={fu.outstanding_issues} />
          <InfoField label="Further action" value={fu.further_action} />
        </>
      )}
      <div className="sm:col-span-2 lg:col-span-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Supporting evidence</p>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-400">—</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.path}>
                <a className="text-sm text-[#145c3f] underline" href={apiFileUrl(d.path)} target="_blank" rel="noreferrer">
                  {d.name || "Document"}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {line.remarks ? (
        <div className="sm:col-span-2 lg:col-span-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Remarks</p>
          <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{line.remarks}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function StakeholderReportDetail({ reportId, onBack, onEdit }: Props) {
  const { canCreate, canReview } = useStateOfficeAccess();
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewNote, setReviewNote] = React.useState("");
  const [reviewBusy, setReviewBusy] = React.useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = React.useState(false);
  const [checks, setChecks] = React.useState<Record<ChecklistKey, boolean>>(EMPTY_CHECKS);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await stateOfficeApi.stakeholder.get(reportId);
      const data = res.data;
      setReport(data);
      setReviewNote(data?.coordinator_review_note || "");
      setChecks(EMPTY_CHECKS);
    } catch (err: any) {
      toast.error("Failed to load report", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const review = async (status: "endorsed" | "returned" | "submitted") => {
    if ((status === "returned" || status === "endorsed") && !reviewNote.trim()) {
      toast.error("Enter remarks before endorsing or returning");
      return false;
    }
    if (status === "endorsed" && !CHECKLIST_ITEMS.every((item) => checks[item.key])) {
      toast.error("Complete the review checklist before endorsing");
      return false;
    }
    setReviewBusy(true);
    try {
      await stateOfficeApi.stakeholder.updateStatus(reportId, status, reviewNote.trim() || undefined);
      toast.success(
        status === "endorsed"
          ? "Report endorsed — reporting officer can make the final submission"
          : status === "returned"
            ? "Returned for correction"
            : "Final submission complete",
      );
      await reload();
      return true;
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      return false;
    } finally {
      setReviewBusy(false);
    }
  };

  const line = (report?.lines ?? [])[0] ?? null;
  const statusCfg = report ? (STATUS_CONFIG[report.status] || null) : null;
  const period = report
    ? `${monthLabel(report.reporting_month)} ${report.reporting_year}`
    : "—";
  const hasEvidence = line ? lineHasEvidence(line) : false;
  const canAct = canReview && report?.status === "awaiting_review";
  const checklistComplete = CHECKLIST_ITEMS.every((item) => checks[item.key]);
  const canFinalSubmit = canCreate && report?.status === "endorsed";
  const canEditReport = canCreate && ["draft", "returned"].includes(report?.status);
  // RO and SC see the decision block once the report is in the review pipeline
  const showDecisionBlock = !!report && (
    report.status === "awaiting_review"
    || report.status === "endorsed"
    || report.status === "returned"
    || report.status === "submitted"
    || report.status === "approved"
  );
  const showChecklist = canAct || (canReview && !!report && ["endorsed", "returned", "submitted", "approved"].includes(report.status));
  React.useEffect(() => {
    if (!canAct && report && ["endorsed", "submitted", "approved"].includes(report.status)) {
      setChecks({ activities: true, outcomes: true, followUp: true, evidence: true });
    }
  }, [canAct, report?.status, report]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Stakeholder Management</h2>
            <p className="text-xs text-slate-500 truncate">{period}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusCfg && (
            <Badge className={`text-[10px] px-2 py-0.5 flex items-center gap-1 border ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </Badge>
          )}
          {canEditReport && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" /> {report?.status === "returned" ? "Edit & Resubmit" : "Edit Draft"}
            </Button>
          )}
          {canFinalSubmit && (
            <Button
              size="sm"
              className="gap-1.5 bg-[#145c3f] hover:bg-[#0f3d2e]"
              disabled={reviewBusy}
              onClick={() => setFinalConfirmOpen(true)}
            >
              {reviewBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Final Submit
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
          ) : (
            <>
              <SectionBand title="Report Information">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Reporting period" value={period} />
                  <InfoField label="State" value={report.state?.description ?? "—"} />
                  <InfoField label="Reporting officer" value={report.submitted_by || "—"} />
                  <InfoField
                    label="Evidence"
                    value={line ? (hasEvidence ? "Attached" : "Missing") : "—"}
                  />
                  {report.submission_date ? (
                    <InfoField label="Submitted" value={formatDate(report.submission_date)} />
                  ) : null}
                </div>
              </SectionBand>

              <SectionBand title="Engagement details">
                {!line ? (
                  <p className="text-sm text-slate-400 text-center py-6">No engagement recorded.</p>
                ) : (
                  <ActivityDetail line={line} />
                )}
              </SectionBand>

              {showChecklist && (
                <SectionBand title="Review Checklist">
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checks[item.key];
                      return (
                        <label
                          key={item.key}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 shadow-sm",
                            checked ? "border-[#25a872]/40" : "border-[#d4e8dc]",
                            canAct ? "cursor-pointer hover:border-[#25a872]/50" : "cursor-default opacity-90",
                          )}
                        >
                          <button
                            type="button"
                            disabled={!canAct || reviewBusy}
                            aria-pressed={checked}
                            aria-label={item.title}
                            onClick={() => canAct && setChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                              checked
                                ? "border-[#25a872] bg-[#25a872] text-white"
                                : "border-slate-300 bg-white text-transparent",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                          <span className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                            <span className="text-sm font-semibold text-[#0f3d2e]">{item.title}</span>
                            <span className="text-xs text-slate-500 sm:text-right">{item.hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </SectionBand>
              )}

              {showDecisionBlock && (
                <SectionBand title="Coordinator Decision">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Coordinator remarks
                      </Label>
                      {canAct ? (
                        <textarea
                          rows={3}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Required before endorse or return"
                          disabled={reviewBusy}
                          className="w-full rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25a872]/30 focus:border-[#25a872]"
                        />
                      ) : (
                        <div className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-2.5 text-sm text-slate-700 min-h-[4.5rem] whitespace-pre-wrap shadow-sm">
                          {reviewNote.trim() || (
                            <span className="text-slate-400 italic">
                              {report.status === "endorsed" || report.status === "submitted" || report.status === "approved"
                                ? "Endorsed with no additional remarks."
                                : "No remarks recorded yet."}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {canAct ? (
                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={reviewBusy}
                          onClick={() => review("returned")}
                          className="border-slate-300 bg-white hover:bg-slate-50"
                        >
                          Return for Correction
                        </Button>
                        <Button
                          type="button"
                          disabled={reviewBusy || !checklistComplete}
                          onClick={() => review("endorsed")}
                          className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2"
                        >
                          {reviewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Endorse
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#d4e8dc] bg-white px-3.5 py-3 text-sm shadow-sm space-y-2">
                        {report.status === "awaiting_review" && (
                          <p className="text-amber-800 font-medium">Awaiting state coordinator endorsement</p>
                        )}
                        {report.status === "endorsed" && (
                          <>
                            <p className="text-teal-800 font-medium">
                              Endorsed
                              {report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}
                              {report.coordinator_reviewed_at
                                ? ` · ${formatDate(report.coordinator_reviewed_at)}`
                                : ""}
                            </p>
                            {canFinalSubmit && (
                              <p className="text-sm text-slate-600">
                                Ready for your final submission — use the button at the bottom of the page.
                              </p>
                            )}
                            {!canFinalSubmit && canReview && (
                              <p className="text-sm text-slate-600">
                                Waiting for the reporting officer to make the final submission.
                              </p>
                            )}
                          </>
                        )}
                        {(report.status === "submitted" || report.status === "approved") && (
                          <p className="text-[#145c3f] font-medium">
                            Final submission complete
                            {report.coordinator_reviewed_by ? ` · endorsed by ${report.coordinator_reviewed_by}` : ""}
                            {report.coordinator_reviewed_at
                              ? ` · ${formatDate(report.coordinator_reviewed_at)}`
                              : ""}
                          </p>
                        )}
                        {report.status === "returned" && (
                          <p className="text-rose-700 font-medium">
                            Returned for correction
                            {report.coordinator_reviewed_by ? ` by ${report.coordinator_reviewed_by}` : ""}
                            {report.coordinator_reviewed_at
                              ? ` · ${formatDate(report.coordinator_reviewed_at)}`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      Endorsement / signature and submission timestamp are recorded in the system audit trail.
                    </p>
                  </div>
                </SectionBand>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {canFinalSubmit && !loading && (
        <div className="sticky bottom-0 z-30 bg-white border-t border-[#d4e8dc] px-4 md:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-slate-500 mr-auto">
            Endorsed by the State Coordinator — confirm to complete final submission.
          </p>
          <Button
            disabled={reviewBusy || finalConfirmOpen}
            onClick={() => setFinalConfirmOpen(true)}
            className="bg-[#0f3d2e] hover:bg-[#145c3f] text-white gap-2 shadow-md"
          >
            {reviewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Final Submit
          </Button>
        </div>
      )}

      <SubmitConfirmModal
        open={finalConfirmOpen}
        busy={reviewBusy}
        title="Confirm final submission"
        description="This will complete the report after State Coordinator endorsement. You will not be able to edit it afterwards."
        confirmLabel="Yes, final submit"
        onConfirm={() => {
          void (async () => {
            const ok = await review("submitted");
            if (ok) setFinalConfirmOpen(false);
          })();
        }}
        onCancel={() => {
          if (!reviewBusy) setFinalConfirmOpen(false);
        }}
      />
    </div>
  );
}
