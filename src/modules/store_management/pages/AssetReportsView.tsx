import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, TrendingUp, Boxes, ShieldCheck, ArrowRightLeft } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import PageLayout from "../components/PageLayout";

export default function AssetReportsView() {
  const categoryData = [
    { category: "Computer Equip.", count: 420, value: 45000000 },
    { category: "Office Furniture", count: 310, value: 28000000 },
    { category: "Office Equip.", count: 180, value: 19500000 },
    { category: "Plant & Machinery", count: 45, value: 65000000 },
    { category: "Motor Vehicles", count: 28, value: 120000000 },
  ];

  return (
    <PageLayout
      title="Store & Asset Analytics"
      description="Executive summaries, depreciation reports, and store inventory metrics"
      actions={
        <Button size="sm" className="bg-[#145c3f] hover:bg-[#0f3d2e] text-white text-xs h-9 font-semibold">
          <Download className="w-4 h-4 mr-1.5" /> Download Full Asset Report
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#25a872]" /> Total Asset Valuation
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">₦277,500,000</p>
            <p className="text-[11px] text-slate-400 mt-1">Across 983 registered assets</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2 font-semibold">
              <Boxes className="w-4 h-4 text-blue-600" /> Active Inventory Items
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">1,420 Units</p>
            <p className="text-[11px] text-slate-400 mt-1">12 items low stock</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2 font-semibold">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" /> Transfers Pending
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">08 Requests</p>
            <p className="text-[11px] text-slate-400 mt-1">Inter-office movements</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2 font-semibold">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Pre-Verifications
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">98.5% Pass</p>
            <p className="text-[11px] text-slate-400 mt-1">Quality assurance rate</p>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Asset Distribution by Major Category</CardTitle>
            <CardDescription className="text-xs">Valuation and physical count spread</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#25a872" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
