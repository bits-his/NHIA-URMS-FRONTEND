import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { stockApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Tag } from "lucide-react";
import { toast } from "sonner";
import { matchesStore, storeNameFromState, SELECT_CLS, LABEL_CLS } from "../lib/storeOptions";

type Option = { id: number; label: string };

export default function NewCapitalisationView() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [stateId, setStateId] = useState("");
  const [stateName, setStateName] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    stockApi.getInventoryItems()
      .then((r) => setCatalog(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Failed to load inventory"));
    stockApi.getZones()
      .then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description }))))
      .catch(() => {});
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

  const storeName = storeNameFromState(stateName);
  const storeItems = useMemo(
    () => storeName ? catalog.filter((i) => matchesStore(i.storeLocation, storeName) && Number(i.quantityInStock || 0) > 0) : [],
    [catalog, storeName]
  );
  const selected = storeItems.find((i) => String(i.id) === String(itemId));

  const continueToRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Select a store item to capitalise");
      return;
    }
    const qty = Math.min(Math.max(1, quantity), Number(selected.quantityInStock || 1));
    navigate("/store-management/assets/register", {
      state: {
        fromCapitalisation: true,
        inventoryItemId: selected.id,
        quantity: qty,
        prefill: {
          name: selected.name,
          primaryCategory: selected.category || "Office Equipment",
          acquisitionCost: selected.unitPrice || "",
          facilitySite: "State Office",
          specificLocation: selected.storeLocation,
        },
      },
    });
  };

  return (
    <PageLayout
      title="Capitalise to Asset"
      description="Convert store stock into a tagged asset on the master register"
      actions={
        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Back
        </Button>
      }
    >
      <form onSubmit={continueToRegister} className="w-full">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#145c3f] text-white px-5 py-4">
            <h2 className="text-base font-bold tracking-tight text-white">Capitalise to Asset</h2>
            <p className="text-xs text-emerald-100/90">Select the store and the stock item to convert</p>
          </div>

          <div className="p-5 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Store</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={LABEL_CLS} htmlFor="cap-zone">Zone <span className="text-rose-500">*</span></label>
                  <select
                    id="cap-zone"
                    className={SELECT_CLS}
                    value={zoneId}
                    onChange={(e) => { setZoneId(e.target.value); setStateId(""); setStateName(""); setItemId(""); }}
                  >
                    <option value="">Select zone…</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="cap-state">State office store <span className="text-rose-500">*</span></label>
                  <select
                    id="cap-state"
                    className={SELECT_CLS}
                    value={stateId}
                    disabled={!zoneId}
                    onChange={(e) => {
                      setStateId(e.target.value);
                      setStateName(states.find((s) => String(s.id) === e.target.value)?.label || "");
                      setItemId("");
                    }}
                  >
                    <option value="">{zoneId ? "Select state…" : "Select zone first"}</option>
                    {states.map((s) => <option key={s.id} value={s.id}>{storeNameFromState(s.label)}</option>)}
                  </select>
                </div>
                {storeName ? (
                  <div>
                    <p className={LABEL_CLS}>Capitalising from</p>
                    <p className="h-10 flex items-center px-3 rounded-lg border border-[#25a872]/40 bg-[#e8f5ee] text-sm font-semibold text-[#0f3d2e]">
                      {storeName}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Item</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS} htmlFor="cap-item">Inventory item <span className="text-rose-500">*</span></label>
                  <select
                    id="cap-item"
                    className={SELECT_CLS}
                    value={itemId}
                    disabled={!storeName}
                    onChange={(e) => setItemId(e.target.value)}
                  >
                    <option value="">{storeName ? "Select item on hand…" : "Select store first"}</option>
                    {storeItems.map((i) => (
                      <option key={i.id} value={i.id}>{i.itemCode} — {i.name} ({i.quantityInStock} on hand)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS} htmlFor="cap-qty">Quantity to capitalise</label>
                  <Input
                    id="cap-qty"
                    type="number"
                    min={1}
                    max={Number(selected?.quantityInStock || 1)}
                    inputMode="numeric"
                    className={`${SELECT_CLS} tabular-nums`}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  />
                </div>
                {selected ? (
                  <div>
                    <p className={LABEL_CLS}>On hand</p>
                    <p className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold tabular-nums">
                      {selected.quantityInStock}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="flex justify-end px-5 py-4 border-t border-slate-200">
            <Button type="submit" disabled={!selected} className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs font-bold h-10">
              <Tag className="h-4 w-4 mr-1.5" aria-hidden="true" /> Continue to Asset Register
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
