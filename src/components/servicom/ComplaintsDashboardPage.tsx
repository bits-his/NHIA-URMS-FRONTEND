import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ComplaintRegisterDashboard from "./ComplaintRegisterDashboard";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  lockLocation?: boolean;
}

export default function ComplaintsDashboardPage({
  onBack,
  defaultZoneId,
  defaultStateId,
  lockLocation,
}: Props) {
  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
          Complaints Dashboard
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          <ComplaintRegisterDashboard
            defaultStateId={defaultStateId}
            defaultZoneId={defaultZoneId}
            lockLocation={lockLocation}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
