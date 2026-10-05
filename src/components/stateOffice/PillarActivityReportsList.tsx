import * as React from "react";
import StateOfficeReportsList from "./StateOfficeReportsList";
import ActivityReportingTemplateForm from "./ActivityReportingTemplateForm";
import type { ActivityReportTemplateConfig } from "./activityReportTemplateConfig";
import type { StateOfficeReportType } from "./constants";

interface Props {
  templateConfig: ActivityReportTemplateConfig;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/**
 * Report list + create/edit using the shared Activity Reporting Template for a pillar menu item.
 */
export default function PillarActivityReportsList({
  templateConfig, onBack, defaultZoneId, defaultStateId,
}: Props) {
  return (
    <StateOfficeReportsList
      reportType={templateConfig.reportType as StateOfficeReportType}
      activityModule={templateConfig.activityModule}
      listTitle={templateConfig.pageTitle}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      renderForm={({ reportId, onBack: formBack, onSubmitted, defaultZoneId: z, defaultStateId: s }) => (
        <ActivityReportingTemplateForm
          config={templateConfig}
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
