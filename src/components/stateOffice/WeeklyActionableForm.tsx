import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  ACTIONABLE_CATEGORIES,
  ACTIONABLE_IMPACTS,
  ACTIONABLE_STATUSES,
  derivePriority,
  labelOf,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);

// All NHIA departments + DG for the "User Department" dropdown
const USER_DEPARTMENTS = [
  { value: "DG",              label: "DG Office"                       },
  { value: "Finance",         label: "Finance & Admin"                  },
  { value: "Programmes",      label: "Programmes"                       },
  { value: "SQA",             label: "Standards & Quality Assurance"   },
  { value: "ICT",             label: "ICT Support"                      },
  { value: "SOC",             label: "State Office Coordination (SOC)"  },
  { value: "Audit",           label: "Audit & Compliance"               },
  { value: "Legal",           label: "Legal Services"                   },
  { value: "HR",              label: "Human Resources"                  },
  { value: "Planning",        label: "Planning & Research"              },
  { value: "Communications",  label: "Communications"                   },
  { value: "Special Projects",label: "Special Projects"                 },
  { value: "Zonal",           label: "Zonal Office"                     },
  { value: "State",           label: "State Office"                     },
];

// Every month has 4 weeks — week options live in ReportBasicInfo
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

interface ActionableLine {
  _key: string;
  issue_request: string;
  category: string;
  impact: string;
  urgency: string;
  user_department: string;
  priority_level: string;
  status: string;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const blankEntry = (): Omit<ActionableLine, "_key" | "priority_level"> => ({
  issue_request: "",
  category: "",
  impact: "",
  urgency: "",
  user_department: "",
  status: "",
});

export default function WeeklyActionableForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<ActionableLine[]>([]);
  const [entry, setEntry] = React.useState(blankEntry());
  const [reportingWeek, setReportingWeek] = React.useState("1");

  // Priority auto-derived from selected department
  const derivedPriority = React.useMemo(
    () => (entry.user_department ? derivePriority(entry.user_department) : ""),
    [entry.user_department],
  );

  const loadData = (v: any) => {
    if (v.reporting_week) setReportingWeek(String(v.reporting_week));
    setLines(
      (v.lines ?? []).map((l: any) => ({
        _key:            uid(),
        issue_request:   l.issue_request   ?? "",
        category:        l.category        ?? "",
        impact:          l.impact          ?? "",
        urgency:         l.urgency         ?? "",
        user_department: l.user_department ?? "",
        priority_level:  l.priority_level  ?? "",
        status:          l.status          ?? "",
      })),
    );
  };

  const addLine = () => {
    if (!entry.issue_request.trim()) return;
    if (!entry.category || !entry.impact || !entry.urgency || !entry.user_department || !entry.status) return;
    setLines(prev => [...prev, { _key: uid(), ...entry, priority_level: derivedPriority }]);
    setEntry(blankEntry());
  };

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l._key !== key));

  return (
    <StateOfficeFormShell
      reportType="weekly-actionable"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={loadData}
      reportWeek={reportingWeek}
      setReportWeek={setReportingWeek}
      validate={() => lines.length === 0 ? "Add at least one actionable item" : null}
      buildPayload={(base) => ({
        ...base,
        reporting_week: Number(reportingWeek) || 1,
        lines: lines.map(({ _key, ...l }) => l),
      })}
    >
      {() => (
        <div className="space-y-4">
          {/* ── Actionable items ── */}
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-[#145c3f]">Actionable Points</CardTitle>
           
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Entry fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                {/* Issue / Request — full width */}
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <Label>Issue / Request <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Describe the issue or request…"
                    value={entry.issue_request}
                    onChange={e => setEntry(v => ({ ...v, issue_request: e.target.value }))}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label>Category <span className="text-red-500">*</span></Label>
                  <Select value={entry.category} onValueChange={val => setEntry(v => ({ ...v, category: val }))}>
                    <SelectTrigger displayValue={labelOf(ACTIONABLE_CATEGORIES, entry.category, "Select Category")}>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONABLE_CATEGORIES.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Impact */}
                <div className="space-y-1">
                  <Label>Impact <span className="text-red-500">*</span></Label>
                  <Select value={entry.impact} onValueChange={val => setEntry(v => ({ ...v, impact: val }))}>
                    <SelectTrigger displayValue={labelOf(ACTIONABLE_IMPACTS, entry.impact, "Select Impact")}>
                      <SelectValue placeholder="Select Impact" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONABLE_IMPACTS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgency */}
                <div className="space-y-1">
                  <Label>Urgency <span className="text-red-500">*</span></Label>
                  <Select value={entry.urgency} onValueChange={val => setEntry(v => ({ ...v, urgency: val }))}>
                    <SelectTrigger displayValue={labelOf(ACTIONABLE_IMPACTS, entry.urgency, "Select Urgency")}>
                      <SelectValue placeholder="Select Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONABLE_IMPACTS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Department */}
                <div className="space-y-1">
                  <Label>User Department <span className="text-red-500">*</span></Label>
                  <Select
                    value={entry.user_department}
                    onValueChange={val => setEntry(v => ({ ...v, user_department: val }))}
                  >
                    <SelectTrigger
                      displayValue={
                        USER_DEPARTMENTS.find(d => d.value === entry.user_department)?.label
                        ?? "Select Department"
                      }
                    >
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_DEPARTMENTS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority — read-only, auto */}
                <div className="space-y-1">
                  <Label>
                    Priority Level{" "}
                    <span className="text-[10px] font-normal text-slate-400">(auto-populated)</span>
                  </Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-input bg-slate-50 text-sm text-slate-600">
                    {derivedPriority
                      ? <span className={`font-semibold ${
                          derivedPriority.startsWith("P1") ? "text-rose-600"
                          : derivedPriority.startsWith("P3") ? "text-blue-600"
                          : "text-amber-600"
                        }`}>{derivedPriority}</span>
                      : <span className="text-slate-400 italic">Select department first</span>
                    }
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label>Status <span className="text-red-500">*</span></Label>
                  <Select value={entry.status} onValueChange={val => setEntry(v => ({ ...v, status: val }))}>
                    <SelectTrigger displayValue={labelOf(ACTIONABLE_STATUSES, entry.status, "Select Status")}>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONABLE_STATUSES.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={addLine}
                className="gap-2 bg-primary hover:bg-primary/90 w-full md:w-auto"
                disabled={
                  !entry.issue_request.trim() ||
                  !entry.category ||
                  !entry.impact ||
                  !entry.urgency ||
                  !entry.user_department ||
                  !entry.status
                }
              >
                <Plus className="w-4 h-4" /> Add to Table
              </Button>

              {/* Items table */}
              {lines.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[#d4e8dc]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                        <TableHead className="text-xs font-bold w-8">#</TableHead>
                        <TableHead className="text-xs font-bold min-w-[200px]">Issue / Request</TableHead>
                        <TableHead className="text-xs font-bold">Category</TableHead>
                        <TableHead className="text-xs font-bold">Impact</TableHead>
                        <TableHead className="text-xs font-bold">Urgency</TableHead>
                        <TableHead className="text-xs font-bold">User Dept</TableHead>
                        <TableHead className="text-xs font-bold">Priority</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={l._key} className="hover:bg-[#f8fdfb]">
                          <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{l.issue_request}</TableCell>
                          <TableCell className="text-sm">{labelOf(ACTIONABLE_CATEGORIES, l.category)}</TableCell>
                          <TableCell className="text-sm capitalize">{labelOf(ACTIONABLE_IMPACTS, l.impact)}</TableCell>
                          <TableCell className="text-sm capitalize">{labelOf(ACTIONABLE_IMPACTS, l.urgency)}</TableCell>
                          <TableCell className="text-sm text-slate-600">
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
                          <TableCell>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                              onClick={() => removeLine(l._key)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 border-t-2 border-[#d4e8dc] font-bold">
                        <TableCell colSpan={7} className="text-sm text-right text-slate-600">Total Items</TableCell>
                        <TableCell className="text-sm text-primary">{lines.length}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
