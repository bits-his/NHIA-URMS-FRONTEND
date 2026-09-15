import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, SelectField, TextInput, TextArea, AddRowButton, EntryCard, FormPageTitle,
} from "./ui";
import { MAINTENANCE_TYPES, VEHICLE_STATUSES, ADMIN_HR_CONFIG } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface Row {
  _key: string;
  maintenanceType: string;
  problemReported: string;
  maintenanceDate: string;
  nextServiceDate: string;
  vehicleStatus: string;
  remarks: string;
}

const emptyRow = (): Row => ({
  _key: uid(), maintenanceType: "", problemReported: "", maintenanceDate: "",
  nextServiceDate: "", vehicleStatus: "", remarks: "",
});

export default function VehicleMaintenanceForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);

  const updateRow = (key: string, field: keyof Omit<Row, "_key">, value: string) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const loaded = (v.payload?.rows as Omit<Row, "_key">[] | undefined) ?? [];
    setRows(loaded.length ? loaded.map((r) => ({
      _key: uid(),
      maintenanceType: String(r.maintenanceType ?? ""),
      problemReported: String(r.problemReported ?? ""),
      maintenanceDate: String(r.maintenanceDate ?? "").slice(0, 10),
      nextServiceDate: String(r.nextServiceDate ?? "").slice(0, 10),
      vehicleStatus: String(r.vehicleStatus ?? ""),
      remarks: String(r.remarks ?? ""),
    })) : [emptyRow()]);
  };

  const title = rows.find((r) => r.maintenanceType)?.maintenanceType || "Vehicle maintenance";

  return (
    <StateOfficeFormShell
      reportType="vehicle-maintenance"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      validate={() => (rows.every((r) => !r.maintenanceType && !r.problemReported) ? "Add at least one maintenance entry" : null)}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: { rows: rows.map(({ _key, ...rest }) => rest) },
      })}
    >
      {() => (
        <div className="w-full space-y-4">
          <FormPageTitle title={ADMIN_HR_CONFIG["vehicle-maintenance"].title} />
          <Section title="Maintenance Entries">
            <div className="w-full space-y-4">
              {rows.map((row, i) => (
                <EntryCard
                  key={row._key}
                  index={i + 1}
                  removeDisabled={rows.length <= 1}
                  onRemove={() => setRows((p) => (p.length <= 1 ? p : p.filter((r) => r._key !== row._key)))}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Maintenance Type</p>
                      <SelectField value={row.maintenanceType} onChange={(v) => updateRow(row._key, "maintenanceType", v)} options={MAINTENANCE_TYPES} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Problem Reported</p>
                      <TextInput value={row.problemReported} onChange={(e) => updateRow(row._key, "problemReported", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Vehicle Status</p>
                      <SelectField value={row.vehicleStatus} onChange={(v) => updateRow(row._key, "vehicleStatus", v)} options={VEHICLE_STATUSES} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Maintenance Date</p>
                      <TextInput type="date" value={row.maintenanceDate} onChange={(e) => updateRow(row._key, "maintenanceDate", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Next Service Date</p>
                      <TextInput type="date" value={row.nextServiceDate} onChange={(e) => updateRow(row._key, "nextServiceDate", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full md:col-span-2 xl:col-span-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Remarks</p>
                      <TextArea value={row.remarks} onChange={(e) => updateRow(row._key, "remarks", e.target.value)} className="min-h-[72px]" />
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
