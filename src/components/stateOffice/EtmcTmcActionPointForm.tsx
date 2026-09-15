import * as React from "react";
import { Plus, Trash2, FileUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { stateOfficeApi } from "@/lib/api";
import {
  ETMC_SESSIONS, ETMC_AGENDA_ITEMS, ETMC_DEPARTMENTS, ETMC_ACTION_STATUSES, labelOf,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);
const pad = (n: number) => String(n).padStart(2, "0");
const resId = (seq: number) => `R${pad(seq)}`;
const apId = (resSeq: number, apSeq: number) => `${resId(resSeq)}-AP${pad(apSeq)}`;

interface Line {
  _key: string;
  resolution_seq: number;
  action_seq: number;
  agenda_item: string;
  resolutions: string;
  action_point: string;
  timeline: string;
  responsible_dept: string;
  supporting_dept: string;
  status_update: string;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

function firstRow(): Line {
  return {
    _key: uid(),
    resolution_seq: 1,
    action_seq: 1,
    agenda_item: "",
    resolutions: "",
    action_point: "",
    timeline: "",
    responsible_dept: "",
    supporting_dept: "",
    status_update: "",
  };
}

function sessionFromMonth(month: number) {
  return `Q${Math.ceil((month || 1) / 3)}`;
}

export default function EtmcTmcActionPointForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [meetingDate, setMeetingDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [session, setSession] = React.useState(sessionFromMonth(new Date().getMonth() + 1));
  const [lines, setLines] = React.useState<Line[]>([firstRow()]);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [existingDoc, setExistingDoc] = React.useState<string | null>(null);

  const loadData = (v: any) => {
    if (v.meeting_date) setMeetingDate(String(v.meeting_date).slice(0, 10));
    if (v.etmc_session) setSession(v.etmc_session);
    setExistingDoc(v.source_document_name || null);
    const loaded = (v.lines ?? []).map((l: any, i: number) => {
      const rMatch = String(l.resolution_id || "").match(/R(\d+)/i);
      const aMatch = String(l.action_point_id || "").match(/AP(\d+)/i);
      return {
        _key: uid(),
        resolution_seq: rMatch ? Number(rMatch[1]) : i + 1,
        action_seq: aMatch ? Number(aMatch[1]) : 1,
        agenda_item: l.agenda_item ?? "",
        resolutions: l.resolutions ?? "",
        action_point: l.action_point ?? "",
        timeline: l.timeline ? String(l.timeline).slice(0, 10) : "",
        responsible_dept: l.responsible_dept ?? "",
        supporting_dept: l.supporting_dept ?? "",
        status_update: l.status_update ?? "",
      } as Line;
    });
    setLines(loaded.length ? loaded : [firstRow()]);
  };

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  };

  const addActionPoint = () => {
    setLines((prev) => {
      const last = prev[prev.length - 1];
      const resSeq = last?.resolution_seq ?? 1;
      const nextAp = prev.filter((l) => l.resolution_seq === resSeq).reduce((m, l) => Math.max(m, l.action_seq), 0) + 1;
      return [...prev, {
        ...firstRow(),
        resolution_seq: resSeq,
        action_seq: nextAp,
        agenda_item: last?.agenda_item ?? "",
        resolutions: last?.resolutions ?? "",
      }];
    });
  };

  const addResolution = () => {
    setLines((prev) => {
      const nextRes = prev.reduce((m, l) => Math.max(m, l.resolution_seq), 0) + 1;
      return [...prev, { ...firstRow(), resolution_seq: nextRes, action_seq: 1 }];
    });
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l._key !== key)));
  };

  const afterPersist = async ({ id }: { id: number }) => {
    if (!pendingFile) return;
    await stateOfficeApi["etmc-tmc-action-point"].uploadDocument(id, pendingFile);
    setPendingFile(null);
  };

  const cellSelect = "h-9 w-full min-w-[140px]";
  const cellArea = "min-h-[52px] w-full min-w-[160px] rounded-xl border-2 border-[#1a7a52] bg-[#f4f7f5] px-2 py-1.5 text-sm outline-none focus-visible:bg-white";

  return (
    <StateOfficeFormShell
      reportType="etmc-tmc-action-point"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={loadData}
      afterPersist={afterPersist}
      validate={() => {
        if (!meetingDate) return "Enter the ETMC meeting date";
        if (!session) return "Select the ETMC session";
        const filled = lines.filter((l) => l.action_point.trim() || l.resolutions.trim());
        if (!filled.length) return "Add at least one resolution / action point";
        if (filled.some((l) => !l.agenda_item || !l.resolutions.trim() || !l.action_point.trim())) {
          return "Each row needs an agenda item, resolution and action point";
        }
        return null;
      }}
      buildPayload={(base) => ({
        ...base,
        meeting_date: meetingDate || null,
        etmc_session: session,
        lines: lines
          .filter((l) => l.action_point.trim() || l.resolutions.trim())
          .map((l, i) => ({
            sn: i + 1,
            agenda_item: l.agenda_item,
            resolution_id: resId(l.resolution_seq),
            resolutions: l.resolutions,
            action_point_id: apId(l.resolution_seq, l.action_seq),
            action_point: l.action_point,
            timeline: l.timeline || null,
            responsible_dept: l.responsible_dept || null,
            supporting_dept: l.supporting_dept || null,
            status_update: l.status_update || null,
          })),
      })}
    >
      {() => (
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-[#145c3f]">ETMC/TMC Action-Point Register</CardTitle>
              <CardDescription>
                Track the actual implementation of decisions and actions for states and zones agreed upon at ETMC/TMC.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>ETMC Meeting Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ETMC Session <span className="text-red-500">*</span></Label>
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger className="w-full" displayValue={session || "Select"}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETMC_SESSIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source Document</Label>
                <label className="flex h-11 items-center gap-2 rounded-xl border-2 border-[#1a7a52] bg-[#f4f7f5] px-3 text-sm cursor-pointer hover:bg-white">
                  <FileUp className="w-4 h-4 text-slate-400" />
                  <span className="truncate text-slate-600">
                    {pendingFile?.name || existingDoc || "Choose file / Upload"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d4e8dc] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#145c3f] hover:bg-[#145c3f]">
                    {[
                      "S/N", "ETMC Agenda Item", "Resolution ID", "Resolutions",
                      "Action Point ID", "Action Point", "Timeline",
                      "Responsible Department / Office", "Supporting Department / Office",
                      "Status / Updates", "",
                    ].map((h) => (
                      <TableHead key={h} className="text-white text-[11px] font-bold whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => (
                    <TableRow key={line._key} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                      <TableCell className="text-sm font-semibold tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <Select value={line.agenda_item} onValueChange={(v) => updateLine(line._key, { agenda_item: v })}>
                          <SelectTrigger className={cellSelect} displayValue={labelOf(ETMC_AGENDA_ITEMS, line.agenda_item, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ETMC_AGENDA_ITEMS.map((a) => (
                              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                        {resId(line.resolution_seq)}
                      </TableCell>
                      <TableCell>
                        <textarea
                          className={cellArea}
                          placeholder="Resolution"
                          value={line.resolutions}
                          onChange={(e) => updateLine(line._key, { resolutions: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                        {apId(line.resolution_seq, line.action_seq)}
                      </TableCell>
                      <TableCell>
                        <textarea
                          className={cellArea}
                          placeholder="Action point"
                          value={line.action_point}
                          onChange={(e) => updateLine(line._key, { action_point: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="date" className="h-9 min-w-[140px]" value={line.timeline} onChange={(e) => updateLine(line._key, { timeline: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Select value={line.responsible_dept} onValueChange={(v) => updateLine(line._key, { responsible_dept: v })}>
                          <SelectTrigger className={cellSelect} displayValue={labelOf(ETMC_DEPARTMENTS, line.responsible_dept, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ETMC_DEPARTMENTS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.supporting_dept} onValueChange={(v) => updateLine(line._key, { supporting_dept: v })}>
                          <SelectTrigger className={cellSelect} displayValue={labelOf(ETMC_DEPARTMENTS, line.supporting_dept, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ETMC_DEPARTMENTS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={line.status_update} onValueChange={(v) => updateLine(line._key, { status_update: v })}>
                          <SelectTrigger className={cellSelect} displayValue={labelOf(ETMC_ACTION_STATUSES, line.status_update, "Select")}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {ETMC_ACTION_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => removeLine(line._key)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CardContent className="pt-3 pb-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addActionPoint}>
                <Plus className="w-4 h-4" /> Add action point
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1 text-[#145c3f]" onClick={addResolution}>
                <Plus className="w-4 h-4" /> New resolution
              </Button>
              <p className="text-[11px] text-slate-500 w-full">
                Resolution IDs are auto-generated (R01, R02…). Extra actions under the same resolution keep that ID and add AP01, AP02.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
