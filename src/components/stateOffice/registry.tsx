import * as React from "react";
import { type StateOfficeReportType } from "./constants";
import StateOfficeReportPage from "./StateOfficeReportPage";
import StateOfficeReportDetail from "./StateOfficeReportDetail";
import ExtendedReportDetail from "./ExtendedReportDetail";
import ComplaintsReportForm from "./ComplaintsReportForm";
import AccreditationReportForm from "./AccreditationReportForm";
import StakeholderReportForm from "./StakeholderReportForm";
import StakeholderReportDetail from "./StakeholderReportDetail";
import HmoSelectionReportForm from "./HmoSelectionReportForm";
import ChallengesReportForm from "./ChallengesReportForm";
import WeeklyActionableForm from "./WeeklyActionableForm";
import WeeklyActionableDetail from "./WeeklyActionableDetail";
import ContractedServicesForm from "./ContractedServicesForm";
import ContractedServicesDetail from "./ContractedServicesDetail";
import EnrolleeRegisterForm from "./EnrolleeRegisterForm";
import EnrolleeRegisterDetail from "./EnrolleeRegisterDetail";
import ExtraDependantForm from "./ExtraDependantForm";
import EnrolmentDriveForm from "./EnrolmentDriveForm";
import EnrolmentActivityForm from "./EnrolmentActivityForm";
import EnrolmentReportDetail from "./EnrolmentReportDetail";
import EnrolmentDriveReportDetail from "./EnrolmentDriveReportDetail";
import BeneficiaryManagementReportDetail from "./BeneficiaryManagementReportDetail";
import { ENROLMENT_DRIVE_REPORT_TYPES, isEnrolmentDriveType } from "./enrolmentDriveTypes";
import { BENEFICIARY_REPORT_TYPES } from "./beneficiaryManagementTypes";
import HcpChangeForm from "./HcpChangeForm";
import EtmcTmcActionPointForm from "./EtmcTmcActionPointForm";
import EtmcTmcActionPointDetail from "./EtmcTmcActionPointDetail";
import IctSupportRegisterForm from "./IctSupportRegisterForm";
import IctSupportRegisterDetail from "./IctSupportRegisterDetail";
import AdhocSpecialAssignmentForm from "./AdhocSpecialAssignmentForm";
import AdhocSpecialAssignmentDetail from "./AdhocSpecialAssignmentDetail";

const EXTENDED_DETAIL = new Set<StateOfficeReportType>([
  "complaints", "accreditation", "challenges",
]);

const BENEFICIARY_DETAIL = new Set<string>(BENEFICIARY_REPORT_TYPES);

const FORM_COMPONENTS: Partial<Record<StateOfficeReportType, React.ComponentType<any>>> = {
  enrolment: EnrolmentActivityForm,
  migration: StateOfficeReportPage,
  cemonc: StateOfficeReportPage,
  complaints: ComplaintsReportForm,
  accreditation: AccreditationReportForm,
  stakeholder: StakeholderReportForm,
  "hmo-selection": HmoSelectionReportForm,
  "extra-dependant": ExtraDependantForm,
  ...Object.fromEntries(ENROLMENT_DRIVE_REPORT_TYPES.map((t) => [t, EnrolmentDriveForm])),
  "hcf-change": HcpChangeForm,
  challenges: ChallengesReportForm,
  "weekly-actionable": WeeklyActionableForm,
  "contracted-services": ContractedServicesForm,
  "enrollee-register": EnrolleeRegisterForm,
  "etmc-tmc-action-point": EtmcTmcActionPointForm,
  "ict-support-register": IctSupportRegisterForm,
  "adhoc-special-assignment": AdhocSpecialAssignmentForm,
};

export function StateOfficeFormRouter(props: {
  reportType: StateOfficeReportType;
  reportId?: number | string | null;
  onBack: () => void;
  onCancel?: () => void;
  onSubmitted?: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
  onPersisted?: (saved: { id: number; status: string; reference_id?: string }) => void;
  initialCategory?: string | null;
}) {
  const Form = FORM_COMPONENTS[props.reportType] ?? StateOfficeReportPage;
  return <Form {...props} />;
}

export function StateOfficeDetailRouter(props: {
  reportType: StateOfficeReportType;
  reportId: number | string;
  onBack: () => void;
  onEdit?: () => void;
}) {
  if (props.reportType === "enrolment") {
    return <EnrolmentReportDetail {...props} reportType="enrolment" />;
  }
  if (isEnrolmentDriveType(props.reportType)) {
    return <EnrolmentDriveReportDetail {...props} reportType={props.reportType} />;
  }
  if (BENEFICIARY_DETAIL.has(props.reportType)) {
    return <BeneficiaryManagementReportDetail {...props} reportType={props.reportType} />;
  }
  if (props.reportType === "stakeholder") {
    return <StakeholderReportDetail {...props} reportType="stakeholder" />;
  }
  if (props.reportType === "weekly-actionable") {
    return <WeeklyActionableDetail {...props} />;
  }
  if (props.reportType === "contracted-services") {
    return <ContractedServicesDetail {...props} />;
  }
  if (props.reportType === "enrollee-register") {
    return <EnrolleeRegisterDetail {...props} />;
  }
  if (props.reportType === "etmc-tmc-action-point") {
    return <EtmcTmcActionPointDetail {...props} />;
  }
  if (props.reportType === "ict-support-register") {
    return <IctSupportRegisterDetail {...props} />;
  }
  if (props.reportType === "adhoc-special-assignment") {
    return <AdhocSpecialAssignmentDetail {...props} />;
  }
  if (EXTENDED_DETAIL.has(props.reportType)) {
    return <ExtendedReportDetail {...props} />;
  }
  return <StateOfficeReportDetail {...props} />;
}
