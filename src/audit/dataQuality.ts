import type { GtfsFeed } from "../types/gtfs.js";
import { parseWheelchairBoarding } from "../types/gtfs.js";
import type { AuditIssue, DataQualitySummary } from "../types/audit.js";

export function auditDataQuality(feed: GtfsFeed): DataQualitySummary {
  const issues: AuditIssue[] = [];
  let invalidWheelchairValues = 0;
  let duplicateStopIds = 0;
  let orphanStopTimes = 0;
  let tripsWithoutStops = 0;

  const stopIds = new Set<string>();
  const seenStopIds = new Set<string>();

  for (const stop of feed.stops) {
    if (seenStopIds.has(stop.stop_id)) {
      duplicateStopIds++;
      issues.push({
        code: "DUPLICATE_STOP_ID",
        severity: "critical",
        message: `Duplicate stop_id "${stop.stop_id}"`,
        entityType: "stop",
        entityId: stop.stop_id,
        field: "stop_id",
        recommendation:
          "Ensure each stop_id is unique across stops.txt.",
      });
    }
    seenStopIds.add(stop.stop_id);
    stopIds.add(stop.stop_id);

    const raw = stop.wheelchair_boarding;
    if (raw !== undefined && raw.trim() !== "") {
      const parsed = parseWheelchairBoarding(raw);
      if (parsed === null) {
        invalidWheelchairValues++;
        issues.push({
          code: "INVALID_WHEELCHAIR_BOARDING",
          severity: "warning",
          message: `Stop "${stop.stop_id}" has invalid wheelchair_boarding value "${raw}"`,
          entityType: "stop",
          entityId: stop.stop_id,
          field: "wheelchair_boarding",
          recommendation:
            "Set wheelchair_boarding to 0 (unknown), 1 (accessible), or 2 (not accessible).",
        });
      }
    }
  }

  const tripIds = new Set(feed.trips.map((t) => t.trip_id));
  const stopsPerTrip = new Map<string, number>();

  for (const st of feed.stopTimes) {
  if (!tripIds.has(st.trip_id)) {
      issues.push({
        code: "ORPHAN_STOP_TIME",
        severity: "warning",
        message: `stop_times references unknown trip_id "${st.trip_id}"`,
        entityType: "trip",
        entityId: st.trip_id,
        recommendation: "Remove orphan stop_times or add the missing trip.",
      });
    }
    if (!stopIds.has(st.stop_id)) {
      orphanStopTimes++;
      issues.push({
        code: "ORPHAN_STOP_REFERENCE",
        severity: "warning",
        message: `stop_times references unknown stop_id "${st.stop_id}"`,
        entityType: "stop",
        entityId: st.stop_id,
        recommendation: "Add the missing stop or correct the stop_id reference.",
      });
    }
    stopsPerTrip.set(st.trip_id, (stopsPerTrip.get(st.trip_id) ?? 0) + 1);
  }

  for (const trip of feed.trips) {
    const count = stopsPerTrip.get(trip.trip_id) ?? 0;
    if (count === 0) {
      tripsWithoutStops++;
      issues.push({
        code: "TRIP_WITHOUT_STOPS",
        severity: "critical",
        message: `Trip "${trip.trip_id}" has no stop_times entries`,
        entityType: "trip",
        entityId: trip.trip_id,
        recommendation: "Add stop_times for every published trip.",
      });
    }
  }

  return {
    invalidWheelchairValues,
    duplicateStopIds,
    orphanStopTimes,
    tripsWithoutStops,
    issues,
  };
}
