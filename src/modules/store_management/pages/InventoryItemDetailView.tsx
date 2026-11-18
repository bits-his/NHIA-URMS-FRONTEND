import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import PageLayout from "../components/PageLayout";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { toast } from "sonner";

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

function stockMeta(item: any) {
  const qty = Number(item.quantityInStock || 0);
  const reorder = Number(item.reorderLevel || 10);
  const status = item.status as string | undefined;
  if (status === "OUT_OF_STOCK" || qty <= 0) {
    return { label: "Out of stock", className: "bg-rose-50 text-rose-800" };
  }
  if (status === "LOW_STOCK" || qty <= reorder) {
    return { label: "Low stock", className: "bg-amber-50 text-amber-900" };
  }
  return { label: "In stock", className: "bg-[#e8f5ee] text-[#0f3d2e]" };
}

function movementTone(type: string) {
  if (type === "Receipt") return "bg-[#e8f5ee] text-[#0f3d2e]";
  if (type === "Issue") return "bg-amber-50 text-amber-900";
  return "bg-slate-100 text-slate-800";
}

export default function InventoryItemDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [itemRes, moveRes] = await Promise.all([
          stockApi.getInventoryItem(id),
          stockApi.getInventoryMovements(id).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setItem(itemRes.data || null);
          setMovements(Array.isArray(moveRes.data) ? moveRes.data : []);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load inventory item");
        if (!cancelled) {
          setItem(null);
          setMovements([]);
        }
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
      <PageLayout title="Inventory item" description="Loading…">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (!item) {
    return (
      <PageLayout
        title="Item not found"
        description="This catalog entry could not be loaded"
        back
        backTo="/store-management/inventory/items"
      >
        <p className="text-sm text-slate-700">No inventory item for reference {id}.</p>
      </PageLayout>
    );
  }

  const tone = stockMeta(item);
  const unitPrice = Number(item.unitPrice || 0);
  const qty = Number(item.quantityInStock || 0);
  const stockValue = unitPrice * qty;
  const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

  return (
    <PageLayout
      title={item.name}
      description={item.itemCode}
      back
      backTo="/store-management/inventory/items"
      contentClassName="p-2 md:p-2 gap-2"
      actions={
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/store-management/transfers/new")}
        >
          <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Issue
        </Button>
      }
    >
      <SectionBand title="Item">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          <InfoField label="Stock code" value={item.itemCode} mono />
          <InfoField label="Item name" value={item.name} />
          <InfoField label="Status" value={tone.label} />
          <InfoField label="Category" value={item.category} />
          <InfoField label="Unit" value={item.unitOfMeasure} />
          <InfoField label="Store" value={item.storeLocation} />
          <InfoField label="On hand" value={String(qty)} />
          <InfoField label="Reorder" value={item.reorderLevel != null ? String(item.reorderLevel) : null} />
          <InfoField label="Unit price" value={naira.format(unitPrice)} />
          <InfoField label="Stock value" value={naira.format(stockValue)} />
        </div>
      </SectionBand>

      <SectionBand title="Movements">
          {movements.length === 0 ? (
            <p className="text-sm text-slate-600">No movements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f7f5] text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-2.5">Date</th>
                    <th className="text-left px-3 py-2.5">Type</th>
                    <th className="text-left px-3 py-2.5">Reference</th>
                    <th className="text-right px-3 py-2.5">In</th>
                    <th className="text-right px-3 py-2.5">Out</th>
                    <th className="text-right px-3 py-2.5">Balance</th>
                    <th className="text-left px-3 py-2.5">Officer</th>
                    <th className="text-left px-5 py-2.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, idx) => (
                    <tr key={`${m.ref}-${idx}`} className="border-t border-slate-100">
                      <td className="px-5 py-2.5 tabular-nums text-slate-800 whitespace-nowrap">
                        {m.date
                          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(m.date))
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${movementTone(m.type)}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-[#145c3f]" translate="no">
                        {m.ref || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                        {m.qtyIn ? m.qtyIn : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                        {m.qtyOut ? m.qtyOut : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{m.balance ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-700">{m.officer || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-600">{m.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </SectionBand>
    </PageLayout>
  );
}
