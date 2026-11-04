import * as React from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { challengesSupportApi as api } from "@/lib/api";
import ChallengesSupportDashboardTab from "./ChallengesSupportDashboardTab";

interface Props {
  onBack: () => void;
  embedded?: boolean;
}

export default function ChallengesSupportDashboard({ onBack, embedded = false }: Props) {
  const navigate = useNavigate();
  const [catalogue, setCatalogue] = React.useState<any>(null);
  const [challenges, setChallenges] = React.useState<any[]>([]);
  const [supportList, setSupportList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setError("");
    try {
      const [cat, ch, su] = await Promise.all([api.catalogue(), api.challenges(), api.support()]);
      setCatalogue(cat.data || null);
      setChallenges(ch.data || []);
      setSupportList(su.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={`flex flex-col h-full ${embedded ? "" : "bg-[#f4f7f5]"}`}>
      {!embedded && (
        <div className="bg-white border-b border-[#d4e8dc] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Back" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight text-[#0f3d2e] truncate">
              Challenges & Support Dashboard
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
            <span>Refresh</span>
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 w-full space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <ChallengesSupportDashboardTab
            challenges={challenges}
            supportList={supportList}
            catalogue={catalogue}
            loading={loading || syncing}
            onRefresh={() => {
              setSyncing(true);
              void load();
            }}
            onOpenChallengeDetail={() => navigate("/zonal/challenges")}
            onOpenSupportDetail={() => navigate("/zonal/challenges")}
            onNewChallenge={() => navigate("/zonal/challenges")}
            onNewSupport={() => navigate("/zonal/challenges")}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
