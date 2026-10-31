import assert from "node:assert/strict";
import test from "node:test";
import { driveReportingMonth, driveReportingPeriod, hasPendingDriveActivity, shouldOpenDriveActivityForm } from "./enrolmentDriveTypes";
import { Dropdown } from "./EnrolmentDriveWorkspace";

test("clearing an activity keeps dropdowns controlled instead of displaying stale selections", () => {
  for (const selectedValue of ["advocacy", "Budgeted (Approved Release)"]) {
    const props = { options: [{ value: selectedValue, label: "Readable selection" }], onChange: () => {} };
    assert.equal(Dropdown({ ...props, value: selectedValue }).props.value, selectedValue);
    assert.equal(Dropdown({ ...props, value: "" }).props.value, "");
  }
});

test("unlisted entries are detected while cleared entries and calculated metadata are ignored", () => {
  assert.equal(hasPendingDriveActivity({ drive_type: "", target_audience: [], remarks: " " }), false);
  assert.equal(hasPendingDriveActivity({ enrolment_count: 0, revision: 1, evidence: [], enrolment_records: [] }), false);
  assert(hasPendingDriveActivity({ drive_type: "advocacy" }));
  assert(hasPendingDriveActivity({ target_audience: ["Students"] }));
  assert(hasPendingDriveActivity({ target_audience_reached: 0 }));
  assert(hasPendingDriveActivity({ reference_id: "EDAC-EXISTING" }));
});

test("new editable reports open the first activity directly", () => {
  assert(shouldOpenDriveActivityForm({ status: "draft", activities: [] }));
  assert(shouldOpenDriveActivityForm({ status: "returned", activities: [] }));
  assert(shouldOpenDriveActivityForm({ status: "draft" }));
});

test("Record activities always opens the editable form, including reports with listed activities", () => {
  for (const status of ["draft", "returned"]) {
    assert(shouldOpenDriveActivityForm({ status, activities: [{}] }, 1));
    for (const step of [0, 2, 3]) assert.equal(shouldOpenDriveActivityForm({ status, activities: [{}] }, step), false);
  }
});

test("locked reports do not open a blank activity entry form", () => {
  for (const status of ["awaiting_review", "endorsed", "submitted"]) {
    assert.equal(shouldOpenDriveActivityForm({ status, activities: [] }), false);
  }
});

test("reporting month round trips without changing the reporting year or month", () => {
  for (let month = 1; month <= 12; month++) {
    const value = driveReportingMonth(2026, month);
    assert.equal(value, `2026-${String(month).padStart(2, "0")}`);
    assert.deepEqual(driveReportingPeriod(value), { reporting_year: "2026", reporting_month: String(month) });
  }
});

test("cleared and invalid month values cannot silently become a different period", () => {
  assert.equal(driveReportingMonth("", ""), "");
  assert.equal(driveReportingMonth("2026", "13"), "");
  for (const value of ["", "2026-13", "2026-00", "invalid", "2026-1"]) {
    assert.deepEqual(driveReportingPeriod(value), { reporting_year: "", reporting_month: "" });
  }
});
