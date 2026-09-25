import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "./StateOfficeFormShell";
import { CONTRACTED_SERVICES, MONTHS, labelOf, formatAmount } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface ContractedLine {
  _key: string;
  service: string;
  month: string;
  beneficiary: string;   // Contractor name
  amount: number;
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const blankEntry = () => ({
  service: "",
  month: "",
  beneficiary: "",
  amount: "",
});

export default function ContractedServicesForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<ContractedLine[]>([]);
  const [entry, setEntry] = React.useState(blankEntry());

  const loadData = (v: any) => {
    setLines(
      (v.lines ?? []).map((l: any) => ({
        _key:        uid(),
        service:     l.service      ?? "",
        month:       String(l.month ?? ""),
        beneficiary: l.beneficiary  ?? "",
        amount:      Number(l.amount) || 0,
      })),
    );
  };

  const totalAmount = React.useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
    [lines],
  );

  const monthLabel = (val: string) =>
    MONTHS.find(m => String(m.value) === String(val))?.label ?? val;

  const addLine = () => {
    if (!entry.service || !entry.month || !entry.beneficiary.trim()) return;
    setLines(prev => [
      ...prev,
      {
        _key:        uid(),
        service:     entry.service,
        month:       entry.month,
        beneficiary: entry.beneficiary.trim(),
        amount:      Number(entry.amount) || 0,
      },
    ]);
    setEntry(blankEntry());
  };

  const removeLine = (key: string) =>
    setLines(prev => prev.filter(l => l._key !== key));

  return (
    <StateOfficeFormShell
      reportType="contracted-services"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() =>
        lines.length === 0 ? "Add at least one contracted service entry" : null
      }
      buildPayload={(base) => ({
        ...base,
        lines: lines.map(({ _key, ...l }) => ({ ...l, amount: Number(l.amount) || 0 })),
      })}
    >
      {() => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contracted Services</CardTitle>
            <CardDescription>
              Record contracted services for the reporting period. Linked to States / Procurement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* ── Entry form ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              {/* Service */}
              <div className="space-y-1">
                <Label>Service <span className="text-red-500">*</span></Label>
                <Select value={entry.service} onValueChange={val => setEntry(v => ({ ...v, service: val }))}>
                  <SelectTrigger
                    displayValue={labelOf(CONTRACTED_SERVICES, entry.service, "Select Service")}
                  >
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTED_SERVICES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month */}
              <div className="space-y-1">
                <Label>Month <span className="text-red-500">*</span></Label>
                <Select value={entry.month} onValueChange={val => setEntry(v => ({ ...v, month: val }))}>
                  <SelectTrigger
                    displayValue={entry.month ? monthLabel(entry.month) : "Select Month"}
                  >
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Beneficiary / Contractor */}
              <div className="space-y-1">
                <Label>Beneficiary (Contractor) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Contractor name…"
                  value={entry.beneficiary}
                  onChange={e => setEntry(v => ({ ...v, beneficiary: e.target.value }))}
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label>Amount (NGN)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={entry.amount}
                  onChange={e => setEntry(v => ({ ...v, amount: e.target.value }))}
                />
              </div>

              {/* Add button */}
              <Button
                onClick={addLine}
                className="gap-2 bg-primary hover:bg-primary/90"
                disabled={!entry.service || !entry.month || !entry.beneficiary.trim()}
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            {/* ── Table ── */}
            {lines.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#d4e8dc]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      <TableHead className="text-xs font-bold w-8">#</TableHead>
                      <TableHead className="text-xs font-bold">Service</TableHead>
                      <TableHead className="text-xs font-bold">Month</TableHead>
                      <TableHead className="text-xs font-bold">Beneficiary (Contractor)</TableHead>
                      <TableHead className="text-xs font-bold text-right">Amount (NGN)</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((l, i) => (
                      <TableRow key={l._key} className="hover:bg-[#f8fdfb]">
                        <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {labelOf(CONTRACTED_SERVICES, l.service)}
                        </TableCell>
                        <TableCell className="text-sm">{monthLabel(l.month)}</TableCell>
                        <TableCell className="text-sm">{l.beneficiary}</TableCell>
                        <TableCell className="text-sm text-right tabular-nums font-semibold">
                          ₦{formatAmount(l.amount)}
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
                      <TableCell colSpan={4} className="text-sm text-right text-slate-600">
                        Total Amount (NGN)
                      </TableCell>
                      <TableCell className="text-sm text-right text-primary tabular-nums">
                        ₦{formatAmount(totalAmount)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
