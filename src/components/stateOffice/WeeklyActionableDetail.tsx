import * as React from "react";
import { ArrowLeft, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { stateOfficeApi } from "@/lib/api";
import {
  ACTIONABLE_CATEGORIES, ACTIONABLE_IMPACTS, ACTIONABLE_STATUSES,
  monthLabel, labelOf, formatDate,
} from "./constants";

const USER_DEPARTMENTS = [
  { value: "DG",             label: "DG Office"                       },
  { value: "Finance",        label: "Finance & Admin"                  },
  { value: "Programmes",     label: "Programmes"                       },
  { value: "SQA",            label: "Standards & Quality Assurance"   },
  { value: "ICT",            label: "ICT Support"                      },
  { value: "SOC",            label: "State Office Coordination (SOC)"  },
  { value: "Audit",          label: "Audit & Compliance"               },
  { value: "Legal",          label: "Legal Services"                   },
  { value: "HR",             label: "Human Resources"                  },
  { value: "Planning",       label: "Planning & Research"              },
  { value: "Communications", label: "Communications"                   },
  { value: "Special Projects",label: "Special Projects"                },
  { value: "Zonal",          label: "Zonal Office"                     },
  { value: "State",          label: "State Office"                     },
];

const STATUS_BADGE: Record<string, string> = {
  escalated:             "bg-rose-100 text-rose-700 border-rose-200",
  awaiting_further_info: "bg-amber-100 text-amber-700 border-amber-200",
  awaiting_response:     "bg-blue-100 text-blue-700 border-blue-200",
  resolved:              "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const PRIORITY_BADGE: Record<string, string> = {
  "P1 (High – DG attention)": "bg-rose-100 text-rose-700 border-rose-200",
  "P2 (Medium – Depts)":      "bg-amber-100 text-amber-700 border-amber-200",
  "P3 (Low – Zone/State)":    "bg-blue-100 text-blue-700 border-blue-200",
};

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-200"       },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-700 border-blue-200"          },
  approved:  { label: "Approved",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

interface Props {
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}

export default function WeeklyActionableDetail({ reportId, onBack, onEdit }: Props) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await stateOfficeApi["weekly-actionable"].get(reportId);
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
  const lines: any[] = data.lines ?? [];

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
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

          {/* Meta */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Zone</p>
                <p className="font-semibold">{data.zone?.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">State</p>
                <p className="font-semibold">{data.state?.description ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Period</p>
                <p className="font-semibold">{monthLabel(data.reporting_month)} {data.reporting_year}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Week</p>
                <p className="font-semibold">
                  {data.reporting_week
                    ? `Week ${data.reporting_week}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Status</p>
                <Badge className={`text-[10px] border ${sc.cls}`}>{sc.label}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Submitted By</p>
                <p>{data.submitted_by ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Submission Date</p>
                <p>{formatDate(data.submission_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold mb-0.5">Total Items</p>
                <p className="font-bold text-primary">{lines.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Lines table */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actionable Points</CardTitle>
              <CardDescription>{lines.length} item{lines.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {lines.length === 0 ? (
                <p className="text-sm text-slate-400 px-6 py-8 text-center">No entries recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold w-8">#</TableHead>
                        <TableHead className="text-xs font-bold min-w-[200px]">Issue / Request</TableHead>
                        <TableHead className="text-xs font-bold">Category</TableHead>
                        <TableHead className="text-xs font-bold">Impact</TableHead>
                        <TableHead className="text-xs font-bold">Urgency</TableHead>
                        <TableHead className="text-xs font-bold">User Department</TableHead>
                        <TableHead className="text-xs font-bold">Priority Level</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={i} className="hover:bg-[#f8fdfb]">
                          <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{l.issue_request}</TableCell>
                          <TableCell className="text-sm capitalize">{labelOf(ACTIONABLE_CATEGORIES, l.category)}</TableCell>
                          <TableCell className="text-sm capitalize">{labelOf(ACTIONABLE_IMPACTS, l.impact)}</TableCell>
                          <TableCell className="text-sm capitalize">{labelOf(ACTIONABLE_IMPACTS, l.urgency)}</TableCell>
                          <TableCell className="text-sm">
                            {USER_DEPARTMENTS.find(d => d.value === l.user_department)?.label ?? l.user_department}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] border px-2 py-0.5 whitespace-nowrap ${PRIORITY_BADGE[l.priority_level] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {l.priority_level || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] border px-2 py-0.5 whitespace-nowrap ${STATUS_BADGE[l.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                              {labelOf(ACTIONABLE_STATUSES, l.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
