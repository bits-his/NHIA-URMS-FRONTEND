import * as React from "react";
import { useNavigate } from "react-router-dom";
import EnrolmentDriveWorkspace from "./EnrolmentDriveWorkspace";

interface Props {
  onBack: () => void;
  defaultZoneId?: string | null;
  defaultStateId?: string | null;
}

/**
 * Single Enrolment Drives hub: one list for all drive types; type is chosen in the form.
 */
export default function EnrolmentDrivesPage({ onBack, defaultZoneId, defaultStateId }: Props) {
  return (
    <EnrolmentDriveWorkspace onBack={onBack} defaultZoneId={defaultZoneId} defaultStateId={defaultStateId} />
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
