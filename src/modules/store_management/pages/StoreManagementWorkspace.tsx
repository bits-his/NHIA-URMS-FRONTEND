import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, RefreshCw, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import InventoryItemsView from "./InventoryItemsView";
import StockIssuesView from "./StockIssuesView";

type TabKey = "inventory" | "issuance";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "issuance", label: "Issuance", icon: Send },
];

export default function StoreManagementWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "inventory";
  const [refreshSignal, setRefreshSignal] = useState(0);

  const setTab = (tab: TabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  const handleCreate = () => {
    if (activeTab === "inventory") {
      navigate("/store-management/inventory/items/new");
    } else {
      navigate("/store-management/transfers/new");
    }
  };

  const createLabel = activeTab === "inventory" ? "Add stock" : "New issue";

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
        <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">Store Management</h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshSignal((n) => n + 1)}
            className="gap-2 border-[#d4e8dc]"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button
            className="bg-orange-action hover:bg-orange-600 gap-2 shadow-md shadow-orange-500/15"
            onClick={handleCreate}
          >
            <Plus className="w-4 h-4" /> {createLabel}
          </Button>
        </div>
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-2 overflow-x-auto -mb-px" role="tablist">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tab.key)}
                className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all outline-none ${
                  active
                    ? "border-[#1a7a52] text-[#1a7a52]"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? "text-[#1a7a52]" : "text-slate-400 group-hover:text-slate-600"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-5">
          {activeTab === "inventory" ? (
            <InventoryItemsView embedded refreshSignal={refreshSignal} />
          ) : (
            <StockIssuesView embedded refreshSignal={refreshSignal} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
