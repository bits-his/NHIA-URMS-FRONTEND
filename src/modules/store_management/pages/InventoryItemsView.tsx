import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Eye, Package, PackagePlus, PackageX, Search } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { matchesStore, storeNameFromState } from "../lib/storeOptions";

type Option = { id: number; label: string };
type StockKey = "in" | "low" | "out";

function stockTone(item: any): { key: StockKey; label: string; className: string } {
  const qty = Number(item.quantityInStock || 0);
  const reorder = Number(item.reorderLevel || 10);
  const status = item.status as string | undefined;
  if (status === "OUT_OF_STOCK" || qty <= 0) {
    return { key: "out", label: "Out of stock", className: "bg-rose-50 text-rose-800" };
  }
  if (status === "LOW_STOCK" || qty <= reorder) {
    return { key: "low", label: "Low stock", className: "bg-amber-50 text-amber-900" };
  }
  return { key: "in", label: "In stock", className: "bg-[#e8f5ee] text-[#0f3d2e]" };
}

function sameStore(itemStore: string | null | undefined, selected: string) {
  if (matchesStore(itemStore, selected)) return true;
  const words = (value: string) =>
    value
      .toLowerCase()
      .replace(/\b(store|office|state|zonal)\b/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2);
  const itemWords = words(String(itemStore || ""));
  const selectedWords = words(selected);
  return selectedWords.some((word) => itemWords.includes(word));
}

export default function InventoryItemsView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const zoneFilter = searchParams.get("zone") || "";
  const stateFilter = searchParams.get("state") || "";
  const statusFilter = (searchParams.get("status") || "") as "" | StockKey;
  const q = searchParams.get("q") || "";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [statesReady, setStatesReady] = useState(!zoneFilter);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await stockApi.getInventoryItems();
        if (!cancelled) setItems(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    stockApi.getZones().then((r) => setZones((r.data || []).map((z: any) => ({ id: z.id, label: z.description })))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!zoneFilter) {
      setStates([]);
      setStatesReady(true);
      return;
    }
    let cancelled = false;
    setStatesReady(false);
    stockApi.getStates(zoneFilter)
      .then((r) => {
        if (!cancelled) setStates((r.data || []).map((s: any) => ({ id: s.id, label: s.description })));
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setStatesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [zoneFilter]);

  const selectedState = states.find((s) => String(s.id) === String(stateFilter));
  const storeLabel = selectedState ? storeNameFromState(selectedState.label) : "";

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val) next.set(key, val);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const located = useMemo(() => {
    let list = items;
    if (storeLabel && selectedState) {
      list = list.filter(
        (item) => sameStore(item.storeLocation, storeLabel) || sameStore(item.storeLocation, selectedState.label)
      );
    } else if (zoneFilter && statesReady && states.length) {
      const names = states.map((s) => storeNameFromState(s.label));
      list = list.filter((item) =>
        names.some((name) => sameStore(item.storeLocation, name))
      );
    }
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((item) =>
        [item.itemCode, item.name, item.category, item.storeLocation, item.unitOfMeasure]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    return list;
  }, [items, storeLabel, selectedState, zoneFilter, statesReady, states, q]);

  const counts = useMemo(() => {
    const next = { total: located.length, in: 0, low: 0, out: 0 };
    for (const item of located) next[stockTone(item).key] += 1;
    return next;
  }, [located]);

  const filtered = useMemo(() => {
    if (!statusFilter) return located;
    return located.filter((item) => stockTone(item).key === statusFilter);
  }, [located, statusFilter]);

  const kpis = [
    { key: "" as const, label: "Total", value: counts.total, icon: <Package className="w-3.5 h-3.5 text-[#25a872]" />, accent: "border-[#d4e8dc] bg-white" },
    { key: "in" as const, label: "In stock", value: counts.in, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, accent: "border-emerald-200 bg-emerald-50/50" },
    { key: "low" as const, label: "Low stock", value: counts.low, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />, accent: "border-amber-200 bg-amber-50/50" },
    { key: "out" as const, label: "Out of stock", value: counts.out, icon: <PackageX className="w-3.5 h-3.5 text-rose-600" />, accent: "border-rose-200 bg-rose-50/50" },
  ];

  const fields: CustomTableField[] = [
    {
      title: "Code",
      value: "itemCode",
      custom: true,
      component: (item) => (
        <span className="font-mono text-xs font-semibold text-[#145c3f]" translate="no">
          {item.itemCode}
        </span>
      ),
    },
    {
      title: "Item",
      value: "name",
      className: "min-w-[180px]",
      custom: true,
      component: (item) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{item.name}</p>
          <p className="text-[11px] text-slate-600">{[item.category, item.unitOfMeasure].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      ),
    },
    {
      title: "Store",
      value: "storeLocation",
      custom: true,
      component: (item) => <span className="text-slate-800">{item.storeLocation || "—"}</span>,
    },
    {
      title: "Qty",
      value: "quantityInStock",
      custom: true,
      component: (item) => (
        <span className="font-mono font-semibold tabular-nums text-slate-900">{item.quantityInStock ?? 0}</span>
      ),
    },
    {
      title: "Status",
      value: "status",
      custom: true,
      component: (item) => {
        const tone = stockTone(item);
        return (
          <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone.className}`}>
            {tone.label}
          </span>
        );
      },
    },
    {
      title: "",
      value: "id",
      custom: true,
      component: (item) => (
        <Button
          size="sm"
          variant="outline"
          aria-label={`View ${item.name || "item"}`}
          className="h-7 px-2 text-[11px] font-semibold border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
          onClick={() => navigate(`/store-management/inventory/items/${item.id}`)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> View
        </Button>
      ),
    },
  ];

  return (
    <PageLayout
      title="Inventory Register"
      description="Store stock on the register"
      actions={
        <Button
          size="sm"
          className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-8 font-semibold"
          onClick={() => navigate("/store-management/inventory/items/new")}
        >
          <PackagePlus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> Add stock
        </Button>
      }
      contentClassName="gap-3"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((kpi) => {
          const active = statusFilter === kpi.key || (!statusFilter && kpi.key === "");
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setParams({ status: kpi.key })}
              className={`rounded-lg border px-3 py-2 flex items-center gap-2.5 text-left ${kpi.accent} ${active ? "ring-2 ring-[#145c3f] ring-offset-1" : ""}`}
            >
              {kpi.icon}
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-800 tabular-nums leading-none">{kpi.value}</p>
                <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{kpi.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-[#d4e8dc] bg-white p-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 items-center">
          <div className="relative min-w-0 col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a7a6a] pointer-events-none" aria-hidden="true" />
            <input
              id="inv-search"
              type="search"
              value={q}
              onChange={(e) => setParams({ q: e.target.value })}
              placeholder="Search code, item, store…"
              aria-label="Search inventory"
              className="h-9 w-full min-w-0 rounded-lg border-2 border-[#1a7a52] bg-[#f4f7f5] pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none hover:bg-white focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25"
            />
          </div>
          <Select value={zoneFilter || "ALL"} onValueChange={(val) => setParams({ zone: val === "ALL" ? "" : val, state: "" })}>
            <SelectTrigger id="inv-zone" size="sm" displayValue={zones.find((z) => String(z.id) === zoneFilter)?.label || "All zones"}>
              <SelectValue placeholder="All zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stateFilter || "ALL"}
            disabled={!zoneFilter}
            onValueChange={(val) => setParams({ state: val === "ALL" ? "" : val })}
          >
            <SelectTrigger
              id="inv-state"
              size="sm"
              displayValue={
                !zoneFilter
                  ? "Select zone first"
                  : states.find((s) => String(s.id) === stateFilter)
                    ? storeNameFromState(states.find((s) => String(s.id) === stateFilter)?.label)
                    : "All state stores"
              }
            >
              <SelectValue placeholder="All state stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All state stores</SelectItem>
              {states.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{storeNameFromState(s.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "ALL"} onValueChange={(val) => setParams({ status: val === "ALL" ? "" : val })}>
            <SelectTrigger
              id="inv-status"
              size="sm"
              displayValue={statusFilter === "in" ? "In stock" : statusFilter === "low" ? "Low stock" : statusFilter === "out" ? "Out of stock" : "All statuses"}
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="in">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-w-0 w-full flex-1">
        <CustomTable
          data={filtered}
          fields={fields}
          filter={false}
          loading={loading}
          pageSize={15}
          message="No stock matches these filters"
        />
      </div>
    </PageLayout>
  );
}
