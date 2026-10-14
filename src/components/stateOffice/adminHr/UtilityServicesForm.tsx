import * as React from "react";
import { useSelector } from "react-redux";
import { Trash2 } from "lucide-react";
import type { RootState } from "@/src/store/store";
import StateOfficeFormShell from "../StateOfficeFormShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UTILITY_CATEGORIES,
  UTILITY_SERVICE_LOCATIONS,
  UTILITY_REQUIRED_ATTACHMENTS,
  ADMIN_HR_CONFIG,
} from "./constants";
import { MONTHS, formatAmount, monthLabel } from "../constants";
import {
  Field,
  SelectField,
  TextInput,
  TextArea,
  AddRowButton,
} from "./ui";

const uid = () => Math.random().toString(36).slice(2, 10);

const YEARS = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - 3 + i));

/** Normalize stored period values (supports ISO dates and legacy month abbrs). */
function toDateInputValue(raw: unknown, year?: string | number, endOfMonth = false): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const abbrs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = abbrs.findIndex((m) => m.toLowerCase() === s.toLowerCase());
  if (mi >= 0) {
    const y = Number(year) || new Date().getFullYear();
    const month = mi + 1;
    const day = endOfMonth ? new Date(y, month, 0).getDate() : 1;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return "";
}

function monthDateRange(year: string | number, month: string | number) {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return { from: "", to: "" };
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

interface UtilityRow {
  _key: string;
  serviceLocation: string;
  serviceCategory: string;
  contractor: string;
  amountDue: string;
  paymentRequestRef: string;
  remarks: string;
}

interface AttachmentItem {
  id: number;
  name: string;
  attached: "Yes" | "No";
}

const blankEntry = (): Omit<UtilityRow, "_key"> => ({
  serviceLocation: "State Office",
  serviceCategory: "",
  contractor: "",
  amountDue: "",
  paymentRequestRef: "",
  remarks: "",
});

const defaultAttachments = (): AttachmentItem[] =>
  UTILITY_REQUIRED_ATTACHMENTS.map((a) => ({
    id: a.id,
    name: a.name,
    attached: "No",
  }));

function parseAmount(value: string) {
  const n = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Read-only system value as plain text (not an input look). */
function SystemValue({ value, empty = "—" }: { value?: string | null; empty?: string }) {
  return (
    <p className="min-h-10 flex items-center text-sm font-semibold text-slate-900">
      {value?.trim() ? value : <span className="font-normal text-slate-400">{empty}</span>}
    </p>
  );
}

export default function UtilityServicesForm({
  reportId,
  onBack,
  onCancel,
  onSubmitted,
  defaultZoneId,
  defaultStateId,
}: Props) {
  const user = useSelector((s: RootState) => s.auth.user);
  const loggedInName = user?.name?.trim() || "";
  const systemDesignation =
    user?.role_label?.trim() ||
    user?.unit?.name?.trim() ||
    user?.department?.name?.trim() ||
    user?.role ||
    "";

  const [lines, setLines] = React.useState<UtilityRow[]>([]);
  const [entry, setEntry] = React.useState(blankEntry());
  const [periodFrom, setPeriodFrom] = React.useState("");
  const [periodTo, setPeriodTo] = React.useState("");
  const [attachments, setAttachments] = React.useState<AttachmentItem[]>(defaultAttachments());
  const [preparedBy, setPreparedBy] = React.useState(loggedInName);
  const [designation, setDesignation] = React.useState(systemDesignation);
  const [signatureDate, setSignatureDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );

  React.useEffect(() => {
    if (loggedInName) setPreparedBy(loggedInName);
  }, [loggedInName]);

  React.useEffect(() => {
    if (systemDesignation) setDesignation((prev) => prev || systemDesignation);
  }, [systemDesignation]);

  const updateAttachment = (id: number, attached: "Yes" | "No") => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, attached } : a)));
  };

  const addLine = () => {
    if (
      !entry.serviceLocation ||
      !entry.serviceCategory ||
      !entry.contractor.trim() ||
      parseAmount(entry.amountDue) == null
    ) {
      return;
    }
    setLines((prev) => [...prev, { _key: uid(), ...entry }]);
    setEntry(blankEntry());
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l._key !== key));

  const onLoaded = (v: { payload?: Record<string, unknown>; submitted_by?: string }) => {
    const p = v.payload || {};
    const loadedRows = (p.rows as any[] | undefined) ?? [];
    setLines(
      loadedRows.map((r) => ({
        _key: uid(),
        serviceLocation: String(r.serviceLocation ?? r.location ?? "State Office"),
        serviceCategory: String(r.serviceCategory ?? r.utilityCategory ?? ""),
        contractor: String(r.contractor ?? ""),
        amountDue: r.amountDue != null ? String(r.amountDue) : "",
        paymentRequestRef: String(r.paymentRequestRef ?? r.paymentRef ?? ""),
        remarks: String(r.remarks ?? ""),
      })),
    );
    setEntry(blankEntry());

    if (p.periodFrom) setPeriodFrom(toDateInputValue(p.periodFrom, undefined, false));
    if (p.periodTo) setPeriodTo(toDateInputValue(p.periodTo, undefined, true));

    if (Array.isArray(p.attachments) && p.attachments.length) {
      setAttachments(
        defaultAttachments().map((def) => {
          const found = (p.attachments as any[]).find(
            (item) => item.id === def.id || item.name === def.name,
          );
          return found
            ? {
                ...def,
                attached: found.attached === "Yes" || found.attached === true ? "Yes" : "No",
              }
            : def;
        }),
      );
    } else {
      setAttachments(defaultAttachments());
    }

    if (p.preparedBy) setPreparedBy(String(p.preparedBy));
    else if (v.submitted_by) setPreparedBy(String(v.submitted_by));
    else if (loggedInName) setPreparedBy(loggedInName);

    if (p.designation) setDesignation(String(p.designation));
    else if (systemDesignation) setDesignation(systemDesignation);
    if (p.signatureDate) setSignatureDate(String(p.signatureDate).slice(0, 10));
  };

  const totalAmountDue = React.useMemo(
    () =>
      lines.reduce((sum, r) => {
        const n = parseAmount(r.amountDue);
        return sum + (n ?? 0);
      }, 0),
    [lines],
  );

  const activeCategory = lines.find((r) => r.serviceCategory)?.serviceCategory;
  const pageTitle = activeCategory
    ? `Utility Services — ${activeCategory}`
    : ADMIN_HR_CONFIG["utility-services"].formTitle;

  return (
    <StateOfficeFormShell
      reportType="utility-services"
      reportId={reportId}
      onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      pageTitle={pageTitle}
      hideBasicInfo
      onLoaded={onLoaded}
      validate={(status) => {
        if (lines.length === 0) {
          return "Add at least one service entry to the list.";
        }
        if (status === "submitted") {
          if (attachments.some((a) => a.attached !== "Yes")) {
            return "Mark all three attachments as Yes before submit.";
          }
          if (!preparedBy.trim()) return "Prepared by is required.";
          if (!designation.trim()) return "Please enter Designation before submit.";
        }
        return null;
      }}
      buildPayload={(base) => ({
        ...base,
        title: activeCategory ? `${activeCategory} Utility Services` : "Utility Services",
        payload: {
          periodFrom,
          periodTo,
          rows: lines.map(({ _key, amountDue, ...rest }) => ({
            ...rest,
            amountDue: parseAmount(amountDue),
          })),
          totalAmountDue,
          attachments,
          preparedBy,
          designation,
          signatureDate,
        },
      })}
    >
      {({ header }) => {
        const zoneLabel =
          header.zones.find((z) => String(z.id) === String(header.zoneId))?.label || "";
        const stateLabel =
          header.states.find((s) => String(s.id) === String(header.stateId))?.label || "";

        return (
          <div className="w-full pb-4">
            <div className="rounded-2xl border border-[#d4e8dc] bg-white shadow-sm p-4 sm:p-6 space-y-6">
              {/* Header meta — one grid, no section title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Zonal Office" required>
                  {header.lockZone ? (
                    <SystemValue value={zoneLabel || user?.zone?.description} />
                  ) : (
                    <Select
                      value={header.zoneId || undefined}
                      onValueChange={header.setZoneId}
                    >
                      <SelectTrigger
                        className="h-10 text-sm w-full"
                        displayValue={zoneLabel || "Select zone"}
                      >
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {header.zones.map((z) => (
                          <SelectItem key={z.id} value={String(z.id)}>
                            {z.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field label="State Office" required>
                  {header.lockState ? (
                    <SystemValue value={stateLabel || user?.state?.description} />
                  ) : (
                    <Select
                      value={header.stateId || undefined}
                      onValueChange={header.setStateId}
                      disabled={!header.zoneId}
                    >
                      <SelectTrigger
                        className="h-10 text-sm w-full"
                        displayValue={stateLabel || "Select state"}
                      >
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {header.states.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Field>

                <Field label="Year" required>
                  <Select value={header.reportYear || undefined} onValueChange={header.setReportYear}>
                    <SelectTrigger className="h-10 text-sm w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Month" required>
                  <Select
                    value={header.reportMonth || undefined}
                    onValueChange={(v) => {
                      header.setReportMonth(v);
                      const range = monthDateRange(header.reportYear, v);
                      if (!periodFrom) setPeriodFrom(range.from);
                      if (!periodTo) setPeriodTo(range.to);
                    }}
                  >
                    <SelectTrigger
                      className="h-10 text-sm w-full"
                      displayValue={
                        header.reportMonth
                          ? monthLabel(header.reportMonth)
                          : "Select month"
                      }
                    >
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Period From">
                  <TextInput
                    type="date"
                    value={periodFrom}
                    max={periodTo || undefined}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                  />
                </Field>

                <Field label="Period To">
                  <TextInput
                    type="date"
                    value={periodTo}
                    min={periodFrom || undefined}
                    onChange={(e) => setPeriodTo(e.target.value)}
                  />
                </Field>

                <Field label="Designation" required>
                  <TextInput
                    placeholder="e.g. Admin Officer"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </Field>

                <Field label="Date">
                  <TextInput
                    type="date"
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Prepared by
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {preparedBy || loggedInName || "—"}
                </p>
              </div>

              <div className="border-t border-[#e8f5ee]" />

              {/* Service entry + list */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <Field label="Service Location" required>
                    <SelectField
                      value={entry.serviceLocation}
                      onChange={(v) => setEntry((p) => ({ ...p, serviceLocation: v }))}
                      options={UTILITY_SERVICE_LOCATIONS}
                      placeholder="Select location"
                    />
                  </Field>
                  <Field label="Service Category" required>
                    <SelectField
                      value={entry.serviceCategory}
                      onChange={(v) => setEntry((p) => ({ ...p, serviceCategory: v }))}
                      options={UTILITY_CATEGORIES}
                      placeholder="Select category"
                    />
                  </Field>
                  <Field label="Contractor (State / Zonal Office)" required>
                    <TextInput
                      placeholder="Contractor name"
                      value={entry.contractor}
                      onChange={(e) => setEntry((p) => ({ ...p, contractor: e.target.value }))}
                    />
                  </Field>
                  <Field label="Amount Due (NGN)" required>
                    <TextInput
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={entry.amountDue}
                      onChange={(e) => setEntry((p) => ({ ...p, amountDue: e.target.value }))}
                    />
                  </Field>
                  <Field label="Payment Request Reference">
                    <TextInput
                      placeholder="Payment request / invoice reference"
                      value={entry.paymentRequestRef}
                      onChange={(e) =>
                        setEntry((p) => ({ ...p, paymentRequestRef: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Remarks">
                    <TextArea
                      placeholder="Additional remarks"
                      value={entry.remarks}
                      onChange={(e) => setEntry((p) => ({ ...p, remarks: e.target.value }))}
                      className="min-h-[72px]"
                    />
                  </Field>
                </div>

                <AddRowButton label="Add to list" onClick={addLine} />

                {lines.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-[#d4e8dc]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f0fdf7] hover:bg-[#f0fdf7]">
                          <TableHead className="text-xs font-bold w-10">S/N</TableHead>
                          <TableHead className="text-xs font-bold">Location</TableHead>
                          <TableHead className="text-xs font-bold">Category</TableHead>
                          <TableHead className="text-xs font-bold">Contractor</TableHead>
                          <TableHead className="text-xs font-bold text-right">Amount (NGN)</TableHead>
                          <TableHead className="text-xs font-bold">Payment Ref</TableHead>
                          <TableHead className="text-xs font-bold">Remarks</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((l, i) => (
                          <TableRow key={l._key} className="hover:bg-[#f8fdfb]">
                            <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                            <TableCell className="text-sm">{l.serviceLocation}</TableCell>
                            <TableCell className="text-sm font-medium">{l.serviceCategory}</TableCell>
                            <TableCell className="text-sm">{l.contractor}</TableCell>
                            <TableCell className="text-sm text-right tabular-nums font-semibold">
                              ₦{formatAmount(parseAmount(l.amountDue) ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm">{l.paymentRequestRef || "—"}</TableCell>
                            <TableCell
                              className="text-sm max-w-[160px] truncate"
                              title={l.remarks}
                            >
                              {l.remarks || "—"}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
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
                            Total
                          </TableCell>
                          <TableCell className="text-sm text-right text-[#145c3f] tabular-nums">
                            ₦{formatAmount(totalAmountDue)}
                          </TableCell>
                          <TableCell colSpan={3} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="border-t border-[#e8f5ee]" />

              {/* Attachments — no card header */}
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Confirm the three documents accompany the payment request.
                </p>
                {attachments.map((att, i) => (
                  <div
                    key={att.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-[#d4e8dc] bg-[#f4f7f5]/40 px-3 py-3"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e8f5ee] text-xs font-bold text-[#145c3f]">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-800 leading-snug">{att.name}</p>
                    </div>
                    <div
                      className="flex items-center gap-4 shrink-0 pl-8 sm:pl-0"
                      role="radiogroup"
                      aria-label={`${att.name} attached`}
                    >
                      {(["Yes", "No"] as const).map((opt) => (
                        <label
                          key={opt}
                          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`utility-att-${att.id}`}
                            value={opt}
                            checked={att.attached === opt}
                            onChange={() => updateAttachment(att.id, opt)}
                            className="h-4 w-4 accent-[#145c3f]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </StateOfficeFormShell>
  );
}
