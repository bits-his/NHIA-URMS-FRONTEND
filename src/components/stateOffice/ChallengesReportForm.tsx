import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import StateOfficeFormShell from "./StateOfficeFormShell";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

export default function ChallengesReportForm({ reportId, onBack, onCancel, onSubmitted, defaultZoneId, defaultStateId }: Props) {
  const [challenges, setChallenges] = React.useState("");
  const [recommendations, setRecommendations] = React.useState("");

  const loadData = (v: any) => {
    setChallenges(v.challenges ?? "");
    setRecommendations(v.recommendations ?? "");
  };

  return (
    <StateOfficeFormShell
      reportType="challenges" reportId={reportId} onBack={onBack}
      onCancel={onCancel}
      onSubmitted={onSubmitted}
      defaultZoneId={defaultZoneId} defaultStateId={defaultStateId}
      onLoaded={loadData}
      validate={() => (!challenges.trim() && !recommendations.trim()
        ? "Enter challenges and/or recommendations" : null)}
      buildPayload={(base) => ({ ...base, challenges, recommendations })}
    >
      {() => (
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Challenges</CardTitle>
              <CardDescription>Describe challenges encountered during the reporting period.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="sr-only">Challenges</Label>
              <textarea rows={6} placeholder="Enter challenges..." value={challenges}
                onChange={e => setChallenges(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#d4e8dc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
              <CardDescription>Provide recommendations and follow-up actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="sr-only">Recommendations</Label>
              <textarea rows={6} placeholder="Enter recommendations..." value={recommendations}
                onChange={e => setRecommendations(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </CardContent>
          </Card>
        </div>
      )}
    </StateOfficeFormShell>
  );
}
