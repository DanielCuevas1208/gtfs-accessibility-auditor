import { describe, expect, it } from "vitest";
import type { GtfsFeed, Trip } from "../src/types/gtfs.js";
import { parseWheelchairAccessible } from "../src/types/gtfs.js";
import { auditTripAccessibility } from "../src/audit/tripAccessibility.js";

function trip(
  trip_id: string,
  route_id: string,
  wheelchair_accessible?: string
): Trip {
  return {
    trip_id,
    route_id,
    service_id: "WEEKDAY",
    wheelchair_accessible,
  };
}

function feed(trips: Trip[]): GtfsFeed {
  return {
    agencies: [],
    routes: [],
    stops: [],
    trips,
    stopTimes: [],
  };
}

describe("parseWheelchairAccessible", () => {
  it("parses 0, 1, and 2", () => {
    expect(parseWheelchairAccessible("0")).toBe(0);
    expect(parseWheelchairAccessible("1")).toBe(1);
    expect(parseWheelchairAccessible("2")).toBe(2);
  });

  it("returns null for empty or invalid values", () => {
    expect(parseWheelchairAccessible(undefined)).toBeNull();
    expect(parseWheelchairAccessible("")).toBeNull();
    expect(parseWheelchairAccessible("yes")).toBeNull();
    expect(parseWheelchairAccessible("3")).toBeNull();
  });
});

describe("auditTripAccessibility", () => {
  it("returns an empty summary when the feed has no trips", () => {
    const summary = auditTripAccessibility(feed([]));
    expect(summary.totalTrips).toBe(0);
    expect(summary.accessible).toBe(0);
    expect(summary.coverageRate).toBe(0);
    expect(summary.accessibleRate).toBe(0);
    expect(summary.issues).toHaveLength(0);
  });

  it("counts each wheelchairAccessible status", () => {
    const trips = [
      trip("A", "R1", "1"),
      trip("B", "R1", "2"),
      trip("C", "R2", "0"),
      trip("D", "R2"),
      trip("E", "R3", "yes"),
    ];

    const summary = auditTripAccessibility(feed(trips));

    expect(summary.totalTrips).toBe(5);
    expect(summary.accessible).toBe(1);
    expect(summary.notAccessible).toBe(1);
    expect(summary.unknown).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.invalid).toBe(1);
    expect(summary.coverageRate).toBeCloseTo(0.6, 5);
    expect(summary.accessibleRate).toBeCloseTo(0.2, 5);
  });

  it("flags invalid wheelchair_accessible values", () => {
    const trips = [
      trip("GOOD", "R1", "1"),
      trip("BAD", "R1", "no"),
    ];

    const summary = auditTripAccessibility(feed(trips));

    expect(summary.invalid).toBe(1);
    const issue = summary.issues.find(
      (i) => i.code === "INVALID_WHEELCHAIR_ACCESSIBLE"
    );
    expect(issue).toBeDefined();
    expect(issue!.entityId).toBe("BAD");
    expect(issue!.severity).toBe("warning");
  });

  it("treats whitespace-only values as missing", () => {
    const trips = [trip("W", "R1", "   ")];

    const summary = auditTripAccessibility(feed(trips));

    expect(summary.missing).toBe(1);
    expect(summary.invalid).toBe(0);
    expect(summary.issues).toHaveLength(0);
    expect(summary.coverageRate).toBe(0);
  });

  it("does not mutate the shared empty summary", () => {
    const first = auditTripAccessibility(feed([]));
    first.issues.push({
      code: "X",
      severity: "info",
      message: "m",
      entityType: "trip",
      recommendation: "r",
    });

    const second = auditTripAccessibility(feed([]));
    expect(second.issues).toHaveLength(0);
  });
});