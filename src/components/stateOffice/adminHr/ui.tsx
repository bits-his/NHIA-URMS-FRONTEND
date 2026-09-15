import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Section({
  title,
  accent = "blue",
  children,
}: {
  title: string;
  accent?: "blue" | "yellow" | "green";
  children: React.ReactNode;
}) {
  const bar =
    accent === "yellow"
      ? "bg-amber-200 text-amber-950 border-amber-300"
      : accent === "green"
        ? "bg-[#e8f5ee] text-[#0f3d2e] border-[#25a872]/40"
        : "bg-[#d9e5f3] text-[#0f2f5b] border-[#b8cce3]";
  return (
    <section className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className={`px-4 py-2.5 border-b text-sm font-bold tracking-wide ${bar}`}>{title}</div>
      <div className="p-4 space-y-3">{children}</div>
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
    <div className="space-y-1.5 min-w-0">
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <Input className="h-9 text-sm" {...props} />;
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
      <SelectTrigger className="h-9 text-sm" displayValue={value || placeholder}>
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
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="gap-1.5 text-xs font-semibold">
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
      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
      aria-label="Remove row"
    >
      <Trash2 className="w-3.5 h-3.5" />
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
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs min-w-[720px]">
        <thead>
          <tr className="bg-[#0f2f5b] text-white">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2.5 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
