import * as React from "react";
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { stockApi } from "@/lib/api";

import { buildReportingYearOptions } from "./reportingYears";

export const MONTHS = [
  { v: "1", l: "January" }, { v: "2", l: "February" }, { v: "3", l: "March" },
  { v: "4", l: "April" },   { v: "5", l: "May" },      { v: "6", l: "June" },
  { v: "7", l: "July" },    { v: "8", l: "August" },   { v: "9", l: "September" },
  { v: "10", l: "October" },{ v: "11", l: "November" },{ v: "12", l: "December" },
];
export const YEARS = buildReportingYearOptions();

interface Props {
  title: string; dept: string; refId: string | null;
  stateId: string; setStateId: (v: string) => void;
  year: string;    setYear:    (v: string) => void;
  month: string;   setMonth:   (v: string) => void;
  onBack: () => void;
  onSave: () => Promise<void>; onSubmit: () => Promise<void>;
  isSaving: boolean; isSubmitting: boolean;
  children: React.ReactNode;
  // Optional defaults from user context
  defaultZoneId?:  string | null;
  defaultStateId?: string | null;
  yearOptions?: string[];
}

export default function MonthlyFormShell({
  title, dept, refId, stateId, setStateId, year, setYear, month, setMonth,
  onBack, onSave, onSubmit, isSaving, isSubmitting, children,
  defaultZoneId, defaultStateId, yearOptions,
}: Props) {
  const years = yearOptions?.length ? yearOptions : buildReportingYearOptions();
  const [zones,  setZones]  = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "");

  // Auto-select current month
  React.useEffect(() => {
    if (!month) setMonth(String(new Date().getMonth() + 1));
  }, []);

  React.useEffect(() => {
    stockApi.getZones().then(r => setZones(r.data)).catch(() => {});
  }, []);

  // When zone loads, load its states
  React.useEffect(() => {
    if (!zoneId) return;
    stockApi.getStates(zoneId).then(r => {
      setStates(r.data);
      // Auto-select state if defaultStateId matches one in this zone
      if (defaultStateId && r.data.some((s: any) => String(s.id) === defaultStateId)) {
        setStateId(defaultStateId);
      }
    }).catch(() => {});
  }, [zoneId]);

  // Sync defaults when user context arrives
  React.useEffect(() => {
    if (defaultZoneId) setZoneId(defaultZoneId);
  }, [defaultZoneId]);

  React.useEffect(() => {
    if (defaultStateId) setStateId(defaultStateId);
  }, [defaultStateId]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      <div className="bg-white border-b border-border/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
            onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><Send className="w-4 h-4" /> Submit</>}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="w-full px-4 md:px-6 py-4 space-y-4">
          {/* Period + Location selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white rounded-2xl border border-[#d4e8dc]">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Zone <span className="text-red-500">*</span></Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger className="w-full"
                  displayValue={zoneId ? (zones.find(z => String(z.id) === zoneId)?.description ?? "Select Zone") : "Select Zone"}>
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>{zones.map(z => <SelectItem key={z.id} value={String(z.id)}>{z.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">State <span className="text-red-500">*</span></Label>
              <Select value={stateId} onValueChange={setStateId} disabled={!zoneId}>
                <SelectTrigger className="w-full"
                  displayValue={stateId ? (states.find(s => String(s.id) === stateId)?.description ?? "Select State") : "Select State"}>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>{states.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Year <span className="text-red-500">*</span></Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-full" displayValue={year || "Select Year"}>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Month <span className="text-red-500">*</span></Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full"
                  displayValue={month ? (MONTHS.find(m => m.v === month)?.l ?? "Select Month") : "Select Month"}>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {children}

          <div className="flex justify-between pb-8">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button className="bg-orange-action hover:bg-orange-600 gap-2 shadow-lg shadow-orange-500/20"
                onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit Report</>}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
