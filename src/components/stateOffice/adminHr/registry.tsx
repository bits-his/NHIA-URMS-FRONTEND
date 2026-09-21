import * as React from "react";
import { type AdminHrReportType } from "./constants";
import AdminHrDetail from "./AdminHrDetail";
import OfficeMeetingForm from "./OfficeMeetingForm";
import EtmcCascadingForm from "./EtmcCascadingForm";
import OfficeAccommodationForm from "./OfficeAccommodationForm";
import UtilityServicesForm from "./UtilityServicesForm";
import VehicleMaintenanceForm from "./VehicleMaintenanceForm";
import ConflictInfractionForm from "./ConflictInfractionForm";
import EnrolleeFeedbackForm from "./EnrolleeFeedbackForm";

const FORM_COMPONENTS: Record<AdminHrReportType, React.ComponentType<{
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}>> = {
  "office-meeting": OfficeMeetingForm,
  "etmc-cascading": EtmcCascadingForm,
  "office-accommodation": OfficeAccommodationForm,
  "utility-services": UtilityServicesForm,
  "vehicle-maintenance": VehicleMaintenanceForm,
  "conflict-infraction": ConflictInfractionForm,
  "enrollee-feedback": EnrolleeFeedbackForm,
};

export function AdminHrFormRouter(props: {
  reportType: AdminHrReportType;
  reportId?: number | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}) {
  const Form = FORM_COMPONENTS[props.reportType];
  return <Form {...props} />;
}

export function AdminHrDetailRouter(props: {
  reportType: AdminHrReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}) {
  return <AdminHrDetail {...props} />;
}
