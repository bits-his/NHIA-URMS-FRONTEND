import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { stockApi } from "@/lib/api";
import PageLayout from "../components/PageLayout";
import { AlertCircle, CheckCircle2, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateReviewAccess } from "@/src/access/createReviewAccess";
import { LOOKUPS } from "@/src/store/useAssetManagement";
import { storeNameFromState } from "../lib/storeOptions";

type Option = { id: number; label: string };

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block font-bold text-slate-700 mb-1">
      {children}
      {required ? <span className="text-rose-600"> *</span> : null}
    </label>
  );
}

const STOCK_CATEGORIES = [
  "Office Consumables",
  ...Object.keys(LOOKUPS.primaryCategories).filter((c) => c !== "Land" && c !== "Building"),
];
const UNITS = ["Units", "Pieces", "Packs", "Boxes", "Reams", "Cartons", "Sets", "Litres", "Pairs"];

const PROCUREMENT_INSTRUMENTS = [
  "LPO",
  "Contract Award",
  "Purchase Order",
  "Work Order",
  "Service Order",
  "Other",
];

const EMPTY_FORM = {
  entryDate: "",
  procurementInstrument: "",
  contractorName: "",
  contractorAddress: "",
  refInvoiceDeliveryNote: "",
  itemDescription: "",
  category: "Office Consumables",
  unitOfMeasure: "Units",
  zoneId: "",
  zoneName: "",
  stateId: "",
  stateName: "",
  storeLocation: "",
  quantityOrdered: "",
  quantitySupplied: "",
  rate: "",
  remarks: "",
};

export default function NewPrepaymentAnalysisView() {
  const navigate = useNavigate();
  const { createOnly } = useCreateReviewAccess();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);

  useEffect(() => {
    stockApi.getZones()
      .then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description }))))
      .catch(() => setZones([]));
  }, []);

  useEffect(() => {
    if (!form.zoneId) { setStates([]); return; }
    let cancelled = false;
    stockApi.getStates(form.zoneId)
      .then((r) => {
        if (!cancelled) setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
      })
      .catch(() => { if (!cancelled) setStates([]); });
    return () => { cancelled = true; };
  }, [form.zoneId]);

  const set = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (validationError) setValidationError(null);
  };

  const validate = (): boolean => {
    if (!form.entryDate) {
      setValidationError("Please enter the Date.");
      return false;
    }
    if (!form.procurementInstrument) {
      setValidationError("Please select a Procurement Instrument.");
      return false;
    }
    if (!form.refInvoiceDeliveryNote.trim()) {
      setValidationError("Please enter the Invoice / Delivery Note reference.");
      return false;
    }
    if (!form.contractorName.trim()) {
      setValidationError("Please enter the Contractor's Name.");
      return false;
    }
    if (!form.contractorAddress.trim()) {
      setValidationError("Please enter the Contractor's Address.");
      return false;
    }
    if (!form.itemDescription.trim()) {
      setValidationError("Please enter the Item Description.");
      return false;
    }
    if (!form.category) {
      setValidationError("Please select a Category.");
      return false;
    }
    if (!form.unitOfMeasure) {
      setValidationError("Please select a Unit of measure.");
      return false;
    }
    if (!form.zoneId || !form.stateId || !form.storeLocation) {
      setValidationError("Please select the zone and state office store.");
      return false;
    }
    if (form.quantityOrdered === "" || Number(form.quantityOrdered) < 0) {
      setValidationError("Please enter Quantity Ordered.");
      return false;
    }
    if (form.quantitySupplied === "" || Number(form.quantitySupplied) < 0) {
      setValidationError("Please enter Quantity Supplied.");
      return false;
    }
    if (form.rate === "" || Number(form.rate) < 0) {
      setValidationError("Please enter the Rate.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await storeManagementApi.createPrepaymentAnalysis(
        {
          entryDate: form.entryDate,
          procurementInstrument: form.procurementInstrument,
          contractorName: form.contractorName.trim(),
          contractorAddress: form.contractorAddress.trim(),
          refInvoiceDeliveryNote: form.refInvoiceDeliveryNote.trim(),
          itemDescription: form.itemDescription.trim(),
          category: form.category,
          unitOfMeasure: form.unitOfMeasure,
          quantityOrdered: Number(form.quantityOrdered) || 0,
          quantitySupplied: Number(form.quantitySupplied) || 0,
          rate: Number(form.rate) || 0,
          zone_id: form.zoneId,
          state_id: form.stateId,
          zone_name: form.zoneName,
          state_name: form.stateName,
          storeLocation: form.storeLocation,
          remarks: form.remarks.trim(),
        },
        file
      );
      setSuccessMsg(true);
      toast.success("Saved. Quantity supplied was added to the inventory register");
      setTimeout(() => {
        if (createOnly) {
          setForm({ ...EMPTY_FORM });
          setFile(null);
          setSuccessMsg(false);
          setValidationError(null);
          return;
        }
        navigate("/store-management/prepayment-analysis");
      }, 900);
    } catch (err: any) {
      setValidationError(err?.message || "Failed to save");
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Prepayment Analysis Entry"
      description="Control number is assigned when this entry is saved"
      back
      backTo={createOnly ? "/" : "/store-management/prepayment-analysis"}
      contentClassName="flex-1 min-h-0"
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-[600px] w-full flex-1">
      <form onSubmit={handleSave} className="p-6 flex-1 flex flex-col justify-between gap-6 w-full">
        <div className="space-y-4 w-full">
        {validationError ? (
          <p role="alert" className="text-sm font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {validationError}
          </p>
        ) : null}
        {successMsg ? (
          <p className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Entry saved. The supplied quantity is now on the inventory register.
          </p>
        ) : null}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div>
            <FieldLabel htmlFor="prepay-date" required>Date</FieldLabel>
            <Input id="prepay-date" type="date" value={form.entryDate} onChange={(e) => set("entryDate", e.target.value)} />
          </div>
          <div>
            <FieldLabel required>Procurement instrument</FieldLabel>
            <Select value={form.procurementInstrument} onValueChange={(val) => set("procurementInstrument", val)}>
              <SelectTrigger displayValue={form.procurementInstrument || undefined}>
                <SelectValue placeholder="Select instrument" />
              </SelectTrigger>
              <SelectContent>
                {PROCUREMENT_INSTRUMENTS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="prepay-ref" required>Invoice / delivery note</FieldLabel>
            <Input id="prepay-ref" className="font-mono" value={form.refInvoiceDeliveryNote} onChange={(e) => set("refInvoiceDeliveryNote", e.target.value)} placeholder="e.g. INV-2026-0041" />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div>
            <FieldLabel htmlFor="prepay-contractor" required>Contractor&apos;s name</FieldLabel>
            <Input id="prepay-contractor" value={form.contractorName} onChange={(e) => set("contractorName", e.target.value)} placeholder="Supplier / contractor" />
          </div>
          <div>
            <FieldLabel htmlFor="prepay-address" required>Contractor&apos;s address</FieldLabel>
            <Input id="prepay-address" value={form.contractorAddress} onChange={(e) => set("contractorAddress", e.target.value)} placeholder="Registered address" />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="md:col-span-3">
            <FieldLabel htmlFor="prepay-item" required>Item description</FieldLabel>
            <Input id="prepay-item" value={form.itemDescription} onChange={(e) => set("itemDescription", e.target.value)} placeholder="Goods covered by this prepayment" />
          </div>
          <div>
            <FieldLabel required>Category</FieldLabel>
            <Select value={form.category} onValueChange={(val) => set("category", val)}>
              <SelectTrigger displayValue={form.category}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Unit of measure</FieldLabel>
            <Select value={form.unitOfMeasure} onValueChange={(val) => set("unitOfMeasure", val)}>
              <SelectTrigger displayValue={form.unitOfMeasure}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>Zone</FieldLabel>
            <Select
              value={form.zoneId}
              onValueChange={(val) => {
                const zoneName = zones.find((z) => String(z.id) === val)?.label || "";
                setForm((p) => ({ ...p, zoneId: val, zoneName, stateId: "", stateName: "", storeLocation: "" }));
                if (validationError) setValidationError(null);
              }}
            >
              <SelectTrigger displayValue={form.zoneName || undefined}>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel required>State office store</FieldLabel>
            <Select
              value={form.stateId}
              disabled={!form.zoneId}
              onValueChange={(val) => {
                const stateName = states.find((s) => String(s.id) === val)?.label || "";
                setForm((p) => ({ ...p, stateId: val, stateName, storeLocation: storeNameFromState(stateName) }));
                if (validationError) setValidationError(null);
              }}
            >
              <SelectTrigger displayValue={form.storeLocation || undefined}>
                <SelectValue placeholder={form.zoneId ? "Select state store" : "Select zone first"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{storeNameFromState(s.label)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="prepay-ordered" required>Quantity ordered</FieldLabel>
            <Input id="prepay-ordered" type="number" min={0} className="tabular-nums" value={form.quantityOrdered} onChange={(e) => set("quantityOrdered", e.target.value)} placeholder="0" />
          </div>
          <div>
            <FieldLabel htmlFor="prepay-supplied" required>Quantity supplied</FieldLabel>
            <Input id="prepay-supplied" type="number" min={0} className="tabular-nums" value={form.quantitySupplied} onChange={(e) => set("quantitySupplied", e.target.value)} placeholder="0" />
          </div>
          <div>
            <FieldLabel htmlFor="prepay-rate" required>Rate (NGN)</FieldLabel>
            <Input id="prepay-rate" type="number" min={0} step="0.01" className="tabular-nums" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder="0.00" />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div>
            <FieldLabel htmlFor="awardLetter">Award letter</FieldLabel>
            <label
              htmlFor="awardLetter"
              className="flex h-11 items-center gap-2 px-3.5 rounded-xl border-2 border-[#1a7a52] bg-[#f4f7f5] text-sm font-medium text-slate-700 cursor-pointer hover:bg-white"
            >
              <Paperclip className="w-4 h-4 text-[#145c3f]" aria-hidden="true" />
              <span className="truncate">{file ? file.name : "Choose PDF, Word, or image"}</span>
            </label>
            <input
              id="awardLetter"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="prepay-remarks">Remarks</FieldLabel>
            <textarea
              id="prepay-remarks"
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              className="min-h-[96px] w-full rounded-xl border-2 border-[#1a7a52] bg-[#f4f7f5] px-3.5 py-2.5 text-sm text-slate-800 outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
              placeholder="Additional notes"
            />
          </div>
        </section>

        </div>

        <div className="flex items-center justify-end border-t border-slate-200 pt-4 w-full mt-auto">
          <Button type="submit" disabled={saving} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden="true" /> : null}
            {saving ? "Saving…" : "Save to register"}
          </Button>
        </div>
      </form>
      </div>
    </PageLayout>
  );
}
