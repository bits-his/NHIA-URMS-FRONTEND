import * as React from "react";
import { useNavigate } from "react-router-dom";
import StateOfficeReportsList from "./StateOfficeReportsList";
import ActivityReportingTemplateForm from "./ActivityReportingTemplateForm";
import {
  STAKEHOLDER_MANAGEMENT_NAV_TITLE,
  STAKEHOLDER_MANAGEMENT_PATH,
  STAKEHOLDER_PILLAR_CHILDREN,
} from "./enrolmentPillarTypes";
import { ACTIVITY_TEMPLATE_BY_MODULE } from "./activityReportTemplateConfig";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const DEFAULT_MODULE = STAKEHOLDER_PILLAR_CHILDREN[0]?.key ?? "meetings-sshias";
const DEFAULT_CONFIG = ACTIVITY_TEMPLATE_BY_MODULE[DEFAULT_MODULE]!;

const MODULE_LABELS = Object.fromEntries(
  STAKEHOLDER_PILLAR_CHILDREN.map((c) => [c.key, c.navLabel]),
);

/**
 * Single Stakeholder Management hub: one list for all modules; type chosen in the form.
 */
export default function StakeholderManagementPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <StateOfficeReportsList
      reportType="stakeholder"
      listTitle={STAKEHOLDER_MANAGEMENT_NAV_TITLE}
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
export function StakeholderManagementLegacyRedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(STAKEHOLDER_MANAGEMENT_PATH, { replace: true });
  }, [navigate]);
  return null;
}
