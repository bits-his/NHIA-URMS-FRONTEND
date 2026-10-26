import * as React from "react";
import { stockApi } from "@/lib/api";

interface DropdownOption { id: number; label: string; }

export function useStateOfficeHeader(defaultZoneId?: string | null, defaultStateId?: string | null) {
  const hydratingRef = React.useRef(false);
  const lockZone  = !!defaultZoneId;
  const lockState = !!defaultStateId;

  const [zones,  setZones]  = React.useState<DropdownOption[]>([]);
  const [states, setStates] = React.useState<DropdownOption[]>([]);
  const [zoneId, setZoneId] = React.useState(defaultZoneId ?? "");
  const [stateId, setStateId] = React.useState(defaultStateId ?? "");
  const [reportYear, setReportYear] = React.useState(String(new Date().getFullYear()));
  const [reportMonth, setReportMonth] = React.useState(String(new Date().getMonth() + 1));
  const [submitDate, setSubmitDate] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    stockApi.getZones().then(r =>
      setZones(r.data.map((z: any) => ({ id: z.id, label: z.description })))
    ).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (hydratingRef.current) return;
    if (!lockState) setStateId("");
    setStates([]);
    if (!zoneId) return;
    stockApi.getStates(zoneId).then(r => {
      const stateOpts = r.data.map((s: any) => ({ id: s.id, label: s.description }));
      setStates(stateOpts);
      if (lockState && defaultStateId) setStateId(defaultStateId);
      else if (defaultStateId && r.data.some((s: any) => String(s.id) === defaultStateId)) {
        setStateId(defaultStateId);
      }
    }).catch(() => {});
  }, [zoneId, lockState, defaultStateId]);

  React.useEffect(() => { if (defaultZoneId) setZoneId(defaultZoneId); }, [defaultZoneId]);
  React.useEffect(() => { if (defaultStateId) setStateId(defaultStateId); }, [defaultStateId]);

  const applyHeader = (data: any) => {
    hydratingRef.current = true;
    const zoneIdStr = String(data.zone_id);
    const stateIdStr = String(data.state_id);
    setZoneId(zoneIdStr);
    setStateId(stateIdStr);
    setReportYear(String(data.reporting_year));
    setReportMonth(String(data.reporting_month));
    setSubmitDate(data.submission_date ? String(data.submission_date).slice(0, 10) : "");
    stockApi.getStates(zoneIdStr).then(r => {
      setStates(r.data.map((s: any) => ({ id: s.id, label: s.description })));
      hydratingRef.current = false;
    }).catch(() => { hydratingRef.current = false; });
  };

  const resetHeader = () => {
    setZoneId(defaultZoneId ?? "");
    setStateId(defaultStateId ?? "");
    setReportYear(String(new Date().getFullYear()));
    setReportMonth(String(new Date().getMonth() + 1));
    setSubmitDate(new Date().toISOString().slice(0, 10));
  };

  const headerPayload = (status: "draft" | "submitted" | "approved") => ({
    zone_id: zoneId,
    state_id: stateId,
    reporting_year: Number(reportYear),
    reporting_month: Number(reportMonth),
    submission_date: submitDate || null,
    submitted_by: "State Office",
    status,
  });

  const validateHeader = () => {
    if (!zoneId) return "Please select a Zone";
    if (!stateId) return "Please select a State";
    if (!reportYear || !reportMonth) return "Please select reporting period";
    return null;
  };

  return {
    zones, states, zoneId, setZoneId, stateId, setStateId,
    reportYear, setReportYear, reportMonth, setReportMonth, submitDate, setSubmitDate,
    lockZone, lockState, hydratingRef, applyHeader, resetHeader, headerPayload, validateHeader,
  };
}
