import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, SelectField, TextInput, TextArea, AddRowButton, EntryCard,
} from "./ui";
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

const emptyRow = (): Row => ({
  _key: uid(),
  vehicleModel: "",
  chassisNumber: "",
  maintenanceType: "",
  problemReported: "",
  maintenanceDate: "",
  nextServiceDate: "",
  vehicleStatus: "",
  remarks: "",
});

function isRowStarted(row: Row) {
  return !!(
    row.vehicleModel.trim()
    || row.chassisNumber.trim()
    || row.maintenanceType
    || row.problemReported.trim()
    || row.maintenanceDate
    || row.nextServiceDate
    || row.vehicleStatus
    || row.remarks.trim()
  );
}

function validateRows(rows: Row[], { forSubmit }: { forSubmit: boolean }) {
  const started = rows.filter(isRowStarted);
  if (!started.length) return "Add at least one maintenance entry";

  for (let i = 0; i < started.length; i += 1) {
    const row = started[i];
    const label = `Row ${i + 1}`;
    if (forSubmit || row.chassisNumber || row.maintenanceType || row.maintenanceDate || row.vehicleStatus) {
      if (!row.chassisNumber.trim()) return `${label}: Chassis Number is required`;
      if (!row.maintenanceType) return `${label}: Maintenance Type is required`;
      if (!row.maintenanceDate) return `${label}: Maintenance Date is required`;
      if (!row.vehicleStatus) return `${label}: Vehicle Status is required`;
    }
    if (row.nextServiceDate && row.maintenanceDate && row.nextServiceDate < row.maintenanceDate) {
      return `${label}: Next Service Date must be on or after Maintenance Date`;
    }
  }
  return null;
}

export default function VehicleMaintenanceForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);

  const updateRow = (key: string, field: keyof Omit<Row, "_key">, value: string) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const loaded = (v.payload?.rows as Omit<Row, "_key">[] | undefined) ?? [];
    setRows(loaded.length ? loaded.map((r) => ({
      _key: uid(),
      vehicleModel: String(r.vehicleModel ?? ""),
      chassisNumber: String(r.chassisNumber ?? ""),
      maintenanceType: String(r.maintenanceType ?? ""),
      problemReported: String(r.problemReported ?? ""),
      maintenanceDate: String(r.maintenanceDate ?? "").slice(0, 10),
      nextServiceDate: String(r.nextServiceDate ?? "").slice(0, 10),
      vehicleStatus: String(r.vehicleStatus ?? ""),
      remarks: String(r.remarks ?? ""),
    })) : [emptyRow()]);
  };

  const title =
    rows.find((r) => r.vehicleModel.trim())?.vehicleModel.trim()
    || rows.find((r) => r.chassisNumber.trim())?.chassisNumber.trim()
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
      onLoaded={onLoaded}
      validate={(status) => validateRows(rows, { forSubmit: status === "submitted" || status === "approved" })}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          rows: rows.filter(isRowStarted).map(({ _key, ...rest }) => ({
            ...rest,
            chassisNumber: rest.chassisNumber.trim().toUpperCase(),
            vehicleModel: rest.vehicleModel.trim(),
            problemReported: rest.problemReported.trim(),
            remarks: rest.remarks.trim(),
          })),
        },
      })}
    >
      {() => (
        <div className="w-full space-y-4">
          <Section title="Vehicle Maintenance Records">
            <p className="text-xs text-slate-500 -mt-1 mb-2">
              Add one row per vehicle maintenance event. Chassis Number links a vehicle&apos;s history across reporting periods.
            </p>
            <div className="w-full space-y-4">
              {rows.map((row, i) => (
                <EntryCard
                  key={row._key}
                  index={i + 1}
                  removeDisabled={rows.length <= 1}
                  onRemove={() => setRows((p) => (p.length <= 1 ? p : p.filter((r) => r._key !== row._key)))}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Vehicle Model</p>
                      <TextInput
                        value={row.vehicleModel}
                        onChange={(e) => updateRow(row._key, "vehicleModel", e.target.value)}
                        placeholder="Enter model"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        Chassis Number <span className="text-red-500">*</span>
                      </p>
                      <TextInput
                        value={row.chassisNumber}
                        onChange={(e) => updateRow(row._key, "chassisNumber", e.target.value)}
                        placeholder="Enter chassis no."
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        Maintenance Type <span className="text-red-500">*</span>
                      </p>
                      <SelectField
                        value={row.maintenanceType}
                        onChange={(v) => updateRow(row._key, "maintenanceType", v)}
                        options={MAINTENANCE_TYPES}
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Problem Reported</p>
                      <TextInput
                        value={row.problemReported}
                        onChange={(e) => updateRow(row._key, "problemReported", e.target.value)}
                        placeholder="Enter problem"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        Maintenance Date <span className="text-red-500">*</span>
                      </p>
                      <TextInput
                        type="date"
                        value={row.maintenanceDate}
                        onChange={(e) => updateRow(row._key, "maintenanceDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Next Service Date</p>
                      <TextInput
                        type="date"
                        value={row.nextServiceDate}
                        min={row.maintenanceDate || undefined}
                        onChange={(e) => updateRow(row._key, "nextServiceDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        Vehicle Status <span className="text-red-500">*</span>
                      </p>
                      <SelectField
                        value={row.vehicleStatus}
                        onChange={(v) => updateRow(row._key, "vehicleStatus", v)}
                        options={VEHICLE_STATUSES}
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full md:col-span-2 xl:col-span-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Remarks</p>
                      <TextArea
                        value={row.remarks}
                        onChange={(e) => updateRow(row._key, "remarks", e.target.value)}
                        className="min-h-[72px]"
                        placeholder="Enter remarks"
                      />
                    </div>
                  </div>
                </EntryCard>
              ))}
            </div>
            <AddRowButton label="Add Row" onClick={() => setRows((p) => [...p, emptyRow()])} />
          </Section>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
