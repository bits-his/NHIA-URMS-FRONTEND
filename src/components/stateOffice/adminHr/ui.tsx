import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      ? "bg-amber-200 text-amber-950 border-amber-300"
      : "bg-[#e8f5ee] text-[#0f3d2e] border-[#25a872]/40";
  return (
    <section className="rounded-xl border border-[#d4e8dc] overflow-hidden bg-white shadow-sm w-full">
      <div className={`px-4 py-3 border-b text-sm font-bold tracking-wide ${bar}`}>{title}</div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
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
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input className={`h-10 text-sm w-full ${className || ""}`} {...props} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${props.className || ""}`}
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
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-10 text-sm w-full" displayValue={value || placeholder}>
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
