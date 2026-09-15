import * as React from "react";
import StateOfficeFormShell from "../StateOfficeFormShell";
import {
  Section, SelectField, TextInput, TextArea, AddRowButton, EntryCard, FormPageTitle,
} from "./ui";
import { OWNERSHIP_STATUSES, OFFICE_CONDITIONS, ADMIN_HR_CONFIG } from "./constants";

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
    setRows(loaded.length ? loaded.map((r) => ({
      _key: uid(),
      ownershipStatus: String(r.ownershipStatus ?? ""),
      rentAmount: r.rentAmount != null ? String(r.rentAmount) : "",
      rentExpiryDate: String(r.rentExpiryDate ?? "").slice(0, 10),
      currentCondition: String(r.currentCondition ?? ""),
      remarks: String(r.remarks ?? ""),
    })) : [emptyRow()]);
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
        <div className="w-full space-y-4">
          <FormPageTitle title={ADMIN_HR_CONFIG["office-accommodation"].title} />
          <Section title="Accommodation Entries">
            <div className="w-full space-y-4">
              {rows.map((row, i) => (
                <EntryCard
                  key={row._key}
                  index={i + 1}
                  removeDisabled={rows.length <= 1}
                  onRemove={() => setRows((p) => (p.length <= 1 ? p : p.filter((r) => r._key !== row._key)))}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <FieldLike label="Ownership Status">
                      <SelectField value={row.ownershipStatus} onChange={(v) => updateRow(row._key, "ownershipStatus", v)} options={OWNERSHIP_STATUSES} />
                    </FieldLike>
                    <FieldLike label="Rent Amount (NGN)">
                      <TextInput type="number" min={0} value={row.rentAmount} onChange={(e) => updateRow(row._key, "rentAmount", e.target.value)} />
                    </FieldLike>
                    <FieldLike label="Rent Expiry Date">
                      <TextInput type="date" value={row.rentExpiryDate} onChange={(e) => updateRow(row._key, "rentExpiryDate", e.target.value)} />
                    </FieldLike>
                    <FieldLike label="Current Condition">
                      <SelectField value={row.currentCondition} onChange={(v) => updateRow(row._key, "currentCondition", v)} options={OFFICE_CONDITIONS} />
                    </FieldLike>
                    <div className="md:col-span-2 xl:col-span-2">
                      <FieldLike label="Remarks">
                        <TextArea value={row.remarks} onChange={(e) => updateRow(row._key, "remarks", e.target.value)} className="min-h-[72px]" />
                      </FieldLike>
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

function FieldLike({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0 w-full">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      {children}
    </div>
  );
}
