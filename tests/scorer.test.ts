import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadGtfsFeed } from "../src/ingest/gtfsLoader.js";
import { auditCoverage } from "../src/audit/coverage.js";
import { auditDataQuality } from "../src/audit/dataQuality.js";
import { auditRouteGaps } from "../src/audit/routeGaps.js";
import { computeAccessibilityScore } from "../src/scoring/scorer.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("computeAccessibilityScore", () => {
  it("produces a deterministic score for the sample feed", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const coverage = auditCoverage(feed);
    const dataQuality = auditDataQuality(feed);
    const routeGaps = auditRouteGaps(feed);

    const score = computeAccessibilityScore(coverage, dataQuality, routeGaps);

    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.grade).toMatch(/^[A-F]$/);
    expect(score.components).toHaveLength(4);
    expect(score.components.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 5);

    const recomputed = computeAccessibilityScore(coverage, dataQuality, routeGaps);
    expect(recomputed.overall).toBe(score.overall);
    expect(recomputed.grade).toBe(score.grade);
  });

  it("assigns grade F for empty feed metrics", () => {
    const coverage = {
      totalStops: 0,
      boardingStops: 0,
      accessible: 0,
      notAccessible: 0,
      unknown: 0,
      missing: 0,
      coverageRate: 0,
      knownRate: 0,
      accessibleRate: 0,
    };
    const dataQuality = {
      invalidWheelchairValues: 0,
      duplicateStopIds: 0,
      orphanStopTimes: 0,
      tripsWithoutStops: 0,
      issues: [],
    };

    const score = computeAccessibilityScore(coverage, dataQuality, []);
    expect(score.overall).toBeLessThan(60);
    expect(score.grade).toBe("F");
  });
});
