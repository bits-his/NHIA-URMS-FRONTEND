import * as React from "react";
import { type StateOfficeReportType } from "./constants";
import StateOfficeReportPage from "./StateOfficeReportPage";
import StateOfficeReportDetail from "./StateOfficeReportDetail";
import ExtendedReportDetail from "./ExtendedReportDetail";
import ComplaintsReportForm from "./ComplaintsReportForm";
import AccreditationReportForm from "./AccreditationReportForm";
import StakeholderReportForm from "./StakeholderReportForm";
import HmoSelectionReportForm from "./HmoSelectionReportForm";
import ChallengesReportForm from "./ChallengesReportForm";
import WeeklyActionableForm from "./WeeklyActionableForm";
import WeeklyActionableDetail from "./WeeklyActionableDetail";
import ContractedServicesForm from "./ContractedServicesForm";
import ContractedServicesDetail from "./ContractedServicesDetail";
import EnrolleeRegisterForm from "./EnrolleeRegisterForm";
import EnrolleeRegisterDetail from "./EnrolleeRegisterDetail";
import ExtraDependantForm from "./ExtraDependantForm";
import HcpChangeForm from "./HcpChangeForm";
import EtmcTmcActionPointForm from "./EtmcTmcActionPointForm";
import EtmcTmcActionPointDetail from "./EtmcTmcActionPointDetail";
import IctSupportRegisterForm from "./IctSupportRegisterForm";
import IctSupportRegisterDetail from "./IctSupportRegisterDetail";
import AdhocSpecialAssignmentForm from "./AdhocSpecialAssignmentForm";
import AdhocSpecialAssignmentDetail from "./AdhocSpecialAssignmentDetail";

const EXTENDED_DETAIL = new Set<StateOfficeReportType>([
  "complaints", "accreditation", "stakeholder", "hmo-selection", "challenges",
  "extra-dependant", "hcf-change",
]);

const FORM_COMPONENTS: Partial<Record<StateOfficeReportType, React.ComponentType<any>>> = {
  enrolment: StateOfficeReportPage,
  migration: StateOfficeReportPage,
  cemonc: StateOfficeReportPage,
  complaints: ComplaintsReportForm,
  accreditation: AccreditationReportForm,
  stakeholder: StakeholderReportForm,
  "hmo-selection": HmoSelectionReportForm,
  "extra-dependant": ExtraDependantForm,
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
  reportId?: number | null;
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}) {
  const Form = FORM_COMPONENTS[props.reportType] ?? StateOfficeReportPage;
  return <Form {...props} />;
}

export function StateOfficeDetailRouter(props: {
  reportType: StateOfficeReportType;
  reportId: number;
  onBack: () => void;
  onEdit?: () => void;
}) {
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
