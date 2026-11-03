import * as React from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { servicomApi } from "@/lib/api";
import { zonesApi, statesApi } from "@/lib/adminApi";
import SatisfactionDashboardTab from "./SatisfactionDashboardTab";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  registerPath?: string;
}

export default function SatisfactionSurveyDashboard({
  onBack,
  defaultZoneId,
  defaultStateId,
  registerPath = "/zonal/servicom/satisfaction",
}: Props) {
  const navigate = useNavigate();
  const [surveys, setSurveys] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [sRes, zRes, stRes] = await Promise.all([
        servicomApi.listSatisfactionSurveys({}),
        zonesApi.list(),
        statesApi.list(),
      ]);
      setSurveys(sRes?.data || []);
      setZones(zRes?.data || []);
      setStates(stRes?.data || []);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5]">
      <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
            Satisfaction Survey Dashboard
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8.5 gap-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-[#f4f7f5] text-xs font-bold rounded-sm shadow-2xs"
          disabled={syncing || loading}
          onClick={() => {
            setSyncing(true);
            void load();
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
          <SatisfactionDashboardTab
            surveys={surveys}
            zones={zones}
            states={states}
            loading={loading || syncing}
            defaultZoneId={defaultZoneId}
            defaultStateId={defaultStateId}
            onDrillDownState={() => navigate(registerPath)}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
