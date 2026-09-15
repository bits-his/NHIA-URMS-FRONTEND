import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, SelectField, TextInput, TextArea, AddRowButton, EntryCard, FormPageTitle,
} from "./ui";
import { UTILITY_CATEGORIES, ADMIN_HR_CONFIG } from "./constants";

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
    setRows(loaded.length ? loaded.map((r) => ({
      _key: uid(),
      utilityCategory: String(r.utilityCategory ?? ""),
      contractor: String(r.contractor ?? ""),
      amountDue: r.amountDue != null ? String(r.amountDue) : "",
      remarks: String(r.remarks ?? ""),
    })) : [emptyRow()]);
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
        <div className="w-full space-y-4">
          <FormPageTitle title={ADMIN_HR_CONFIG["utility-services"].title} />
          <Section title="Utility Entries">
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
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Utility Category</p>
                      <SelectField value={row.utilityCategory} onChange={(v) => updateRow(row._key, "utilityCategory", v)} options={UTILITY_CATEGORIES} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Contractor</p>
                      <TextInput value={row.contractor} onChange={(e) => updateRow(row._key, "contractor", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 min-w-0 w-full">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Amount Due (NGN)</p>
                      <TextInput type="number" min={0} value={row.amountDue} onChange={(e) => updateRow(row._key, "amountDue", e.target.value)} />
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
