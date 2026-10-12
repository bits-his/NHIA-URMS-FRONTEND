import * as React from "react";
import { useNavigate } from "react-router-dom";
import StateOfficeReportsList from "./StateOfficeReportsList";
import ActivityReportingTemplateForm from "./ActivityReportingTemplateForm";
import {
  PROVIDER_MANAGEMENT_NAV_TITLE,
  PROVIDER_MANAGEMENT_PATH,
  PROVIDER_PILLAR_CHILDREN,
} from "./enrolmentPillarTypes";
import { ACTIVITY_TEMPLATE_BY_MODULE } from "./activityReportTemplateConfig";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const DEFAULT_MODULE = PROVIDER_PILLAR_CHILDREN[0]?.key ?? "medical-audits";
const DEFAULT_CONFIG = ACTIVITY_TEMPLATE_BY_MODULE[DEFAULT_MODULE]!;

const MODULE_LABELS = Object.fromEntries(
  PROVIDER_PILLAR_CHILDREN.map((c) => [c.key, c.navLabel]),
);

/**
 * Single Provider Management hub: one list for all modules; type chosen in the form.
 */
export default function ProviderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <StateOfficeReportsList
      reportType="accreditation"
      listTitle={PROVIDER_MANAGEMENT_NAV_TITLE}
      activityModuleColumn
      activityModuleLabels={MODULE_LABELS}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      renderForm={({ reportId, onBack: formBack, onSubmitted, defaultZoneId: z, defaultStateId: s }) => (
        <ActivityReportingTemplateForm
          config={DEFAULT_CONFIG}
          allowModuleSelect
          reportId={reportId}
          onBack={formBack}
          onCancel={formBack}
          onSubmitted={onSubmitted}
          defaultZoneId={z}
          defaultStateId={s}
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
