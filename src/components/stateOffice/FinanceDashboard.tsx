import * as React from "react";
import { ArrowLeft, RefreshCw, LayoutDashboard, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import FinanceDashboardTab from "./FinanceDashboardTab";
import IgrDashboard from "./IgrDashboard";
import SshiaDashboard from "./SshiaDashboard";

import PageLayout from "../PageLayout";
import { UnderHeaderNavTabs } from "@/src/components/UnderHeaderNavTabs";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  userRole?: string;
  lockZone?: boolean;
}

type FinanceDashTab = "overview" | "igr" | "sshia";

const TABS: { key: FinanceDashTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "igr", label: "IGR", icon: Landmark },
  { key: "sshia", label: "SSHIA", icon: ShieldCheck },
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
    <PageLayout
      title={dashTitle}
      showBack={false}
      badge={
        <span className="rounded-sm bg-[#145c3f] text-white text-[10px] font-bold tracking-wide px-2 py-0.5">
          {roleChip}
        </span>
      }
      actions={
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
      }
      tabs={
        <UnderHeaderNavTabs
          tabs={TABS.map((t) => ({
            id: t.key,
            label: t.label,
            icon: t.icon,
          }))}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          ariaLabel="Finance dashboard sections"
        />
      }
    >
      <div className="w-full">
        {activeTab === "overview" ? (
          <div className="w-full space-y-4">
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
        ) : activeTab === "igr" ? (
          <IgrDashboard key={`igr-dash-${refreshKey}`} embedded {...shared} onBack={onBack} />
        ) : (
          <SshiaDashboard key={`sshia-dash-${refreshKey}`} embedded {...shared} onBack={onBack} />
        )}
      </div>
    </PageLayout>
  );
}
