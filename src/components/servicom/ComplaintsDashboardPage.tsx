import * as React from "react";
import PageLayout from "@/src/components/PageLayout";
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
    <PageLayout
      title="Complaints Dashboard"
      maxWidth="full"
    >
      <div className="space-y-4">
        <ComplaintRegisterDashboard
          defaultStateId={defaultStateId}
          defaultZoneId={defaultZoneId}
          lockLocation={lockLocation}
        />
      </div>
    </PageLayout>
  );
}
