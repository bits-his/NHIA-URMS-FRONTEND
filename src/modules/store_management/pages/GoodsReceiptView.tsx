import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/src/store/store";
import { fetchGoodsReceipts } from "@/src/store/slices/storeManagementSlice";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Download } from "lucide-react";
import PageLayout from "../components/PageLayout";

export default function GoodsReceiptView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const { goodsReceipts, loading } = useSelector((s: RootState) => s.storeManagement);

  useEffect(() => {
    dispatch(fetchGoodsReceipts());
  }, [dispatch]);

  const fields: CustomTableField[] = [
    { title: "GRN Ref No", value: "grnNumber", className: "font-mono font-bold text-slate-800" },
    { title: "Supplier Name", value: "supplierName" },
    { title: "PO Ref", value: "poNumber", className: "font-mono" },
    { title: "Received Date", value: "receivedDate" },
    { title: "Received By", value: "receivedBy" },
    {
      title: "Status",
      value: "status",
      custom: true,
      component: (item) => (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          {item.status || "RECEIVED"}
        </Badge>
      ),
    },
  ];

  return (
    <PageLayout
      title="Goods Receipt Notes (GRN)"
      description="Verification and recording of supplies delivered to NHIA stores"
      actions={
        <>
          <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200">
            <Download className="w-4 h-4 mr-1.5" /> Export GRN Log
          </Button>
          <Button size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> New Goods Receipt
          </Button>
        </>
      }
    >
      <CustomTable
        data={goodsReceipts}
        fields={fields}
        filter={true}
        loading={loading}
        pageSize={15}
        message="No goods receipts found"
      />
    </PageLayout>
  );
}
