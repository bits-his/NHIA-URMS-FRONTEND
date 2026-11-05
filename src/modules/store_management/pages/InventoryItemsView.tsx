import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { stockApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Eye, PackagePlus, RefreshCw, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { matchesStore, storeNameFromState } from "../lib/storeOptions";
import { ShadcnDataTable } from "@/components/common/ShadcnDataTable";

type Option = { id: string | number; label: string };
type StockKey = "in" | "low" | "out";

interface Props {
  embedded?: boolean;
  refreshSignal?: number;
}

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

export default function InventoryItemsView({ embedded = false, refreshSignal = 0 }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const zoneFilter = searchParams.get("zone") || "";
  const stateFilter = searchParams.get("state") || "";
  const statusFilter = (searchParams.get("status") || "") as "" | StockKey;
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [statesReady, setStatesReady] = useState(!zoneFilter);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stockApi.getInventoryItems();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, refreshSignal]);

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
    if (stateFilter) {
      list = list.filter(
        (item) =>
          String(item.state_code || item.stateCode || "") === String(stateFilter) ||
          (storeLabel && (
            sameStore(item.storeLocation, storeLabel) ||
            (selectedState && sameStore(item.storeLocation, selectedState.label))
          )),
      );
    } else if (zoneFilter && statesReady && states.length) {
      const stateCodes = new Set(states.map((s) => String(s.id)));
      const names = states.map((s) => storeNameFromState(s.label));
      list = list.filter(
        (item) =>
          stateCodes.has(String(item.state_code || item.stateCode || "")) ||
          String(item.zonal_code || item.zoneId || "") === String(zoneFilter) ||
          names.some((name) => sameStore(item.storeLocation, name)),
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) =>
        [item.itemCode, item.name, item.category, item.storeLocation, item.unitOfMeasure]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [items, storeLabel, selectedState, stateFilter, zoneFilter, statesReady, states, query]);

  const counts = useMemo(() => {
    const next = { total: located.length, in: 0, low: 0, out: 0 };
    for (const item of located) next[stockTone(item).key] += 1;
    return next;
  }, [located]);

  const filtered = useMemo(() => {
    if (!statusFilter) return located;
    return located.filter((item) => stockTone(item).key === statusFilter);
  }, [located, statusFilter]);

  const resetFilters = () => {
    setQuery("");
    setParams({ zone: "", state: "", status: "", q: "" });
  };

  const hasActiveFilters = Boolean(zoneFilter || stateFilter || statusFilter || query);

  const statCards = [
    { key: "" as const, label: "Total", value: counts.total, tone: "text-[#0f3d2e] bg-white border-[#d4e8dc]", onClick: () => setParams({ status: "" }) },
    { key: "in" as const, label: "In stock", value: counts.in, tone: "text-emerald-700 bg-emerald-50/80 border-emerald-100", onClick: () => setParams({ status: statusFilter === "in" ? "" : "in" }) },
    { key: "low" as const, label: "Low stock", value: counts.low, tone: "text-amber-800 bg-amber-50/80 border-amber-100", onClick: () => setParams({ status: statusFilter === "low" ? "" : "low" }) },
    { key: "out" as const, label: "Out of stock", value: counts.out, tone: "text-rose-800 bg-rose-50/80 border-rose-100", onClick: () => setParams({ status: statusFilter === "out" ? "" : "out" }) },
  ];

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "code",
        header: "Code",
        accessorKey: "itemCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-[#145c3f]" translate="no">
            {row.original.itemCode}
          </span>
        ),
      },
      {
        id: "item",
        header: "Item",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{row.original.name}</p>
            <p className="text-[11px] text-slate-600">
              {[row.original.category, row.original.unitOfMeasure].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "store",
        header: "Store",
        accessorKey: "storeLocation",
        cell: ({ row }) => <span className="text-slate-800">{row.original.storeLocation || "—"}</span>,
      },
      {
        id: "qty",
        header: "Qty",
        accessorKey: "quantityInStock",
        cell: ({ row }) => (
          <span className="font-mono font-semibold tabular-nums text-slate-900">{row.original.quantityInStock ?? 0}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const tone = stockTone(row.original);
          return (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone.className}`}>
              {tone.label}
            </span>
          );
        },
      },
      {
        id: "view",
        header: "View",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            aria-label={`View ${row.original.name || "item"}`}
            className="h-7 px-2 text-[11px] font-semibold border-[#d4e8dc] text-[#145c3f] hover:bg-[#e8f5ee]"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/store-management/inventory/items/${row.original.id}`);
            }}
          >
            <Eye className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> View
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const listBody = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.onClick}
            className={`rounded-xl border px-4 py-3 text-left transition-shadow ${c.tone} ${
              statusFilter === c.key || (!statusFilter && c.key === "") ? "ring-2 ring-[#1a7a52] ring-offset-1" : ""
            }`}
          >
            <p className="text-2xl font-bold tabular-nums">{loading ? "—" : c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      <Card className="rounded-2xl border-[#d4e8dc]">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-flow-col auto-cols-fr gap-3">
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Zone</Label>
              <Select value={zoneFilter || "ALL"} onValueChange={(val) => setParams({ zone: val === "ALL" ? "" : val, state: "" })}>
                <SelectTrigger displayValue={zones.find((z) => String(z.id) === zoneFilter)?.label || "All zones"}>
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>{z.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">State store</Label>
              <Select
                value={stateFilter || "ALL"}
                disabled={!zoneFilter}
                onValueChange={(val) => setParams({ state: val === "ALL" ? "" : val })}
              >
                <SelectTrigger
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
            </div>
            <div className="space-y-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter || "ALL"} onValueChange={(val) => setParams({ status: val === "ALL" ? "" : val })}>
                <SelectTrigger
                  displayValue={
                    statusFilter === "in" ? "In stock" : statusFilter === "low" ? "Low stock" : statusFilter === "out" ? "Out of stock" : "All statuses"
                  }
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
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" className="text-slate-500 gap-1 shrink-0" onClick={resetFilters}>
                <XCircle className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ShadcnDataTable
        title="INVENTORY REGISTER"
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="Search code, item, store…"
        searchValue={query}
        onSearchChange={setQuery}
        emptyMessage="No stock matches these filters"
        onRowClick={(item) => navigate(`/store-management/inventory/items/${item.id}`)}
        pageSize={50}
        showTableOptions={false}
      />
    </div>
  );

  if (embedded) {
    return listBody;
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Inventory Register</h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={loadItems} disabled={loading} className="gap-2 border-[#d4e8dc]">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
            onClick={() => navigate("/store-management/inventory/items/new")}
          >
            <PackagePlus className="w-4 h-4" /> Add stock
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5">{listBody}</div>
      </ScrollArea>
    </div>
  );
}
