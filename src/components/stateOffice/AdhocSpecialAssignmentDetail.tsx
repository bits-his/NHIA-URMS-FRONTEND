import * as React from "react";
import { ArrowLeft, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  ADHOC_ASSIGNMENT_STATUSES,
  ADHOC_SUPPORT_REQUIRED,
  ADHOC_RESPONSIBLE_UNITS,
  labelOf,
  formatDate,
  monthLabel,
  quarterFromMonth,
} from "./constants";

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const STATUS_BADGE: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  awaiting_support: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  deferred: "bg-violet-100 text-violet-700 border-violet-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value?: React.ReactNode;
  full?: boolean;
}) {
  const empty = value == null || value === "";
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <div className={`text-sm mt-0.5 leading-snug ${empty ? "text-slate-300" : "font-semibold text-slate-900"}`}>
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-[#d4e8dc] shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b bg-[#f8fbf9]">
        <CardTitle className="text-sm font-bold text-[#145c3f]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 pb-5">{children}</CardContent>
    </Card>
  );
}

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

export default function AdhocSpecialAssignmentDetail({ reportId, onBack, onEdit }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["adhoc-special-assignment"].get(reportId);
        if (!cancelled) setData(res.data);
      } catch (err: any) {
        if (!cancelled) toast.error("Failed to load", { description: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!data) return null;

  const sc = REPORT_STATUS[data.status as string] ?? REPORT_STATUS.draft;
  const line = (data.lines ?? [])[0] ?? {};
  const periodLabel = `${monthLabel(data.reporting_month)} ${data.reporting_year} · Q${quarterFromMonth(data.reporting_month)}`;

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-[#e8f5ee] shrink-0"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">Ad-hoc / Special Assignment</h2>
            <p className="text-xs text-slate-500 truncate">
              {[
                data.reference_id,
                data.zone?.description,
                data.state?.description,
                periodLabel,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-[10px] border ${sc.cls}`}>{sc.label}</Badge>
          {onEdit && data.status !== "approved" && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          <SectionCard title="Period">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
              <Field label="Zone" value={data.zone?.description} />
              <Field label="State" value={data.state?.description} />
              <Field label="Year" value={data.reporting_year} />
              <Field label="Month" value={monthLabel(data.reporting_month)} />
              <Field label="Quarter" value={`Q${quarterFromMonth(data.reporting_month)}`} />
            </div>
          </SectionCard>

          <SectionCard title="Assignment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <Field label="Assignment ID" value={line.assignment_id} />
              <Field label="Date Assigned" value={formatDate(line.date_assigned)} />
              <Field label="Due Date" value={formatDate(line.due_date)} />
              <Field label="Assignment Title" value={line.assignment_title} />
              <Field label="Assigned By" value={line.assigned_by} />
              <Field label="Responsible Unit / Officer" value={labelOf(ADHOC_RESPONSIBLE_UNITS, line.responsible_unit)} />
              <Field
                label="Status"
                value={line.assignment_status ? (
                  <Badge className={`text-[10px] border ${STATUS_BADGE[line.assignment_status] ?? ""}`}>
                    {labelOf(ADHOC_ASSIGNMENT_STATUSES, line.assignment_status)}
                  </Badge>
                ) : null}
              />
              <Field label="Supporting Staff / Units" value={line.supporting_staff} />
              <Field label="Expected Output" value={line.expected_output} />
              <Field label="Assignment Description" value={line.assignment_description} full />
            </div>
          </SectionCard>

          <SectionCard title="Completion & Outcomes">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <Field label="Date Completed" value={formatDate(line.date_completed)} />
              <Field label="Support Required" value={labelOf(ADHOC_SUPPORT_REQUIRED, line.support_required)} />
              <Field label="Evidence" value={line.evidence} />
              <Field label="Output / Outcome Achieved" value={line.output_achieved} full />
              <Field label="Challenges" value={line.challenges} full />
              <Field label="Remarks" value={line.remarks} full />
            </div>
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
}
