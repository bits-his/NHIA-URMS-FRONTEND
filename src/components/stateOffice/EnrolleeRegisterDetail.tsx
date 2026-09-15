import * as React from "react";
import { ArrowLeft, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import { ENROLLEE_REGISTER_SCHEMES, monthLabel, formatCount, formatDate } from "./constants";

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

export default function EnrolleeRegisterDetail({ reportId, onBack, onEdit }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["enrollee-register"].get(reportId);
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

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {onEdit && data.status !== "approved" && (
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4 pb-8">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Monthly Enrollee Register (ICT)</CardTitle>
                <Badge className={`text-[10px] px-2 py-0.5 border ${sc.cls}`}>{sc.label}</Badge>
              </div>
              <p className="font-mono text-xs font-bold text-primary">{data.reference_id}</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Year</p>
                <p className="font-semibold">{data.reporting_year}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Month</p>
                <p className="font-semibold">{monthLabel(data.reporting_month)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Zone ID</p>
                <p className="font-semibold tabular-nums">{data.zone_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Zone</p>
                <p className="font-semibold">{data.zone?.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">State ID</p>
                <p className="font-semibold tabular-nums">{data.state_id ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">State</p>
                <p className="font-semibold">{data.state?.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Submitted By</p>
                <p className="font-semibold">{data.submitted_by || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Date Submitted</p>
                <p className="font-semibold">{formatDate(data.submission_date)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ENROLLEE_REGISTER_SCHEMES.map((scheme) => (
              <Card key={scheme.key} className="rounded-2xl border-[#d4e8dc]">
                <CardContent className="pt-4 pb-4">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{scheme.label}</p>
                  <p className="text-2xl font-black tabular-nums text-[#145c3f] mt-1">
                    {formatCount(data[scheme.key] ?? 0)}
                  </p>
                </CardContent>
              </Card>
            ))}
            <Card className="rounded-2xl border-[#145c3f] bg-[#145c3f] text-white md:col-span-3">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-white/70 font-semibold">Total Lives</p>
                <p className="text-3xl font-black tabular-nums">{formatCount(data.total_lives ?? 0)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
