import * as React from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, Clock, FileText, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { stateOfficeApi, apiFileUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  monthLabel, formatCount, formatDate, formatAmount, parseSupportingDocuments,
} from "./constants";

interface Props {
  reportType?: "stakeholder";
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200",       icon: <FileText className="w-3.5 h-3.5" /> },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200",          icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
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

function ActivityExpanded({ line }: { line: any }) {
  const outcomes = outcomesOf(line);
  const docs = parseSupportingDocuments(line.supporting_documents).filter((d) => d.path);
  const funded = line.funding_option === "Yes" || line.funding_option === "Budgeted (Approved Release)";
  const fu = line.follow_up_details && typeof line.follow_up_details === "object" ? line.follow_up_details : {};

  return (
    <div className="space-y-4 p-4 bg-[#f8fbf9] border-t border-[#e8f3ec]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Activity details</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoField label="Stakeholder name(s)" value={
            asText(line.stakeholder_categories) !== "—"
              ? asText(line.stakeholder_categories)
              : asText(line.stakeholder_names)
          } />
          <InfoField label="Specific activity" value={line.specific_activity} />
          <InfoField label="Engagement purpose" value={line.engagement_purpose} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Audience and location</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoField label="Planned target audience" value={plannedAudience(line)} />
          <InfoField label="Target audience reached" value={asText(line.target_audience_reached)} />
          <InfoField label="Programme supported" value={asText(line.programs_supported)} />
          <InfoField label="Location category" value={asText(line.location_category)} />
          <InfoField label="Location name" value={line.location_name} />
          <InfoField label="Specify location" value={line.location_specify} />
        </div>
      </div>

      {outcomes.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Outcomes</p>
          <div className="rounded-lg border border-[#d4e8dc] overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#eef6f1] hover:bg-[#eef6f1]">
                  <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Outcome category</TableHead>
                  <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Specific activity outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.map((o, i) => (
                  <TableRow key={`${o.outcome_category}-${o.specific_outcome}-${i}`}>
                    <TableCell className="text-sm">{o.outcome_category || "—"}</TableCell>
                    <TableCell className="text-sm">{o.specific_outcome || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Funding and evidence</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
        </div>
        <div className="mt-3 space-y-1">
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
      </div>

      {line.follow_up_required === "Yes" && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-2">Follow-up</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InfoField label="Visit date" value={line.follow_up_date} />
            <InfoField label="Priority" value={fu.priority} />
            <InfoField label="Status" value={fu.status} />
            <InfoField label="Action / purpose" value={fu.action} />
            <InfoField label="Responsible" value={fu.responsible} />
            <InfoField label="Activity conducted" value={fu.activity_conducted} />
            <InfoField label="Findings" value={fu.findings} />
            <InfoField label="Outstanding issues" value={fu.outstanding_issues} />
            <InfoField label="Further action" value={fu.further_action} />
          </div>
        </div>
      )}

      {line.remarks ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#0f3d2e] mb-1">Remarks</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{line.remarks}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function StakeholderReportDetail({ reportId, onBack, onEdit }: Props) {
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi.stakeholder.get(reportId);
        if (!cancelled) {
          setReport(res.data);
          setOpenKey(null);
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load report", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  const lines: any[] = report?.lines ?? [];
  const statusCfg = report ? STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG] : null;
  const period = report
    ? `${monthLabel(report.reporting_month)} ${report.reporting_year}`
    : "—";

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
          ) : (
            <>
              <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
                <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc]">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
                    Report Information
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Reporting period" value={period} />
                  <InfoField label="State" value={report.state?.description ?? "—"} />
                  <InfoField label="Reporting officer" value={report.submitted_by || "—"} />
                  <InfoField label="Reporting month" value={period} />
                </div>
              </section>

              <section className="rounded-2xl border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
                <div className="bg-[#e8f5ee] px-4 py-2.5 border-b border-[#d4e8dc] flex items-center justify-between gap-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">
                    Activity Register
                  </h3>
                  <p className="text-[11px] text-[#145c3f]">
                    {formatCount(lines.length)} activit{lines.length === 1 ? "y" : "ies"}
                    {report.submission_date ? ` · ${formatDate(report.submission_date)}` : ""}
                  </p>
                </div>

                {lines.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No activities recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f4f7f5] hover:bg-[#f4f7f5]">
                          {["Engagement ID", "Activity date", "Engagement category", "Programme supported", "Status", "Follow-up", ""].map((h) => (
                            <TableHead key={h || "action"} className="text-[11px] font-bold text-[#0f3d2e] whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((l, i) => {
                          const key = String(l.id ?? i);
                          const open = openKey === key;
                          const code = l.engagement_code || `ENG-${String(i + 1).padStart(3, "0")}`;
                          return (
                            <React.Fragment key={key}>
                              <TableRow
                                className={cn(
                                  "cursor-pointer hover:bg-[#f8fdfb]",
                                  open && "bg-[#f0faf4]",
                                )}
                                onClick={() => setOpenKey(open ? null : key)}
                              >
                                <TableCell className="text-xs font-mono font-semibold text-[#145c3f]">{code}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{l.activity_date || "—"}</TableCell>
                                <TableCell className="text-sm font-medium">{l.engagement_category || "—"}</TableCell>
                                <TableCell className="text-sm max-w-[14rem] truncate" title={asText(l.programs_supported)}>
                                  {asText(l.programs_supported)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{l.activity_status || "—"}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{l.follow_up_required || "—"}</TableCell>
                                <TableCell className="w-10">
                                  <ChevronDown className={cn(
                                    "w-4 h-4 text-[#145c3f] transition-transform",
                                    open && "rotate-180",
                                  )} />
                                </TableCell>
                              </TableRow>
                              {open && (
                                <TableRow className="hover:bg-transparent">
                                  <TableCell colSpan={7} className="p-0">
                                    <ActivityExpanded line={l} />
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
