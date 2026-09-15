import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Section, SelectField, TextInput, TextArea, EditableTable, AddRowButton, RemoveRowButton } from "./ui";
import { UTILITY_CATEGORIES } from "./constants";

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface Row {
  _key: string;
  utilityCategory: string;
  contractor: string;
  amountDue: string;
  remarks: string;
}

const emptyRow = (): Row => ({ _key: uid(), utilityCategory: "", contractor: "", amountDue: "", remarks: "" });

export default function UtilityServicesForm({ reportId, onBack, defaultZoneId, defaultStateId }: Props) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);

  const updateRow = (key: string, field: keyof Omit<Row, "_key">, value: string) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const onLoaded = (v: { payload?: Record<string, unknown> }) => {
    const loaded = (v.payload?.rows as Omit<Row, "_key">[] | undefined) ?? [];
    setRows(loaded.length ? loaded.map((r) => ({ _key: uid(), ...r, amountDue: r.amountDue != null ? String(r.amountDue) : "" })) : [emptyRow()]);
  };

  const title = rows.find((r) => r.utilityCategory)?.utilityCategory || "Utility services";

  return (
    <StateOfficeFormShell
      reportType="utility-services"
      reportId={reportId}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      onLoaded={onLoaded}
      validate={() => (rows.every((r) => !r.utilityCategory && !r.contractor) ? "Add at least one utility entry" : null)}
      buildPayload={(base) => ({
        ...base,
        title,
        payload: {
          rows: rows.map(({ _key, amountDue, ...rest }) => ({
            ...rest,
            amountDue: amountDue ? Number(amountDue) : null,
          })),
        },
      })}
    >
      {() => (
        <Section title="Utility Services Register">
          <EditableTable headers={["S/N", "Utility Category", "Contractor", "Amount Due (NGN)", "Remarks", ""]}>
            {rows.map((row, i) => (
              <tr key={row._key}>
                <td className="px-2 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-2 py-2 min-w-[160px]">
                  <SelectField value={row.utilityCategory} onChange={(v) => updateRow(row._key, "utilityCategory", v)} options={UTILITY_CATEGORIES} />
                </td>
                <td className="px-2 py-2 min-w-[140px]">
                  <TextInput value={row.contractor} onChange={(e) => updateRow(row._key, "contractor", e.target.value)} />
                </td>
                <td className="px-2 py-2 min-w-[120px]">
                  <TextInput type="number" min={0} value={row.amountDue} onChange={(e) => updateRow(row._key, "amountDue", e.target.value)} />
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
