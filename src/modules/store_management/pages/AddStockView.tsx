import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { stockApi } from "@/lib/api";
import { LOOKUPS } from "@/src/store/useAssetManagement";
import { storeNameFromState } from "../lib/storeOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

type Option = { id: number; label: string };

const UNITS = ["Units", "Pieces", "Packs", "Boxes", "Reams", "Cartons", "Sets", "Litres", "Pairs"];

const STOCK_CATEGORIES = [
  "Office Consumables",
  ...Object.keys(LOOKUPS.primaryCategories).filter((c) => c !== "Land" && c !== "Building"),
];

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

function stockStatus(qty: number, reorder: number) {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty <= reorder) return "LOW_STOCK";
  return "IN_STOCK";
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  OUT_OF_STOCK: { label: "Out of stock", className: "bg-rose-50 text-rose-800" },
  LOW_STOCK: { label: "Low stock", className: "bg-amber-50 text-amber-900" },
  IN_STOCK: { label: "In stock", className: "bg-[#e8f5ee] text-[#0f3d2e]" },
};

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-bold text-slate-700 mb-1" htmlFor={id}>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

export default function AddStockView() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zoneId, setZoneId] = useState("");
  const [stateId, setStateId] = useState("");
  const [stateName, setStateName] = useState("");
  const [fallbackCode] = useState(
    () => `OLD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  );
  const [form, setForm] = useState({
    itemCode: "",
    name: "",
    category: "Office Consumables",
    unitOfMeasure: "Units",
    quantityInStock: "",
    reorderLevel: "10",
    unitPrice: "",
  });

  useEffect(() => {
    stockApi.getZones()
      .then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description }))))
      .catch(() => setError("Could not load zones."))
      .finally(() => setZonesLoading(false));
  }, []);

  useEffect(() => {
    if (!zoneId) { setStates([]); return; }
    let cancelled = false;
    stockApi.getStates(zoneId)
      .then((r) => {
        if (!cancelled) setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
      })
      .catch(() => { if (!cancelled) setStates([]); });
    return () => { cancelled = true; };
  }, [zoneId]);

  const storeLocation = storeNameFromState(stateName);
  const itemCode = form.itemCode.trim() || fallbackCode;
  const qty = form.quantityInStock === "" ? null : Number(form.quantityInStock);
  const reorder = form.reorderLevel === "" ? 10 : Number(form.reorderLevel);
  const priceBlank = form.unitPrice.trim() === "";
  const unitPrice = priceBlank ? 0 : Number(form.unitPrice);
  const qtyOk = qty !== null && Number.isFinite(qty) && qty >= 0;
  const reorderOk = Number.isFinite(reorder) && reorder >= 0;
  const priceOk = priceBlank || (Number.isFinite(unitPrice) && unitPrice >= 0);
  const status = qtyOk && reorderOk ? stockStatus(qty, reorderOk ? reorder : 10) : null;
  const stockValue = qtyOk && priceOk && !priceBlank ? qty * unitPrice : null;

  const slipStatus = status ? STATUS_LABEL[status] : null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setError("Enter the item name."); return; }
    if (!form.category) { setError("Select a category."); return; }
    if (!qtyOk || qty === null) { setError("Enter the quantity on hand."); return; }
    if (!reorderOk) { setError("Enter a valid reorder level."); return; }
    if (!priceOk) { setError("Enter a valid unit price, or leave it blank."); return; }
    if (!storeLocation) { setError("Select the zone and state office store."); return; }
    setError(null);
    setSaving(true);
    try {
      await stockApi.createInventoryItem({
        itemCode,
        name,
        category: form.category,
        unitOfMeasure: form.unitOfMeasure || "Units",
        quantityInStock: qty,
        reorderLevel: reorder,
        unitPrice: priceOk ? unitPrice : 0,
        storeLocation,
        status: stockStatus(qty, reorder),
      });
      toast.success("Stock added to the inventory register");
      navigate("/store-management/inventory/items");
    } catch (err: any) {
      const message = String(err?.message || "");
      if (/unique|duplicate|itemCode/i.test(message)) {
        setError("That stock code is already on the register. Use the code from the bin card, or leave the field blank.");
      } else {
        setError(message || "Could not add stock.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Add stock"
      description="Record stock already held in a store"
      back
      backTo="/store-management/inventory/items"
      contentClassName="flex-1 min-h-0"
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[600px] w-full flex-1">
      <form onSubmit={onSubmit} aria-busy={saving} className="p-6 flex-1 flex flex-col justify-between gap-6 w-full">
        <div className="space-y-4 w-full">
        {error ? (
          <p role="alert" className="text-sm font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
          <Field
            id="stock-code"
            label="Stock code"
            hint={form.itemCode.trim() ? "Saved as entered." : `Blank uses ${fallbackCode}.`}
          >
            <Input
              id="stock-code"
              className="font-mono"
              value={form.itemCode}
              onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))}
              placeholder={fallbackCode}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Field id="stock-name" label="Item name" required>
            <Input
              id="stock-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. A4 paper, 80gsm"
              required
            />
          </Field>
          <Field id="stock-category" label="Category" required>
            <Select value={form.category} onValueChange={(val) => setForm((p) => ({ ...p, category: val }))}>
              <SelectTrigger id="stock-category" displayValue={form.category}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="stock-unit" label="Unit of measure" required>
            <Select value={form.unitOfMeasure} onValueChange={(val) => setForm((p) => ({ ...p, unitOfMeasure: val }))}>
              <SelectTrigger id="stock-unit" displayValue={form.unitOfMeasure}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Field id="stock-zone" label="Zone" required>
            <Select
              value={zoneId}
              disabled={zonesLoading}
              onValueChange={(val) => {
                setZoneId(val);
                setStateId("");
                setStateName("");
              }}
            >
              <SelectTrigger id="stock-zone" displayValue={zones.find((z) => String(z.id) === zoneId)?.label || (zonesLoading ? "Loading zones…" : undefined)}>
                <SelectValue placeholder={zonesLoading ? "Loading zones…" : "Select zone"} />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="stock-state" label="State office store" required hint={zoneId ? undefined : "Select a zone first."}>
            <Select
              value={stateId}
              disabled={!zoneId}
              onValueChange={(val) => {
                const state = states.find((s) => String(s.id) === val);
                setStateId(val);
                setStateName(state?.label || "");
              }}
            >
              <SelectTrigger id="stock-state" displayValue={stateId ? storeLocation : undefined}>
                <SelectValue placeholder={zoneId ? "Select state store" : "Select zone first"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{storeNameFromState(s.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <Field id="stock-qty" label="Quantity on hand" required>
            <Input
              id="stock-qty"
              type="number"
              min={0}
              inputMode="numeric"
              className="tabular-nums"
              value={form.quantityInStock}
              onChange={(e) => setForm((p) => ({ ...p, quantityInStock: e.target.value }))}
              placeholder="0"
              required
            />
          </Field>
          <Field id="stock-reorder" label="Reorder level" hint="Low stock starts here.">
            <Input
              id="stock-reorder"
              type="number"
              min={0}
              inputMode="numeric"
              className="tabular-nums"
              value={form.reorderLevel}
              onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
            />
          </Field>
          <Field id="stock-price" label="Unit price (NGN)" hint="Blank is saved as zero.">
            <Input
              id="stock-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className="tabular-nums"
              value={form.unitPrice}
              onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))}
              placeholder="0.00"
            />
          </Field>
        </section>

        </div>

        <div className="mt-auto space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#d4e8dc] bg-[#f4f7f5] px-4 py-3 text-sm w-full">
          <span className="font-mono text-xs font-semibold text-[#145c3f]" translate="no">{itemCode}</span>
          <span className="text-slate-700">{form.name.trim() || "Item name"}</span>
          <span className="text-slate-600">{storeLocation || "Store not selected"}</span>
          {slipStatus ? (
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${slipStatus.className}`}>{slipStatus.label}</span>
          ) : null}
          <span className="sm:ml-auto font-semibold tabular-nums text-slate-900">
            {stockValue === null ? (priceBlank ? "Not priced" : "—") : naira.format(stockValue)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 w-full">
          <Button type="button" variant="outline" onClick={() => navigate("/store-management/inventory/items")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white">
            {saving ? "Saving…" : "Add to register"}
          </Button>
        </div>
        </div>
      </form>
      </div>
    </PageLayout>
  );
}
