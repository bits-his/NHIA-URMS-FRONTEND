import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { formatCount } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function StakeholderReportForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<any[]>([]);
  const [entry, setEntry] = React.useState({
    activity: "", audience_size: "", organization: "", location: "", activity_date: "", key_outcomes: "",
  });

  const loadData = (v: any) => {
    setLines((v.lines ?? []).map((l: any) => ({
      _key: uid(), activity: l.activity, audience_size: Number(l.audience_size) || 0,
      organization: l.organization ?? "", location: l.location ?? "",
      activity_date: l.activity_date?.slice?.(0, 10) ?? l.activity_date ?? "",
      key_outcomes: l.key_outcomes ?? "",
    })));
  };

  const addLine = () => {
    if (!entry.activity.trim()) return;
    setLines(p => [...p, { _key: uid(), ...entry, audience_size: Number(entry.audience_size) || 0 }]);
    setEntry({ activity: "", audience_size: "", organization: "", location: "", activity_date: "", key_outcomes: "" });
  };

  return (
    <StateOfficeFormShell
      reportType="stakeholder" reportId={reportId} onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId} defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() => (lines.length === 0 ? "Add at least one activity" : null)}
      buildPayload={(base) => ({ ...base, lines: lines.map(({ _key, ...l }) => l) })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stakeholder Engagement</CardTitle>
            <CardDescription>Add engagement activities and outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1"><Label>Activity</Label><Input value={entry.activity} onChange={e => setEntry(v => ({ ...v, activity: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Audience Size</Label><Input type="number" min="0" value={entry.audience_size} onChange={e => setEntry(v => ({ ...v, audience_size: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Organization/MDA</Label><Input value={entry.organization} onChange={e => setEntry(v => ({ ...v, organization: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Location</Label><Input value={entry.location} onChange={e => setEntry(v => ({ ...v, location: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={entry.activity_date} onChange={e => setEntry(v => ({ ...v, activity_date: e.target.value }))} /></div>
              <Button onClick={addLine} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <div className="space-y-1"><Label>Key Outcomes</Label><Input value={entry.key_outcomes} onChange={e => setEntry(v => ({ ...v, key_outcomes: e.target.value }))} /></div>
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7]">
                    {["Activity", "Audience", "Organization", "Location", "Date", "Outcomes", ""].map(h => (
                      <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(l => (
                    <TableRow key={l._key}>
                      <TableCell className="text-sm">{l.activity}</TableCell>
                      <TableCell className="text-sm tabular-nums">{formatCount(l.audience_size)}</TableCell>
                      <TableCell className="text-sm">{l.organization || "—"}</TableCell>
                      <TableCell className="text-sm">{l.location || "—"}</TableCell>
                      <TableCell className="text-sm">{l.activity_date || "—"}</TableCell>
                      <TableCell className="text-sm">{l.key_outcomes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500"
                          onClick={() => setLines(p => p.filter(x => x._key !== l._key))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
