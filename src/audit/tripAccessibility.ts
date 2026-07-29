import type { GtfsFeed } from "../types/gtfs.js";
import { parseWheelchairAccessible } from "../types/gtfs.js";
import type { AuditIssue, TripAccessibilitySummary } from "../types/audit.js";

const EMPTY_TRIP_SUMMARY: TripAccessibilitySummary = {
  totalTrips: 0,
  accessible: 0,
  notAccessible: 0,
  unknown: 0,
  missing: 0,
  invalid: 0,
  coverageRate: 0,
  accessibleRate: 0,
  issues: [],
};

function emptySummary(): TripAccessibilitySummary {
  return { ...EMPTY_TRIP_SUMMARY, issues: [] };
}

export function auditTripAccessibility(
  feed: GtfsFeed
): TripAccessibilitySummary {
  const summary = emptySummary();
  const totalTrips = feed.trips.length;

  if (totalTrips === 0) {
    return summary;
  }

  summary.totalTrips = totalTrips;

  for (const trip of feed.trips) {
    const raw = trip.wheelchair_accessible;
    if (raw === undefined || raw.trim() === "") {
      summary.missing++;
      continue;
    }
    const value = parseWheelchairAccessible(raw);
    if (value === null) {
      summary.invalid++;
      summary.issues.push({
        code: "INVALID_WHEELCHAIR_ACCESSIBLE",
        severity: "warning",
        message: `Trip "${trip.trip_id}" has invalid wheelchair_accessible value "${raw}"`,
        entityType: "trip",
        entityId: trip.trip_id,
        field: "wheelchair_accessible",
        recommendation:
          "Set wheelchair_accessible to 0 (unknown), 1 (accessible), or 2 (not accessible).",
      });
      continue;
    }
    if (value === 1) {
      summary.accessible++;
    } else if (value === 2) {
      summary.notAccessible++;
    } else {
      summary.unknown++;
    }
  }

  const covered = summary.accessible + summary.notAccessible + summary.unknown;
  summary.coverageRate = covered / totalTrips;
  summary.accessibleRate =
    totalTrips === 0 ? 0 : summary.accessible / totalTrips;

  return summary;
}

export { EMPTY_TRIP_SUMMARY };