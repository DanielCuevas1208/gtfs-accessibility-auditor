import type { GtfsFeed } from "../types/gtfs.js";
import { parseWheelchairBoarding, wheelchairLabel } from "../types/gtfs.js";
import type { RouteGap } from "../types/audit.js";
import { buildStopAccessibilityMap } from "./coverage.js";

function routeDisplayName(
  routeId: string,
  shortName?: string,
  longName?: string
): string {
  if (shortName && longName) {
    return `${shortName} – ${longName}`;
  }
  return shortName ?? longName ?? routeId;
}

export function auditRouteGaps(feed: GtfsFeed): RouteGap[] {
  const stopMap = buildStopAccessibilityMap(feed);
  const routeById = new Map(feed.routes.map((r) => [r.route_id, r]));
  const tripsByRoute = new Map<string, Set<string>>();
  const stopsByRoute = new Map<string, Set<string>>();

  for (const trip of feed.trips) {
    if (!tripsByRoute.has(trip.route_id)) {
      tripsByRoute.set(trip.route_id, new Set());
    }
    tripsByRoute.get(trip.route_id)!.add(trip.trip_id);
  }

  const tripToRoute = new Map(feed.trips.map((t) => [t.trip_id, t.route_id]));

  for (const st of feed.stopTimes) {
    const routeId = tripToRoute.get(st.trip_id);
    if (!routeId) {
      continue;
    }
    if (!stopsByRoute.has(routeId)) {
      stopsByRoute.set(routeId, new Set());
    }
    stopsByRoute.get(routeId)!.add(st.stop_id);
  }

  const gaps: RouteGap[] = [];

  for (const [routeId, stopIds] of stopsByRoute) {
    const route = routeById.get(routeId);
    let accessibleStopCount = 0;
    let inaccessibleStopCount = 0;
    let unknownStopCount = 0;

    for (const stopId of stopIds) {
      const value = stopMap[stopId] ?? null;
      if (value === 1) {
        accessibleStopCount++;
      } else if (value === 2) {
        inaccessibleStopCount++;
      } else {
        unknownStopCount++;
      }
    }

    const stopCount = stopIds.size;
    const tripCount = tripsByRoute.get(routeId)?.size ?? 0;

    let gapType: RouteGap["gapType"] | null = null;
    let severity: RouteGap["severity"] = "info";
    let recommendation = "";

    if (accessibleStopCount === 0 && inaccessibleStopCount > 0) {
      gapType = "no_accessible_stops";
      severity = "critical";
      recommendation =
        "Survey stops served by this route and tag accessible boarding locations, or document alternative accessible paths.";
    } else if (
      accessibleStopCount === 0 &&
      unknownStopCount === stopCount &&
      stopCount > 0
    ) {
      gapType = "all_unknown";
      severity = "warning";
      recommendation =
        "Collect wheelchair_boarding data for all stops on this route to enable accessibility planning.";
    } else if (
      stopCount > 0 &&
      inaccessibleStopCount > accessibleStopCount &&
      inaccessibleStopCount > 0
    ) {
      gapType = "majority_inaccessible";
      severity = "warning";
      recommendation =
        "Prioritize infrastructure upgrades on frequently served inaccessible stops, or adjust service patterns.";
    }

    if (gapType) {
      gaps.push({
        routeId,
        routeName: routeDisplayName(
          routeId,
          route?.route_short_name,
          route?.route_long_name
        ),
        tripCount,
        stopCount,
        accessibleStopCount,
        inaccessibleStopCount,
        unknownStopCount,
        gapType,
        severity,
        recommendation,
      });
    }
  }

  gaps.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) {
      return diff;
    }
    return a.routeName.localeCompare(b.routeName);
  });

  return gaps;
}

export function describeStopAccessibility(
  feed: GtfsFeed,
  stopId: string
): string {
  const stop = feed.stops.find((s) => s.stop_id === stopId);
  if (!stop) {
    return "unknown stop";
  }
  const value = parseWheelchairBoarding(stop.wheelchair_boarding);
  return wheelchairLabel(value);
}
