import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Same field chrome as Beneficiary Management / Enrolment. */
export const hrControlClass = cn(
  "h-11 w-full text-sm font-medium",
  "bg-[#f4f7f5] border-2 border-[#1a7a52] rounded-sm px-3.5 shadow-none",
  "hover:border-[#0f3d2e] hover:bg-white",
  "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
);
const controlClass = hrControlClass;

export function Section({
  title,
  accent = "green",
  children,
}: {
  title: string;
  accent?: "blue" | "yellow" | "green";
  children: React.ReactNode;
}) {
  const bar =
    accent === "yellow"
      ? "bg-amber-50 text-amber-950 border-amber-200"
      : "bg-[#e8f5ee] text-[#0f3d2e] border-[#d4e8dc]";
  return (
    <section className="rounded-sm border border-[#d4e8dc] overflow-hidden bg-white shadow-sm w-full">
      <div className={`px-4 py-2.5 border-b text-[12px] font-bold uppercase tracking-[0.06em] ${bar}`}>{title}</div>
      <div className="p-4 md:p-5 space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5 min-w-0 w-full">
      <Label className="text-xs font-semibold text-slate-600">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function TextInput({ className, readOnly, disabled, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      {...props}
      readOnly={readOnly}
      disabled={disabled}
      className={cn(controlClass, (readOnly || disabled) && "bg-slate-50 text-slate-600", className)}
    />
  );
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "flex w-full min-h-[5rem] rounded-sm border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 py-2 text-sm font-medium text-slate-800 shadow-none resize-y outline-none",
        "hover:border-[#0f3d2e] hover:bg-white",
        "focus-visible:border-[#0f3d2e] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1a7a52]/20",
        className,
      )}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | { value: string; label: string }[];
  placeholder?: string;
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const label = items.find((o) => o.value === value)?.label;
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={controlClass} displayValue={label || placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-1.5 text-xs font-semibold border-[#25a872]/50 text-[#145c3f] hover:bg-[#e8f5ee]"
    >
      <Plus className="w-3.5 h-3.5" /> {label}
    </Button>
  );
}

export function RemoveRowButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50"
      aria-label="Remove row"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

export function EditableTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#d4e8dc]">
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="bg-[#145c3f] text-white">
            {headers.map((h) => (
              <th key={h} className="px-3 py-3 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-[#e8f5ee]">{children}</tbody>
      </table>
    </div>
  );
}

/** Spacious stacked entry cards — better than a squeezed wide table on forms */
export function EntryCard({
  index,
  onRemove,
  removeDisabled,
  children,
}: {
  index: number;
  onRemove?: () => void;
  removeDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-xl border border-[#d4e8dc] bg-[#f4f7f5]/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-md bg-[#e8f5ee] border border-[#25a872]/40 px-2.5 py-1 text-xs font-bold text-[#145c3f]">
          Entry {index}
        </span>
        {onRemove ? <RemoveRowButton onClick={onRemove} disabled={removeDisabled} /> : null}
      </div>
      {children}
    </div>
  );
}

export function FormPageTitle({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-[#25a872]/30 bg-white overflow-hidden shadow-sm w-full">
      <div className="bg-[#145c3f] px-4 py-3.5 text-center">
        <h2 className="text-base sm:text-lg font-bold tracking-wide text-white">{title}</h2>
      </div>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#25a872]/35 bg-[#e8f5ee] px-3 py-2.5 text-xs text-[#0f3d2e] leading-relaxed">
      {children}
    </div>
  );
}
