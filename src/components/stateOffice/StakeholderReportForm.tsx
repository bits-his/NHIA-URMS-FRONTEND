import ActivityReportingTemplateForm from "./ActivityReportingTemplateForm";
import { ACTIVITY_TEMPLATE_BY_MODULE } from "./activityReportTemplateConfig";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/** Default stakeholder engagement menu — shared activity template. */
export default function StakeholderReportForm(props: Props) {
  return (
    <ActivityReportingTemplateForm
      {...props}
      config={ACTIVITY_TEMPLATE_BY_MODULE["engagement-coordination"]}
    />
  );
}
