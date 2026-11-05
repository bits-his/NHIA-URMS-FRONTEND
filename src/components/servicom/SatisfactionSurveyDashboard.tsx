import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { servicomApi } from "@/lib/api";
import { zonesApi, statesApi } from "@/lib/adminApi";
import PageLayout from "@/src/components/PageLayout";
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
    <PageLayout
      title="Satisfaction Survey Dashboard"
      maxWidth="full"
      actions={
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
      }
    >
      <div className="space-y-4">
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
    </PageLayout>
  );
}
