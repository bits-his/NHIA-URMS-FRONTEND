import * as React from "react";
import { ArrowLeft, RefreshCw, LayoutDashboard, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FinanceDashboardTab from "./FinanceDashboardTab";
import IgrDashboard from "./IgrDashboard";
import SshiaDashboard from "./SshiaDashboard";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  lockZone?: boolean;
}

type FinanceDashTab = "overview" | "igr" | "sshia";

const TABS: { key: FinanceDashTab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="size-4 shrink-0" /> },
  { key: "igr", label: "IGR", icon: <Landmark className="size-4 shrink-0" /> },
  { key: "sshia", label: "SSHIA", icon: <ShieldCheck className="size-4 shrink-0" /> },
];

export default function FinanceDashboard({
  onBack,
  defaultZoneId,
  defaultStateId,
  userRole,
  lockZone,
}: Props) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [syncing, setSyncing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<FinanceDashTab>("overview");

  const handleSync = () => {
    setSyncing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSyncing(false), 600);
  };

  const shared = {
    defaultZoneId,
    defaultStateId,
    userRole,
  };

  const isNational = userRole === "sdo" || userRole === "dg-ceo" || userRole === "admin" || !userRole;
  const isZonal =
    lockZone ||
    userRole === "soc-zonal-coordinator" ||
    !!(userRole && userRole.includes("zonal") && !isNational);
  const isState = !!defaultStateId || (!!userRole && userRole.includes("state") && !isZonal && !isNational);
  const dashTitle = isState
    ? "State Finance Detail"
    : isZonal
      ? "Zonal Coordinator Dashboard — Assigned Zone"
      : "SDO Dashboard — National Overview";
  const roleChip = isState ? "STATE" : isZonal ? "ZONAL" : "SDO";

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
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
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            {dashTitle}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex rounded-sm bg-[#145c3f] text-white text-[10px] font-bold tracking-wide px-2.5 py-1">
            {roleChip}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
            disabled={syncing}
            onClick={handleSync}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 sticky top-[57px] z-20">
        <div className="flex gap-4 overflow-x-auto -mb-px" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`group relative shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all outline-none ${
                activeTab === tab.key
                  ? "border-[#145c3f] text-[#145c3f]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 w-full space-y-4">
            <FinanceDashboardTab
              key={`executive-dash-${refreshKey}`}
              userRole={userRole}
              defaultZoneId={defaultZoneId}
              defaultStateId={defaultStateId}
              lockZone={
                lockZone ||
                userRole === "soc-zonal-coordinator" ||
                !!(userRole && userRole.includes("zonal"))
              }
            />
          </div>
        </ScrollArea>
      ) : activeTab === "igr" ? (
        <IgrDashboard key={`igr-dash-${refreshKey}`} embedded {...shared} onBack={onBack} />
      ) : (
        <SshiaDashboard key={`sshia-dash-${refreshKey}`} embedded {...shared} onBack={onBack} />
      )}
    </div>
  );
}
