import * as React from "react";
import { useNavigate } from "react-router-dom";
import StateOfficeReportsList from "./StateOfficeReportsList";
import ProviderManagementForm from "./ProviderManagementForm";
import {
  PROVIDER_MANAGEMENT_NAV_TITLE,
  PROVIDER_MANAGEMENT_PATH,
  PROVIDER_PILLAR_CHILDREN,
} from "./enrolmentPillarTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const MODULE_LABELS = Object.fromEntries(
  PROVIDER_PILLAR_CHILDREN.map((c) => [c.key, c.navLabel]),
);

/**
 * Provider Management hub — four forms, endorsement workflow, linked facility counts.
 */
export default function ProviderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <StateOfficeReportsList
      reportType="accreditation"
      listTitle={PROVIDER_MANAGEMENT_NAV_TITLE}
      activityModuleColumn
      activityModuleLabels={MODULE_LABELS}
      providerWorkflow
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      renderForm={({ reportId, onBack: formBack, onSubmitted, defaultZoneId: z, defaultStateId: s, onPersisted }) => (
        <ProviderManagementForm
          reportId={reportId}
          onBack={formBack}
          onCancel={formBack}
          onSubmitted={onSubmitted}
          defaultZoneId={z}
          defaultStateId={s}
          onPersisted={onPersisted}
        />
      )}
    />
  );
}

/** Redirect legacy per-module URLs to the merged hub. */
export function ProviderManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(PROVIDER_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
