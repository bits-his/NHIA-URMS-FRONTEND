import * as React from "react";
import { useNavigate } from "react-router-dom";
import StateOfficeReportsList from "./StateOfficeReportsList";
import EnrolmentDriveForm from "./EnrolmentDriveForm";
import {
  ENROLMENT_DRIVES_NAV_TITLE,
  ENROLMENT_DRIVE_REPORT_TYPES,
  ENROLMENT_DRIVE_TYPES,
  enrolmentDriveReportType,
  isEnrolmentDriveType,
} from "./enrolmentDriveTypes";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

const DEFAULT_REPORT_TYPE = enrolmentDriveReportType(ENROLMENT_DRIVE_TYPES[0].key);

/**
 * Single Enrolment Drives hub: one list for all drive types; type is chosen in the form.
 */
export default function EnrolmentDrivesPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <StateOfficeReportsList
      reportType={DEFAULT_REPORT_TYPE}
      reportTypes={[...ENROLMENT_DRIVE_REPORT_TYPES]}
      listTitle={ENROLMENT_DRIVES_NAV_TITLE}
      onBack={onBack}
      defaultZoneId={defaultZoneId}
      defaultStateId={defaultStateId}
      renderForm={({ reportId, reportType, onBack: formBack, onSubmitted, defaultZoneId: z, defaultStateId: s }) => (
        <EnrolmentDriveForm
          reportType={isEnrolmentDriveType(reportType) ? reportType : DEFAULT_REPORT_TYPE}
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

/** Redirect legacy per-type URLs to the merged hub. */
export function EnrolmentDriveLegacyRedirect({ driveKey }: { driveKey: string }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate("/zonal/enrolment-drives", { replace: true });
  }, [driveKey, navigate]);
  return null;
}
