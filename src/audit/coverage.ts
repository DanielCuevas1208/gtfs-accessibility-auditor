import type { GtfsFeed, Stop, WheelchairBoarding } from "../types/gtfs.js";
import { parseWheelchairBoarding } from "../types/gtfs.js";
import type { CoverageMetrics, StopAccessibilityMap } from "../types/audit.js";

function isBoardingStop(stop: Stop): boolean {
  const locationType = stop.location_type?.trim();
  return locationType === undefined || locationType === "" || locationType === "0" || locationType === "4";
}

export function buildStopAccessibilityMap(feed: GtfsFeed): StopAccessibilityMap {
  const map: StopAccessibilityMap = {};
  for (const stop of feed.stops) {
    map[stop.stop_id] = parseWheelchairBoarding(stop.wheelchair_boarding);
  }
  return map;
}

export function auditCoverage(feed: GtfsFeed): CoverageMetrics {
  const boardingStops = feed.stops.filter(isBoardingStop);
  let accessible = 0;
  let notAccessible = 0;
  let unknown = 0;
  let missing = 0;

  for (const stop of boardingStops) {
    const value = parseWheelchairBoarding(stop.wheelchair_boarding);
    if (value === null) {
      if (
        stop.wheelchair_boarding === undefined ||
        stop.wheelchair_boarding.trim() === ""
      ) {
        missing++;
      } else {
        unknown++;
      }
    } else if (value === 1) {
      accessible++;
    } else if (value === 2) {
      notAccessible++;
    } else {
      unknown++;
    }
  }

  const totalStops = boardingStops.length;
  const known = accessible + notAccessible + unknown;
  const knownRate = totalStops === 0 ? 0 : known / totalStops;
  const coverageRate =
    totalStops === 0 ? 0 : (accessible + notAccessible) / totalStops;
  const accessibleRate = totalStops === 0 ? 0 : accessible / totalStops;

  return {
    totalStops,
    boardingStops: totalStops,
    accessible,
    notAccessible,
    unknown,
    missing,
    coverageRate,
    knownRate,
    accessibleRate,
  };
}

export function classifyStop(
  stop: Stop
): WheelchairBoarding | "missing" | "invalid" {
  const raw = stop.wheelchair_boarding;
  if (raw === undefined || raw.trim() === "") {
    return "missing";
  }
  const parsed = parseWheelchairBoarding(raw);
  if (parsed === null) {
    return "invalid";
  }
  return parsed;
}
