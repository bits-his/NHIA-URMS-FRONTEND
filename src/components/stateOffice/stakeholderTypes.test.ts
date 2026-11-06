import assert from "node:assert/strict";
import test from "node:test";
import {
  STAKEHOLDER_ENGAGEMENT_CATEGORIES,
  STAKEHOLDER_OUTCOME_MAPPING,
  outcomeCategoriesForEngagement,
  specificOutcomesFor,
  isValidStakeholderOutcome,
} from "./stakeholderTypes";

test("every engagement offers Other and every outcome category offers Others", () => {
  for (const engagement of STAKEHOLDER_ENGAGEMENT_CATEGORIES) {
    const categories = outcomeCategoriesForEngagement(engagement.label);
    assert(categories.includes("Other"), engagement.label);
    assert.equal(categories.length, new Set(categories).size);
    for (const category of categories) {
      const specifics = specificOutcomesFor(engagement.label, category);
      assert(specifics.includes("Other"), `${engagement.label}: ${category}`);
      assert.equal(specifics.length, new Set(specifics).size);
    }
  }
});

test("existing mapped outcomes remain available without exposing unrelated categories", () => {
  for (const row of STAKEHOLDER_OUTCOME_MAPPING) {
    for (const engagement of row.engagementCategories) {
      for (const category of row.outcomeCategories) {
        assert(specificOutcomesFor(engagement, category).includes(row.specificOutcome));
      }
    }
  }
  assert(!outcomeCategoriesForEngagement("Capacity Building").includes("Claims/payment issues resolved"));
});

test("empty or invalid selections do not offer outcomes", () => {
  assert.deepEqual(outcomeCategoriesForEngagement(""), []);
  assert.deepEqual(specificOutcomesFor("", "Other"), []);
  assert.deepEqual(specificOutcomesFor("Capacity Building", ""), []);
  assert.deepEqual(specificOutcomesFor("Capacity Building", "Unknown"), []);
});

test("specified Other values remain valid after saving and reloading", () => {
  const outcome = JSON.parse(JSON.stringify({
    outcome_category: "Other: New partnership activity",
    specific_outcome: "Other: Agreed a joint work plan",
  }));
  assert(isValidStakeholderOutcome("Capacity Building", outcome.outcome_category, outcome.specific_outcome));
  assert(isValidStakeholderOutcome("Capacity Building", "Technical capacity improved", outcome.specific_outcome));
  assert(isValidStakeholderOutcome("Capacity Building", "Other (Specify): New partnership activity", "Others (Specify): Agreed a joint work plan"));
  assert(!isValidStakeholderOutcome("Capacity Building", "Other:   ", outcome.specific_outcome));
  assert(!isValidStakeholderOutcome("Capacity Building", outcome.outcome_category, "Other:   "));
  assert(!isValidStakeholderOutcome("Capacity Building", "Unknown", outcome.specific_outcome));
  assert(!isValidStakeholderOutcome("Capacity Building", outcome.outcome_category, `Other: ${"x".repeat(200)}`));
});
