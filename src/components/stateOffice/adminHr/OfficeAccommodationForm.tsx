import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Section, SelectField, TextInput, TextArea, EditableTable, AddRowButton, RemoveRowButton } from "./ui";
import { OWNERSHIP_STATUSES, OFFICE_CONDITIONS } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface Row {
  _key: string;
  ownershipStatus: string;
  rentAmount: string;
  rentExpiryDate: string;
  currentCondition: string;
  remarks: string;
}

const emptyRow = (): Row => ({
  _key: uid(), ownershipStatus: "", rentAmount: "", rentExpiryDate: "", currentCondition: "", remarks: "",
});

export default function OfficeAccommodationForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);

  const updateRow = (key: string, field: keyof Omit<Row, "_key">, value: string) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const loaded = (v.payload?.rows as Omit<Row, "_key">[] | undefined) ?? [];
    setRows(loaded.length ? loaded.map((r) => ({ _key: uid(), ...r })) : [emptyRow()]);
  };

  const title = rows.find((r) => r.ownershipStatus)?.ownershipStatus || "Office accommodation";

  return (
    <StateOfficeFormShell
      reportType="office-accommodation"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      validate={() => (rows.every((r) => !r.ownershipStatus && !r.remarks) ? "Add at least one accommodation entry" : null)}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          rows: rows.map(({ _key, rentAmount, ...rest }) => ({
            ...rest,
            rentAmount: rentAmount ? Number(rentAmount) : null,
          })),
        },
      })}
    >
      {() => (
        <Section title="Office Accommodation Register">
          <EditableTable headers={["S/N", "Ownership Status", "Rent Amount (NGN)", "Rent Expiry Date", "Current Condition", "Remarks", ""]}>
            {rows.map((row, i) => (
              <tr key={row._key}>
                <td className="px-2 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-2 py-2 min-w-[140px]">
                  <SelectField value={row.ownershipStatus} onChange={(v) => updateRow(row._key, "ownershipStatus", v)} options={OWNERSHIP_STATUSES} />
                </td>
                <td className="px-2 py-2 min-w-[120px]">
                  <TextInput type="number" min={0} value={row.rentAmount} onChange={(e) => updateRow(row._key, "rentAmount", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[130px]">
                  <TextInput type="date" value={row.rentExpiryDate} onChange={(e) => updateRow(row._key, "rentExpiryDate", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[160px]">
                  <SelectField value={row.currentCondition} onChange={(v) => updateRow(row._key, "currentCondition", v)} options={OFFICE_CONDITIONS} />
                </td>
                <td className="px-2 py-2 min-w-[180px]">
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
