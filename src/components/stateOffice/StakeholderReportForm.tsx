import StakeholderEngagementForm from "./StakeholderEngagementForm";

interface Props {
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/** Default stakeholder engagement — stepped PPT form. */
export default function StakeholderReportForm(props: Props) {
  return (
    <StakeholderEngagementForm
      {...props}
      activityModule="engagement-coordination"
      pageTitle="Stakeholder Engagement"
    />
  );
}
