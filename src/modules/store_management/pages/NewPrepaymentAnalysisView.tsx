import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import PageLayout from "../components/PageLayout";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Paperclip,
  Save,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

const PROCUREMENT_INSTRUMENTS = [
  "LPO",
  "Contract Award",
  "Purchase Order",
  "Work Order",
  "Service Order",
  "Other",
];

export default function NewPrepaymentAnalysisView() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    entryDate: "",
    procurementInstrument: "",
    contractorName: "",
    contractorAddress: "",
    refInvoiceDeliveryNote: "",
    itemDescription: "",
    quantityOrdered: "",
    quantitySupplied: "",
    rate: "",
    remarks: "",
  });

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
          quantityOrdered: Number(form.quantityOrdered) || 0,
          quantitySupplied: Number(form.quantitySupplied) || 0,
          rate: Number(form.rate) || 0,
          remarks: form.remarks.trim(),
        },
        file
      );
      setSuccessMsg(true);
      toast.success("Prepayment analysis entry saved");
      setTimeout(() => navigate("/store-management/prepayment-analysis"), 900);
    } catch (err: any) {
      setValidationError(err?.message || "Failed to save");
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title={
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-[#25a872]" /> Prepayment Analysis Entry
        </span>
      }
      description="Stock Verification Prepayment Analysis Register"
      back
      backTo="/store-management/prepayment-analysis"
    >
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col w-full">
        <div className="bg-[#145c3f] text-white p-4 border-b border-[#0f3d2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 border border-white/20 rounded-lg text-emerald-200">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Prepayment Analysis Data Entry</h2>
              <p className="text-xs text-emerald-100/90">National Health Insurance Authority — Stock Verification</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-emerald-200 border border-white/20">
            Control No. auto on save
          </span>
        </div>

        {validationError && (
          <div className="m-4 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md font-semibold text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            {validationError}
          </div>
        )}
        {successMsg && (
          <div className="m-4 mb-0 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-semibold text-xs flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Entry saved to the Prepayment Analysis Register.
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 text-xs">
          <section className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#145c3f]" />
              PROCUREMENT DETAILS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => set("entryDate", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Procurement Instrument <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.procurementInstrument}
                  onChange={(e) => set("procurementInstrument", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                >
                  <option value="">Select instrument…</option>
                  {PROCUREMENT_INSTRUMENTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ref (Invoice / Delivery Note) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.refInvoiceDeliveryNote}
                  onChange={(e) => set("refInvoiceDeliveryNote", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono font-semibold"
                  placeholder="e.g. INV-2026-0041"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#145c3f]" />
              CONTRACTOR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contractor&apos;s Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.contractorName}
                  onChange={(e) => set("contractorName", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-semibold"
                  placeholder="Supplier / contractor"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contractor&apos;s Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.contractorAddress}
                  onChange={(e) => set("contractorAddress", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300"
                  placeholder="Registered address"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#145c3f]" />
              ITEM & QUANTITIES
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Item Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.itemDescription}
                onChange={(e) => set("itemDescription", e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 font-semibold"
                placeholder="Goods or services covered by this prepayment"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#f4f7f5] p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Quantity Ordered <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.quantityOrdered}
                  onChange={(e) => set("quantityOrdered", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Quantity Supplied <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.quantitySupplied}
                  onChange={(e) => set("quantitySupplied", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono bg-white"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Rate (₦) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => set("rate", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 font-mono font-bold bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#145c3f]" />
              AWARD LETTER & REMARKS
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Attach Award Letter</label>
              <label
                htmlFor="awardLetter"
                className="flex h-11 items-center gap-2 px-3 rounded border border-dashed border-slate-300 bg-[#f4f7f5] text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
              >
                <Paperclip className="w-4 h-4 text-[#145c3f]" aria-hidden="true" />
                <span className="truncate">{file ? file.name : "Choose PDF, Word, or image…"}</span>
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
              <label className="block font-bold text-slate-700 mb-1">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 rounded border border-slate-300 text-sm"
                placeholder="Additional notes…"
              />
            </div>
          </section>

          <div className="flex items-center justify-end border-t pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving…" : "Save to Register"}</span>
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
