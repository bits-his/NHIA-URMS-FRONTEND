import * as React from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FinanceDashboardTab from "./FinanceDashboardTab";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  lockZone?: boolean;
}

export default function FinanceDashboard({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  lockZone,
}: Props) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            aria-label="Back"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              Finance Dashboard
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Executive overview of Internally Generated Revenue (IGR) and SSHIA quarterly progress
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Standalone Dashboard Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          <FinanceDashboardTab
            key={`executive-dash-${refreshKey}`}
            userRole={userRole}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
            lockZone={lockZone || userRole === "soc-zonal-coordinator" || (userRole && userRole.includes("zonal"))}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
