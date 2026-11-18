import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { storeManagementApi } from "@/src/services/storeManagementApi";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Paperclip } from "lucide-react";

const API_ORIGIN = ((import.meta.env?.VITE_API_URL as string) || "http://localhost:3001/api").replace(/\/api\/?$/, "");

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function SectionBand({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-[#d4e8dc] bg-white overflow-hidden shadow-sm">
      <div className="bg-[#e8f5ee] px-3 py-2 border-b border-[#d4e8dc]">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#0f3d2e]">{title}</h3>
      </div>
      <div className="p-3 bg-[#f4f7f5]">{children}</div>
    </section>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-medium text-slate-800 break-words ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export default function PrepaymentAnalysisDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await storeManagementApi.getPrepaymentAnalysisById(id);
        if (!cancelled) setRow(res?.data || res || null);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageLayout title="Stock Prepayment Register" description="Loading register entry…">
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-200/70" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-56 rounded-xl bg-slate-100" />
            <div className="h-56 rounded-xl bg-slate-100" />
            <div className="h-56 rounded-xl bg-slate-100" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!row) {
    return (
      <PageLayout
        title="Entry Not Found"
        description="This record is not on the Stock Prepayment Register"
        back
        backTo="/store-management/prepayment-analysis"
      >
        <div className="p-6 text-center bg-white rounded-sm border border-[#d4e8dc]">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Entry Found</h3>
          <p className="text-xs text-slate-500 mt-0.5">No stock prepayment register entry matches ID: {id || "—"}</p>
          <Button
            size="sm"
            onClick={() => navigate("/store-management/prepayment-analysis")}
            className="mt-4 bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs"
          >
            Go to Register
          </Button>
        </div>
      </PageLayout>
    );
  }

  const ordered = Number(row.quantityOrdered || 0);
  const supplied = Number(row.quantitySupplied || 0);
  const variance = ordered - supplied;
  const matched = ordered === supplied;
  const rate = Number(row.rate || 0);
  const lineValue = rate * ordered;

  return (
    <PageLayout
      title={row.controlNumber || "Stock Prepayment Register Entry"}
      description={matched ? "Qty matched" : "Qty variance"}
      back
      backTo="/store-management/prepayment-analysis"
      contentClassName="p-2 md:p-2 gap-2"
    >
      <SectionBand title="Entry">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Control number" value={row.controlNumber} mono />
          <InfoField label="Date" value={formatDate(row.entryDate)} />
          <InfoField label="Status" value={matched ? "Qty matched" : "Qty variance"} />
          <InfoField label="Instrument" value={row.procurementInstrument} />
          <InfoField label="Invoice / delivery note" value={row.refInvoiceDeliveryNote} mono />
          <InfoField label="Category" value={row.category} />
        </div>
      </SectionBand>

      <SectionBand title="Contractor and item">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Contractor" value={row.contractorName} />
          <InfoField label="Address" value={row.contractorAddress} />
          <InfoField label="Item" value={row.itemDescription} />
          <InfoField label="Zone" value={row.zone_name} />
          <InfoField label="Store" value={row.storeLocation || row.state_name} />
          <InfoField label="Unit" value={row.unitOfMeasure} />
        </div>
      </SectionBand>

      <SectionBand title="Quantities">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Ordered" value={String(ordered)} />
          <InfoField label="Supplied" value={String(supplied)} />
          <InfoField label="Variance" value={variance === 0 ? "0" : variance > 0 ? `−${variance}` : `+${Math.abs(variance)}`} />
          <InfoField label="Rate" value={naira.format(rate)} />
          <InfoField label="Line value" value={naira.format(lineValue)} />
          <InfoField
            label="Award letter"
            value={row.awardLetterPath ? (
              <a
                href={`${API_ORIGIN}${row.awardLetterPath}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#145c3f] hover:underline"
              >
                <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="truncate">{row.awardLetterName || "View attachment"}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : null}
          />
        </div>
      </SectionBand>

      {row.remarks?.trim() ? (
        <SectionBand title="Remarks">
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{row.remarks.trim()}</p>
        </SectionBand>
      ) : null}
    </PageLayout>
  );
}
