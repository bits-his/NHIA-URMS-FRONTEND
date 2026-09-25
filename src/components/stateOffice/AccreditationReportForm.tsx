import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  ACCREDITATION_PROCESS_TYPES, ACCREDITATION_ENTRY_TYPES,
  collapseAccreditationRows, expandAccreditationLines, accreditationRowKey,
  labelOf, formatCount,
} from "./constants";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface TableRow {
  _key: string;
  process: string;
  entry: string;
  primary_count: number;
  secondary_count: number;
}

const uid = () => Math.random().toString(36).slice(2);

export default function AccreditationReportForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<TableRow[]>([]);
  const [process, setProcess] = React.useState("");
  const [entry, setEntry] = React.useState("");
  const [primaryCount, setPrimaryCount] = React.useState("");
  const [secondaryCount, setSecondaryCount] = React.useState("");

  const loadData = (v: any) => {
    setLines(expandAccreditationLines(v.lines ?? []).map((r) => ({
      _key: uid(),
      process: r.process,
      entry: r.entry,
      primary_count: r.primary_count,
      secondary_count: r.secondary_count,
    })));
  };

  const addRow = () => {
    if (!process || !entry) {
      toast.error("Select accreditation type and category.");
      return;
    }
    const primary = Number(primaryCount) || 0;
    const secondary = Number(secondaryCount) || 0;
    if (primary === 0 && secondary === 0) {
      toast.error("Enter at least one count for Primary or Secondary.");
      return;
    }
    const key = accreditationRowKey(process, entry);
    if (lines.some((l) => accreditationRowKey(l.process, l.entry) === key)) {
      toast.error("This combination is already in the table. Remove it first to change the values.");
      return;
    }
    setLines((p) => [...p, { _key: uid(), process, entry, primary_count: primary, secondary_count: secondary }]);
    setPrimaryCount("");
    setSecondaryCount("");
  };

  const grandTotal = lines.reduce((s, r) => s + r.primary_count + r.secondary_count, 0);

  return (
    <StateOfficeFormShell
      reportType="accreditation" reportId={reportId} onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId} defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() => (lines.length === 0 ? "Add at least one accreditation entry to the table." : null)}
      buildPayload={(base) => ({
        ...base,
        lines: collapseAccreditationRows(lines.map(({ process, entry, primary_count, secondary_count }) => ({
          process: process as any,
          entry: entry as any,
          primary_count,
          secondary_count,
        }))),
      })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accreditation / Reaccreditation</CardTitle>
            <CardDescription>
              Select type and category, enter Primary and Secondary counts, then add to the table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Accreditation / Reaccreditation</Label>
                <Select value={process} onValueChange={setProcess}>
                  <SelectTrigger displayValue={labelOf(ACCREDITATION_PROCESS_TYPES, process, "Select")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCREDITATION_PROCESS_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={entry} onValueChange={setEntry}>
                  <SelectTrigger displayValue={labelOf(ACCREDITATION_ENTRY_TYPES, entry, "Select")}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCREDITATION_ENTRY_TYPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Primary</Label>
                <Input type="number" min="0" placeholder="0" value={primaryCount} onChange={(e) => setPrimaryCount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Secondary</Label>
                <Input type="number" min="0" placeholder="0" value={secondaryCount} onChange={(e) => setSecondaryCount(e.target.value)} />
              </div>
              <Button type="button" onClick={addRow} className="gap-2 bg-orange-action hover:bg-orange-600">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#d4e8dc]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7]">
                    <TableHead className="text-xs font-bold">Accreditation / Reaccreditation</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold text-center">Primary</TableHead>
                    <TableHead className="text-xs font-bold text-center">Secondary</TableHead>
                    <TableHead className="text-xs font-bold text-center">Total</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        No entries yet. Use the selectors above and click Add.
                      </TableCell>
                    </TableRow>
                  ) : lines.map((r) => {
                    const total = r.primary_count + r.secondary_count;
                    return (
                      <TableRow key={r._key}>
                        <TableCell className="text-sm">{labelOf(ACCREDITATION_PROCESS_TYPES, r.process, r.process)}</TableCell>
                        <TableCell className="text-sm">{labelOf(ACCREDITATION_ENTRY_TYPES, r.entry, r.entry)}</TableCell>
                        <TableCell className="text-center tabular-nums">{formatCount(r.primary_count)}</TableCell>
                        <TableCell className="text-center tabular-nums">{formatCount(r.secondary_count)}</TableCell>
                        <TableCell className="text-center font-semibold tabular-nums">{formatCount(total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500"
                            onClick={() => setLines((p) => p.filter((x) => x._key !== r._key))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lines.length > 0 && (
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={4} className="text-right">Grand Total</TableCell>
                      <TableCell className="text-center text-primary tabular-nums">{formatCount(grandTotal)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
