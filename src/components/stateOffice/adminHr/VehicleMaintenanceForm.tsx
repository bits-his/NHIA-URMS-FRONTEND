import * as React from "react";
import { Plus, Pencil, Trash2, Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StateOfficeFormShell from "../StateOfficeFormShell";
import ReportBasicInfo from "../shared/ReportBasicInfo";
import { Field, SelectField, TextInput, TextArea } from "./ui";
import { MAINTENANCE_TYPES, VEHICLE_STATUSES, ADMIN_HR_CONFIG } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface Row {
  _key: string;
  vehicleModel: string;
  chassisNumber: string;
  maintenanceType: string;
  problemReported: string;
  maintenanceDate: string;
  nextServiceDate: string;
  vehicleStatus: string;
  remarks: string;
}

const emptyEntry = (): Omit<Row, "_key"> => ({
  vehicleModel: "",
  chassisNumber: "",
  maintenanceType: "",
  problemReported: "",
  maintenanceDate: "",
  nextServiceDate: "",
  vehicleStatus: "",
  remarks: "",
});

function validateEntry(entry: Omit<Row, "_key">, label = "Entry") {
  if (!entry.chassisNumber.trim()) return `${label}: Chassis Number is required`;
  if (!entry.maintenanceType) return `${label}: Maintenance Type is required`;
  if (!entry.maintenanceDate) return `${label}: Maintenance Date is required`;
  if (!entry.vehicleStatus) return `${label}: Vehicle Status is required`;
  if (entry.nextServiceDate && entry.maintenanceDate && entry.nextServiceDate < entry.maintenanceDate) {
    return `${label}: Next Service Date must be on or after Maintenance Date`;
  }
  return null;
}

export default function VehicleMaintenanceForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [entry, setEntry] = React.useState(emptyEntry);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);

  const set = <K extends keyof Omit<Row, "_key">>(field: K, value: Omit<Row, "_key">[K]) => {
    setEntry((current) => ({ ...current, [field]: value }));
  };

  const resetEntry = () => {
    setEntry(emptyEntry());
    setEditingKey(null);
  };

  const addToList = () => {
    const err = validateEntry(entry);
    if (err) {
      toast.error(err);
      return;
    }
    const next: Row = {
      _key: editingKey || uid(),
      vehicleModel: entry.vehicleModel.trim(),
      chassisNumber: entry.chassisNumber.trim().toUpperCase(),
      maintenanceType: entry.maintenanceType,
      problemReported: entry.problemReported.trim(),
      maintenanceDate: entry.maintenanceDate,
      nextServiceDate: entry.nextServiceDate,
      vehicleStatus: entry.vehicleStatus,
      remarks: entry.remarks.trim(),
    };
    setRows((prev) => {
      if (editingKey) return prev.map((row) => (row._key === editingKey ? next : row));
      return [...prev, next];
    });
    resetEntry();
  };

  const editRow = (row: Row) => {
    setEditingKey(row._key);
    setEntry({
      vehicleModel: row.vehicleModel,
      chassisNumber: row.chassisNumber,
      maintenanceType: row.maintenanceType,
      problemReported: row.problemReported,
      maintenanceDate: row.maintenanceDate,
      nextServiceDate: row.nextServiceDate,
      vehicleStatus: row.vehicleStatus,
      remarks: row.remarks,
    });
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((row) => row._key !== key));
    if (editingKey === key) resetEntry();
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const loaded = (v.payload?.rows as Omit<Row, "_key">[] | undefined) ?? [];
    setRows(loaded.map((r) => ({
      _key: uid(),
      vehicleModel: String(r.vehicleModel ?? ""),
      chassisNumber: String(r.chassisNumber ?? ""),
      maintenanceType: String(r.maintenanceType ?? ""),
      problemReported: String(r.problemReported ?? ""),
      maintenanceDate: String(r.maintenanceDate ?? "").slice(0, 10),
      nextServiceDate: String(r.nextServiceDate ?? "").slice(0, 10),
      vehicleStatus: String(r.vehicleStatus ?? ""),
      remarks: String(r.remarks ?? ""),
    })));
    resetEntry();
  };

  const title =
    rows.find((r) => r.vehicleModel)?.vehicleModel
    || rows.find((r) => r.chassisNumber)?.chassisNumber
    || rows.find((r) => r.maintenanceType)?.maintenanceType
    || "Vehicle maintenance";

  return (
    <StateOfficeFormShell
      reportType="vehicle-maintenance"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={ADMIN_HR_CONFIG["vehicle-maintenance"].formTitle}
      hideBasicInfo
      hideFooterActions
      onLoaded={onLoaded}
      validate={() => (rows.length ? null : "Add at least one maintenance entry to the list")}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          rows: rows.map(({ _key, ...rest }) => rest),
        },
      })}
    >
      {({ header, saving, submitting, persist, requestSubmit }) => (
        <Card className="rounded-sm border-[#d4e8dc] shadow-sm overflow-visible m-0">
          <CardContent className="p-3 md:p-4 space-y-4">
            <ReportBasicInfo
              {...header}
              lockZone={header.lockZone}
              lockState={header.lockState}
              showQuarter
              embedded
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Vehicle Model">
                <TextInput
                  value={entry.vehicleModel}
                  onChange={(e) => set("vehicleModel", e.target.value)}
                  placeholder="Enter model"
                />
              </Field>
              <Field label="Chassis Number" required>
                <TextInput
                  value={entry.chassisNumber}
                  onChange={(e) => set("chassisNumber", e.target.value)}
                  placeholder="Enter chassis no."
                />
              </Field>
              <Field label="Maintenance Type" required>
                <SelectField
                  value={entry.maintenanceType}
                  onChange={(v) => set("maintenanceType", v)}
                  options={MAINTENANCE_TYPES}
                />
              </Field>
              <Field label="Problem Reported">
                <TextInput
                  value={entry.problemReported}
                  onChange={(e) => set("problemReported", e.target.value)}
                  placeholder="Enter problem"
                />
              </Field>
              <Field label="Maintenance Date" required>
                <TextInput
                  type="date"
                  value={entry.maintenanceDate}
                  onChange={(e) => set("maintenanceDate", e.target.value)}
                />
              </Field>
              <Field label="Next Service Date">
                <TextInput
                  type="date"
                  value={entry.nextServiceDate}
                  min={entry.maintenanceDate || undefined}
                  onChange={(e) => set("nextServiceDate", e.target.value)}
                />
              </Field>
              <Field label="Vehicle Status" required>
                <SelectField
                  value={entry.vehicleStatus}
                  onChange={(v) => set("vehicleStatus", v)}
                  options={VEHICLE_STATUSES}
                />
              </Field>
              <Field label="Remarks">
                <TextArea
                  value={entry.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  className="min-h-[42px]"
                  placeholder="Enter remarks"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8f3ec]">
              {editingKey ? (
                <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={resetEntry}>
                  Cancel edit
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="button"
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                onClick={addToList}
              >
                <Plus className="w-4 h-4" />
                {editingKey ? "Update list" : "Add to list"}
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                No maintenance events in the list yet.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-3 md:-mx-4 border-t border-[#e8f3ec]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e] w-10">#</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Vehicle Model</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Chassis Number</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Type</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Problem</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Maintenance Date</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Next Service</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Status</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e]">Remarks</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#0f3d2e] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row._key} className="hover:bg-[#f4f7f5]">
                        <TableCell className="text-xs text-slate-400 tabular-nums">{index + 1}</TableCell>
                        <TableCell className="text-sm">{row.vehicleModel || "—"}</TableCell>
                        <TableCell className="text-sm font-mono font-semibold text-[#0f3d2e]">{row.chassisNumber}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.maintenanceType}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={row.problemReported}>
                          {row.problemReported || "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.maintenanceDate || "—"}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.nextServiceDate || "—"}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.vehicleStatus}</TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate" title={row.remarks}>
                          {row.remarks || "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-[#145c3f] hover:bg-[#e8f5ee]"
                              onClick={() => editRow(row)}
                              aria-label="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                              onClick={() => removeRow(row._key)}
                              aria-label="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#e8f3ec]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={saving || submitting}
                onClick={() => void persist("draft")}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                type="button"
                className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                disabled={saving || submitting}
                onClick={() => requestSubmit(() => persist("submitted"))}
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </StateOfficeFormShell>
  );
}
