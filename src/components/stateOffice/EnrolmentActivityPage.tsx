import * as React from "react";
import { ClipboardCheck, IdCard, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react";
import StateOfficeReportsList from "./StateOfficeReportsList";
import EnrolmentActivityForm from "./EnrolmentActivityForm";
import { ENROLMENT_ACTIVITIES, type EnrolmentActivityValue } from "./enrolmentPillarTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const ACTIVITY_ICONS: Record<EnrolmentActivityValue, LucideIcon> = {
  enrolment: UserPlus,
  nin_validation: ShieldCheck,
  id_card_issuance: IdCard,
  validation_of_enrolees: ClipboardCheck,
};

/**
 * Enrolment Activity Reporting hub — activities as top tabs;
 * list + "New …" button follow the selected activity.
 */
export default function EnrolmentActivityPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <StateOfficeReportsList
      reportType="enrolment"
      listTitle="Enrolment Activity Reporting"
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      activityTabs={ENROLMENT_ACTIVITIES.map((a) => ({
        value: a.value,
        label: a.tabLabel,
        newLabel: a.newLabel,
        description: a.description,
        icon: ACTIVITY_ICONS[a.value],
      }))}
      renderForm={({
        reportId, onBack: formBack, onSubmitted, defaultZoneId: z, defaultStateId: s, initialCategory,
      }) => (
        <EnrolmentActivityForm
          reportId={reportId}
          onBack={formBack}
          onCancel={formBack}
          onSubmitted={onSubmitted}
          defaultZoneId={z}
          defaultStateId={s}
          initialCategory={initialCategory}
        />
      )}
    />
  );
}
