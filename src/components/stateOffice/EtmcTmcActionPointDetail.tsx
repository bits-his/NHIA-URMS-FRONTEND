import * as React from "react";
import { ArrowLeft, Edit2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  ETMC_AGENDA_ITEMS, ETMC_DEPARTMENTS, ETMC_ACTION_STATUSES,
  monthLabel, labelOf, formatDate,
} from "./constants";

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api$/, "");

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

export default function EtmcTmcActionPointDetail({ reportId, onBack, onEdit }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["etmc-tmc-action-point"].get(reportId);
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
  const lines = data.lines ?? [];

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
                <CardTitle className="text-base">ETMC/TMC Action-Point Register</CardTitle>
                <Badge className={`text-[10px] px-2 py-0.5 border ${sc.cls}`}>{sc.label}</Badge>
              </div>
              <CardDescription className="font-mono text-xs font-bold text-primary">{data.reference_id}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Meeting Date</p>
                <p className="font-semibold">{formatDate(data.meeting_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">ETMC Session</p>
                <p className="font-semibold">{data.etmc_session || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Year / Month</p>
                <p className="font-semibold">{data.reporting_year} · {monthLabel(data.reporting_month)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Zone</p>
                <p className="font-semibold">{data.zone?.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">State</p>
                <p className="font-semibold">{data.state?.description ?? "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Source Document</p>
                {data.source_document_path ? (
                  <a
                    href={`${API_ORIGIN}${data.source_document_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    {data.source_document_name || "View document"}
                  </a>
                ) : (
                  <p className="font-semibold">—</p>
                )}
              </div>
            </CardContent>
          </Card>

          {(() => {
            const groups = new Map<string, any[]>();
            const order: string[] = [];
            for (const line of lines) {
              const key = String(line.resolution_id || "R01");
              if (!groups.has(key)) {
                order.push(key);
                groups.set(key, []);
              }
              groups.get(key)!.push(line);
            }
            return order.map((key) => {
              const group = groups.get(key)!;
              const head = group[0];
              return (
                <Card key={key} className="rounded-2xl border-[#d4e8dc]">
                  <CardHeader className="pb-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Resolution</p>
                    <CardTitle className="text-lg font-mono text-[#145c3f]">{head.resolution_id}</CardTitle>
                    <CardDescription>{labelOf(ETMC_AGENDA_ITEMS, head.agenda_item)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">Resolutions</p>
                      <p className="text-sm whitespace-pre-wrap">{head.resolutions || "—"}</p>
                    </div>
                    {group.map((l: any, i: number) => (
                      <div key={l.id ?? i} className="rounded-2xl border border-[#d4e8dc] bg-[#f8fdfb] p-4 space-y-3">
                        <p className="font-mono text-xs font-bold text-primary">{l.action_point_id}</p>
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">Action Point</p>
                          <p className="text-sm whitespace-pre-wrap">{l.action_point || "—"}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-0.5">Timeline</p>
                            <p className="font-semibold">{formatDate(l.timeline)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-0.5">Status / Updates</p>
                            <p className="font-semibold">{labelOf(ETMC_ACTION_STATUSES, l.status_update || "")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-0.5">Responsible</p>
                            <p className="font-semibold">{labelOf(ETMC_DEPARTMENTS, l.responsible_dept || "")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-semibold mb-0.5">Supporting</p>
                            <p className="font-semibold">{labelOf(ETMC_DEPARTMENTS, l.supporting_dept || "")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>
      </ScrollArea>
    </div>
  );
}
