import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Section, SelectField, TextInput, TextArea, EditableTable, AddRowButton, RemoveRowButton } from "./ui";
import { MAINTENANCE_TYPES, VEHICLE_STATUSES } from "./constants";

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
    setRows(loaded.length ? loaded.map((r) => ({ _key: uid(), ...r })) : [emptyRow()]);
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
        <Section title="Vehicle Maintenance Register">
          <EditableTable headers={["S/N", "Maintenance Type", "Problem Reported", "Maintenance Date", "Next Service Date", "Vehicle Status", "Remarks", ""]}>
            {rows.map((row, i) => (
              <tr key={row._key}>
                <td className="px-2 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-2 py-2 min-w-[150px]">
                  <SelectField value={row.maintenanceType} onChange={(v) => updateRow(row._key, "maintenanceType", v)} options={MAINTENANCE_TYPES} />
                </td>
                <td className="px-2 py-2 min-w-[160px]">
                  <TextInput value={row.problemReported} onChange={(e) => updateRow(row._key, "problemReported", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[130px]">
                  <TextInput type="date" value={row.maintenanceDate} onChange={(e) => updateRow(row._key, "maintenanceDate", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[130px]">
                  <TextInput type="date" value={row.nextServiceDate} onChange={(e) => updateRow(row._key, "nextServiceDate", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[140px]">
                  <SelectField value={row.vehicleStatus} onChange={(v) => updateRow(row._key, "vehicleStatus", v)} options={VEHICLE_STATUSES} />
                </td>
                <td className="px-2 py-2 min-w-[160px]">
                  <TextArea value={row.remarks} onChange={(e) => updateRow(row._key, "remarks", e.target.value)} className="min-h-[60px]" />
                </td>
                <td className="px-2 py-2">
                  <RemoveRowButton disabled={rows.length <= 1} onClick={() => setRows((p) => (p.length <= 1 ? p : p.filter((r) => r._key !== row._key)))} />
                </td>
              </tr>
            ))}
          </EditableTable>
          <div className="pt-3">
            <AddRowButton label="Add Row" onClick={() => setRows((p) => [...p, emptyRow()])} />
          </div>
        </Section>
      )}
    </StateOfficeFormShell>
  );
}
