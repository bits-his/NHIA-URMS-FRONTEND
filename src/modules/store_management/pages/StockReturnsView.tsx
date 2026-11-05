import React from "react";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "../components/PageLayout";

export default function StockReturnsView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const stockReturns = [
    { returnNo: "SR-2026-001", department: "Finance & Admin", item: "Printer Toner Cartridge (Black)", qty: 2, reason: "Excess Issue", date: "2026-08-01", status: "RETURNED_TO_STOCK" },
    { returnNo: "SR-2026-002", department: "ICT Support", item: "Network Patch Cable 5m", qty: 5, reason: "Unused Cable Run", date: "2026-08-05", status: "RETURNED_TO_STOCK" },
  ];

  const fields: CustomTableField[] = [
    { title: "Return Voucher", value: "returnNo", className: "font-mono font-bold text-slate-800" },
    { title: "Department", value: "department" },
    { title: "Item Name", value: "item" },
    { title: "Qty Returned", value: "qty", className: "text-right font-bold" },
    { title: "Reason for Return", value: "reason" },
    { title: "Date", value: "date" },
    {
      title: "Status",
      value: "status",
      custom: true,
      component: (item) => (
        <Badge className="bg-sky-100 text-sky-800 border-sky-200">
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <PageLayout
      title="Stock Returns"
      description="Log of unissued or returned inventory items back to main store depot"
      actions={
        <Button size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Log Stock Return
        </Button>
      }
    >
      <CustomTable data={stockReturns} fields={fields} filter={true} pageSize={10} />
    </PageLayout>
  );
}
