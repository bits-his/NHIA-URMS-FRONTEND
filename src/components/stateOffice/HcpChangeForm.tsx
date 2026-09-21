import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { stateOfficeAccreditedProvidersApi } from "@/lib/api";
import { toast } from "sonner";
import StateOfficeFormShell from "./StateOfficeFormShell";
import {
  YES_NO_OPTIONS,
  HCP_CHANGE_CHANNELS,
  HCP_CHANGE_STATUSES,
  labelOf,
} from "./constants";

const uid = () => Math.random().toString(36).slice(2);

const blank = () => ({
  record_date: "",
  enrollee_name: "",
  nhia_number: "",
  current_hcp_hmo: "",
  new_hcp_hmo: "",
  reason_for_transfer: "",
  met_criteria: "",
  request_channel: "",
  request_date: "",
  process_end_date: "",
  line_status: "pending",
});

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

function HcpHmoSelect({
  label, stateId, value, onChange,
}: {
  label: string;
  stateId: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const [options, setOptions] = React.useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = React.useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [hmos, hcps] = await Promise.all([
        stateOfficeAccreditedProvidersApi.list({ type: "hmo", q: q?.trim() || undefined, limit: "100" }),
        stateId
          ? stateOfficeAccreditedProvidersApi.list({ type: "hcp", state_id: stateId, q: q?.trim() || undefined, limit: "200" })
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const mapped: SearchSelectOption[] = [
        ...hmos.data.map((p: any) => ({
          value: `hmo:${p.id}`,
          label: p.name,
          sub: "HMO",
        })),
        ...hcps.data.map((p: any) => ({
          value: `hcp:${p.id}`,
          label: p.name,
          sub: "HCP",
        })),
      ];
      setOptions(mapped);
    } catch (err: any) {
      setOptions([]);
      toast.error("Failed to load HCP/HMO list", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [stateId]);

  React.useEffect(() => { load(); }, [load]);

  const displayOptions = React.useMemo(() => {
    if (value && !options.some((o) => o.label === value)) {
      return [{ value: `saved:${value}`, label: value, sub: "Saved" }, ...options];
    }
    return options;
  }, [options, value]);

  const selectedValue = displayOptions.find((o) => o.label === value)?.value ?? "";

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <SearchSelect
        options={displayOptions}
        value={selectedValue}
        onChange={(id) => {
          if (!id) { onChange(""); return; }
          const opt = displayOptions.find((o) => o.value === id);
          onChange(opt?.label ?? "");
        }}
        disabled={loading}
        clearable
        placeholder={loading ? "Loading..." : "Select HCP or HMO"}
        searchPlaceholder="Search accredited HMOs and HCPs..."
        onSearchChange={(q) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => load(q), 300);
        }}
      />
    </div>
  );
}

export default function HcpChangeForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [lines, setLines] = React.useState<any[]>([]);
  const [entry, setEntry] = React.useState(blank());

  const loadData = (v: any) => {
    setLines((v.lines ?? []).map((l: any) => ({
      _key: uid(),
      record_date: l.record_date?.slice?.(0, 10) ?? "",
      enrollee_name: l.enrollee_name ?? "",
      nhia_number: l.nhia_number ?? "",
      current_hcp_hmo: l.current_hcp_hmo ?? "",
      new_hcp_hmo: l.new_hcp_hmo ?? "",
      reason_for_transfer: l.reason_for_transfer ?? "",
      met_criteria: l.met_criteria ?? "",
      request_channel: l.request_channel ?? "",
      request_date: l.request_date?.slice?.(0, 10) ?? "",
      process_end_date: l.process_end_date?.slice?.(0, 10) ?? "",
      line_status: l.line_status ?? "pending",
    })));
  };

  const addLine = () => {
    if (!entry.enrollee_name.trim() || !entry.nhia_number.trim()) return;
    setLines((p) => [...p, { _key: uid(), ...entry }]);
    setEntry(blank());
  };

  return (
    <StateOfficeFormShell
      reportType="hcf-change"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() => (lines.length === 0 ? "Add at least one change of HCP record" : null)}
      buildPayload={(base) => ({ ...base, lines: lines.map(({ _key, ...l }) => l) })}
    >
      {({ stateId }) => (
        <Card className="rounded-2xl border-[#d4e8dc]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Change of HCP</CardTitle>
            <CardDescription>Track enrollee HCP/HMO transfer requests for the reporting month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={entry.record_date} onChange={(e) => setEntry((v) => ({ ...v, record_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Enrollee Name</Label><Input value={entry.enrollee_name} onChange={(e) => setEntry((v) => ({ ...v, enrollee_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>NHIA Number</Label><Input value={entry.nhia_number} onChange={(e) => setEntry((v) => ({ ...v, nhia_number: e.target.value }))} /></div>
              <HcpHmoSelect label="Current HCP/HMO" stateId={stateId} value={entry.current_hcp_hmo} onChange={(name) => setEntry((v) => ({ ...v, current_hcp_hmo: name }))} />
              <HcpHmoSelect label="New HCP/HMO" stateId={stateId} value={entry.new_hcp_hmo} onChange={(name) => setEntry((v) => ({ ...v, new_hcp_hmo: name }))} />
              <div className="space-y-1"><Label>Reason for Transfer</Label><Input value={entry.reason_for_transfer} onChange={(e) => setEntry((v) => ({ ...v, reason_for_transfer: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Met NHIA criteria for change</Label>
                <Select value={entry.met_criteria} onValueChange={(v) => setEntry((p) => ({ ...p, met_criteria: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Request Channel</Label>
                <Select value={entry.request_channel} onValueChange={(v) => setEntry((p) => ({ ...p, request_channel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {HCP_CHANGE_CHANNELS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Date of Request</Label><Input type="date" value={entry.request_date} onChange={(e) => setEntry((v) => ({ ...v, request_date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Process end date</Label><Input type="date" value={entry.process_end_date} onChange={(e) => setEntry((v) => ({ ...v, process_end_date: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={entry.line_status} onValueChange={(v) => setEntry((p) => ({ ...p, line_status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {HCP_CHANGE_STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addLine} className="gap-2"><Plus className="w-4 h-4" /> Add row</Button>
            {lines.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#f0fdf7]">
                    {["Date", "Enrollee", "NHIA", "Current", "New", "Criteria", "Channel", "Status", ""].map((h) => (
                      <TableHead key={h} className="text-xs font-bold">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l._key}>
                      <TableCell className="text-sm">{l.record_date || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{l.enrollee_name}</TableCell>
                      <TableCell className="text-sm">{l.nhia_number}</TableCell>
                      <TableCell className="text-sm">{l.current_hcp_hmo || "—"}</TableCell>
                      <TableCell className="text-sm">{l.new_hcp_hmo || "—"}</TableCell>
                      <TableCell className="text-sm">{labelOf(YES_NO_OPTIONS, l.met_criteria, l.met_criteria || "—")}</TableCell>
                      <TableCell className="text-sm">{labelOf(HCP_CHANGE_CHANNELS, l.request_channel, l.request_channel || "—")}</TableCell>
                      <TableCell className="text-sm">{labelOf(HCP_CHANGE_STATUSES, l.line_status, l.line_status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-rose-500" onClick={() => setLines((p) => p.filter((x) => x._key !== l._key))}>
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
