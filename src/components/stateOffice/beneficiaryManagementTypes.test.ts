import assert from "node:assert/strict";
import test from "node:test";
import { extraDependantProgress, sameDependantPrincipal } from "./beneficiaryManagementTypes";

const principal = { enrolment_reference_id: "ENR-2026-00001", principle_nhia_number: "NHIA-001" };
const saved = (id: string, dependent: string) => ({ ...principal, id, dependent, request: "extra" });

test("starts at Dependent 1 and advances across saved and pending records", () => {
  assert.equal(extraDependantProgress(principal, []).next, "dependent_1");
  assert.equal(extraDependantProgress(principal, [saved("ED-1", "dependent_1")]).next, "dependent_2");
  assert.equal(extraDependantProgress(principal, [saved("ED-1", "dependent_1"), saved("local-2", "dependent_2")]).next, "dependent_3");
});

test("counts the same saved record once and ignores other principals and additional dependants", () => {
  const first = saved("ED-1", "dependent_1");
  const progress = extraDependantProgress(principal, [first, first,
    { id: "other", enrolment_reference_id: "ENR-2", principle_nhia_number: "NHIA-002", dependent: "dependent_2" },
    { ...saved("additional", "dependent_2"), request: "additional" },
  ]);
  assert.equal(progress.count, 1);
  assert.equal(progress.next, "dependent_2");
});

test("retains the sequence after gaps and stops at the existing three-dependent limit", () => {
  assert.equal(extraDependantProgress(principal, [saved("ED-2", "dependent_2")]).next, "dependent_3");
  assert.equal(extraDependantProgress(principal, [saved("ED-3", "dependent_3")]).next, null);
});

test("counts legacy unnumbered extra dependants but does not count Principal as a dependant", () => {
  const progress = extraDependantProgress(principal, [saved("legacy", ""), saved("principal", "principal")]);
  assert.equal(progress.count, 1);
  assert.equal(progress.next, "dependent_2");
});

test("identifies principals using enrolment reference or NHIA number, not names", () => {
  assert(sameDependantPrincipal(principal, { enrolment_reference_id: principal.enrolment_reference_id }));
  assert(sameDependantPrincipal(principal, { nhia_number: "NHIA-001" }));
  assert(!sameDependantPrincipal({}, {}));
  assert(!sameDependantPrincipal(principal, { nhia_number: "NHIA-002" }));
});
