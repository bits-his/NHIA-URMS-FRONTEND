import React from "react";
import CustomTable, { CustomTableField } from "@/components/CustomTable";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "../components/PageLayout";

export default function StoreListView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const storeDirectories = [
    { storeCode: "STR-HQ-01", name: "HQ Main Depot Store", location: "HQ Abuja, Basement Floor", officer: "Garba Danjuma", capacity: "Primary Warehouse", status: "ACTIVE" },
    { storeCode: "STR-SW-01", name: "South West Zonal Store", location: "Lagos Office, Ikeja", officer: "Funke Adebayo", capacity: "Regional Depot", status: "ACTIVE" },
    { storeCode: "STR-NW-01", name: "North West Zonal Store", location: "Kano Office, Commercial Layout", officer: "Kabiru Usman", capacity: "Regional Depot", status: "ACTIVE" },
  ];

  const fields: CustomTableField[] = [
    { title: "Store Code", value: "storeCode", className: "font-mono font-bold text-slate-800" },
    { title: "Store Name", value: "name" },
    { title: "Physical Location", value: "location" },
    { title: "Store Officer", value: "officer" },
    { title: "Capacity Level", value: "capacity" },
    {
      title: "Status",
      value: "status",
      custom: true,
      component: (item) => (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <PageLayout
      title="Store Directory & Warehouses"
      description="Registered physical stores and warehouses across NHIA state and zonal offices"
      actions={
        <Button size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Store
        </Button>
      }
    >
      <CustomTable data={storeDirectories} fields={fields} filter={true} pageSize={10} />
    </PageLayout>
  );
}
