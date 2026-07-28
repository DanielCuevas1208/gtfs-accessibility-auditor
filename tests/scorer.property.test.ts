import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { parseWheelchairBoarding } from "../src/types/gtfs.js";
import { computeAccessibilityScore } from "../src/scoring/scorer.js";
import type { CoverageMetrics, DataQualitySummary } from "../src/types/audit.js";

describe("parseWheelchairBoarding property tests", () => {
  it("returns null for arbitrary non-numeric strings except 0,1,2", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const trimmed = s.trim();
        if (trimmed === "0" || trimmed === "1" || trimmed === "2") {
          return true;
        }
        const result = parseWheelchairBoarding(s);
        if (trimmed === "") {
          return result === null;
        }
        const n = Number(trimmed);
        if (n === 0 || n === 1 || n === 2) {
          return result === n;
        }
        return result === null;
      })
    );
  });

  it("always returns 0, 1, 2, or null for any string input", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = parseWheelchairBoarding(s);
        return result === null || result === 0 || result === 1 || result === 2;
      })
    );
  });
});

describe("computeAccessibilityScore property tests", () => {
  const coverageArb: fc.Arbitrary<CoverageMetrics> = fc.record({
    totalStops: fc.nat({ max: 1000 }),
    boardingStops: fc.nat({ max: 1000 }),
    accessible: fc.nat({ max: 1000 }),
    notAccessible: fc.nat({ max: 1000 }),
    unknown: fc.nat({ max: 1000 }),
    missing: fc.nat({ max: 1000 }),
    coverageRate: fc.double({ min: 0, max: 1, noNaN: true }),
    knownRate: fc.double({ min: 0, max: 1, noNaN: true }),
    accessibleRate: fc.double({ min: 0, max: 1, noNaN: true }),
  });

  const dataQualityArb: fc.Arbitrary<DataQualitySummary> = fc.record({
    invalidWheelchairValues: fc.nat({ max: 50 }),
    duplicateStopIds: fc.nat({ max: 20 }),
    orphanStopTimes: fc.nat({ max: 50 }),
    tripsWithoutStops: fc.nat({ max: 20 }),
    issues: fc.constant([]),
  });

  it("overall score is always between 0 and 100", () => {
    fc.assert(
      fc.property(coverageArb, dataQualityArb, (coverage, dq) => {
        const score = computeAccessibilityScore(coverage, dq, []);
        return score.overall >= 0 && score.overall <= 100;
      })
    );
  });

  it("weighted component scores sum to overall score (within rounding)", () => {
    fc.assert(
      fc.property(coverageArb, dataQualityArb, (coverage, dq) => {
        const score = computeAccessibilityScore(coverage, dq, []);
        const sum = Math.round(
          score.components.reduce((s, c) => s + c.weightedScore, 0)
        );
        return Math.abs(sum - score.overall) <= 1;
      })
    );
  });

  it("grade is consistent with overall score bands", () => {
    fc.assert(
      fc.property(coverageArb, dataQualityArb, (coverage, dq) => {
        const score = computeAccessibilityScore(coverage, dq, []);
        if (score.overall >= 90) return score.grade === "A";
        if (score.overall >= 80) return score.grade === "B";
        if (score.overall >= 70) return score.grade === "C";
        if (score.overall >= 60) return score.grade === "D";
        return score.grade === "F";
      })
    );
  });
});
