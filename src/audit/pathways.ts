import type { GtfsFeed, Pathway, Stop } from "../types/gtfs.js";
import {
  parsePathwayDirection,
  parsePathwayMode,
  parseWheelchairBoarding,
} from "../types/gtfs.js";
import type {
  AuditIssue,
  PathwayGap,
  PathwaysSummary,
  Severity,
} from "../types/audit.js";

const UNPARENTED_GROUP = "__unparented__";
const PLATFORM_TYPES = new Set(["", "0", "4"]);
const ENDPOINT_TYPES = new Set(["", "0", "2", "3", "4"]);

interface PathwayGraph {
  nodes: Set<string>;
  adjacency: Map<string, Set<string>>;
}

function normalizedLocationType(stop: Stop): string {
  return stop.location_type?.trim() ?? "";
}

function stationIdFor(stop: Stop): string | null {
  const parent = stop.parent_station?.trim();
  if (parent) {
    return parent;
  }
  return normalizedLocationType(stop) === "1" ? stop.stop_id : null;
}

function graphGroupFor(stop: Stop): string {
  return stationIdFor(stop) ?? UNPARENTED_GROUP;
}

function isPlatform(stop: Stop): boolean {
  return PLATFORM_TYPES.has(normalizedLocationType(stop));
}

function hasBoardingAreas(stops: Stop[], platformId: string): boolean {
  return stops.some(
    (stop) =>
      normalizedLocationType(stop) === "4" &&
      stop.parent_station?.trim() === platformId
  );
}

function isPathwayEndpoint(stop: Stop): boolean {
  return (
    ENDPOINT_TYPES.has(normalizedLocationType(stop)) &&
    stop.stop_access?.trim() !== "1"
  );
}

function isAccessiblePathway(pathwayMode: number): boolean {
  return pathwayMode !== 2 && pathwayMode !== 4;
}

function emptyGraph(): PathwayGraph {
  return { nodes: new Set(), adjacency: new Map() };
}

function addDirectedEdge(
  graph: PathwayGraph,
  fromStopId: string,
  toStopId: string
): void {
  if (!graph.adjacency.has(fromStopId)) {
    graph.adjacency.set(fromStopId, new Set());
  }
  graph.adjacency.get(fromStopId)!.add(toStopId);
}

function addGraphEdge(
  graph: PathwayGraph,
  pathway: Pathway,
  accessible: boolean
): void {
  graph.nodes.add(pathway.from_stop_id);
  graph.nodes.add(pathway.to_stop_id);

  if (!accessible) {
    return;
  }

  addDirectedEdge(graph, pathway.from_stop_id, pathway.to_stop_id);
  if (parsePathwayDirection(pathway.is_bidirectional) === 1) {
    addDirectedEdge(graph, pathway.to_stop_id, pathway.from_stop_id);
  }
}

function reachableFrom(
  graph: PathwayGraph,
  starts: string[]
): Set<string> {
  const reached = new Set<string>();
  const queue = [...starts];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reached.has(current)) {
      continue;
    }
    reached.add(current);
    for (const next of graph.adjacency.get(current) ?? []) {
      if (!reached.has(next)) {
        queue.push(next);
      }
    }
  }

  return reached;
}

function addIssue(
  issues: AuditIssue[],
  code: string,
  severity: Severity,
  message: string,
  entityId: string | undefined,
  field: string,
  recommendation: string
): void {
  issues.push({
    code,
    severity,
    message,
    entityType: entityId ? "stop" : "feed",
    entityId,
    field,
    recommendation,
  });
}

function makeSummary(feed: GtfsFeed): PathwaysSummary {
  const pathways = feed.pathways ?? [];
  const levels = feed.levels ?? [];
  return {
    pathwaysFilePresent: feed.pathways !== undefined,
    levelsFilePresent: feed.levels !== undefined,
    pathwayCount: pathways.length,
    levelCount: levels.length,
    stationCount: 0,
    accessibleEntranceCount: 0,
    platformCount: 0,
    reachablePlatformCount: 0,
    unreachablePlatformCount: 0,
    unlinkedLocationCount: 0,
    invalidPathways: 0,
    invalidLevels: 0,
    elevatorPathwayCount: 0,
    coverageRate: 0,
    gaps: [],
    issues: [],
  };
}

function validateLevels(
  feed: GtfsFeed,
  summary: PathwaysSummary
): void {
  const levelIds = new Set<string>();

  for (const level of feed.levels ?? []) {
    const levelId = level.level_id.trim();
    if (!levelId || levelIds.has(levelId)) {
      summary.invalidLevels++;
      addIssue(
        summary.issues,
        "INVALID_LEVEL",
        "warning",
        `Level row has a missing or duplicate level_id "${level.level_id}".`,
        levelId || undefined,
        "level_id",
        "Give each levels.txt row a unique level_id."
      );
      continue;
    }

    const levelIndex = Number(level.level_index);
    if (level.level_index.trim() === "" || !Number.isFinite(levelIndex)) {
      summary.invalidLevels++;
      addIssue(
        summary.issues,
        "INVALID_LEVEL_INDEX",
        "warning",
        `Level "${levelId}" has an invalid level_index "${level.level_index}".`,
        levelId,
        "level_index",
        "Set level_index to a finite number."
      );
      continue;
    }

    levelIds.add(levelId);
  }

  for (const stop of feed.stops) {
    const levelId = stop.level_id?.trim();
    if (levelId && !levelIds.has(levelId)) {
      addIssue(
        summary.issues,
        "UNKNOWN_LEVEL_REFERENCE",
        "warning",
        `Stop "${stop.stop_id}" references unknown level_id "${levelId}".`,
        stop.stop_id,
        "level_id",
        "Add the level to levels.txt or correct the stop reference."
      );
    }
  }
}

function validatePathway(
  pathway: Pathway,
  index: number,
  seenPathwayIds: Set<string>,
  stopById: Map<string, Stop>,
  summary: PathwaysSummary
): { pathwayMode: number; bidirectional: 0 | 1 } | null {
  const pathwayId = pathway.pathway_id.trim();
  const fromStop = stopById.get(pathway.from_stop_id);
  const toStop = stopById.get(pathway.to_stop_id);

  if (!pathwayId || seenPathwayIds.has(pathwayId)) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "INVALID_PATHWAY_ID",
      "warning",
      `Pathway row ${index + 1} has a missing or duplicate pathway_id "${pathway.pathway_id}".`,
      pathwayId || undefined,
      "pathway_id",
      "Give each pathways.txt row a unique pathway_id."
    );
    return null;
  }
  seenPathwayIds.add(pathwayId);

  const pathwayMode = parsePathwayMode(pathway.pathway_mode);
  if (pathwayMode === null) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "INVALID_PATHWAY_MODE",
      "warning",
      `Pathway "${pathwayId}" has invalid pathway_mode "${pathway.pathway_mode}".`,
      pathwayId,
      "pathway_mode",
      "Set pathway_mode to a GTFS value from 1 through 7."
    );
    return null;
  }

  const bidirectional = parsePathwayDirection(pathway.is_bidirectional);
  if (bidirectional === null || (pathwayMode === 7 && bidirectional === 1)) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "INVALID_PATHWAY_DIRECTION",
      "warning",
      `Pathway "${pathwayId}" has invalid is_bidirectional "${pathway.is_bidirectional}".`,
      pathwayId,
      "is_bidirectional",
      "Set is_bidirectional to 0 or 1. Exit gates must use 0."
    );
    return null;
  }

  if (!fromStop || !toStop) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "UNKNOWN_PATHWAY_STOP",
      "warning",
      `Pathway "${pathwayId}" references an unknown stop.`,
      pathwayId,
      "from_stop_id",
      "Reference existing location records in stops.txt."
    );
    return null;
  }

  if (!isPathwayEndpoint(fromStop) || !isPathwayEndpoint(toStop)) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "INVALID_PATHWAY_ENDPOINT",
      "warning",
      `Pathway "${pathwayId}" references a station or street-access stop.`,
      pathwayId,
      "from_stop_id",
      "Reference platforms, entrances, generic nodes, or boarding areas."
    );
    return null;
  }

  const fromStation = stationIdFor(fromStop);
  const toStation = stationIdFor(toStop);
  if (fromStation !== toStation) {
    summary.invalidPathways++;
    addIssue(
      summary.issues,
      "CROSS_STATION_PATHWAY",
      "warning",
      `Pathway "${pathwayId}" connects locations from different station groups.`,
      pathwayId,
      "to_stop_id",
      "Connect locations within the same station."
    );
    return null;
  }

  if (pathwayMode === 5) {
    summary.elevatorPathwayCount++;
  }

  return { pathwayMode, bidirectional };
}

function addPathwayGap(
  summary: PathwaysSummary,
  stationId: string | undefined,
  stop: Stop,
  reason: PathwayGap["reason"],
  severity: Severity,
  recommendation: string
): void {
  const gap: PathwayGap = {
    stationId,
    stopId: stop.stop_id,
    stopName: stop.stop_name,
    reason,
    severity,
    recommendation,
  };
  summary.gaps.push(gap);

  addIssue(
    summary.issues,
    reason === "no_accessible_entrance"
      ? "PATHWAY_NO_ACCESSIBLE_ENTRANCE"
      : "PATHWAY_NO_ACCESSIBLE_PATH",
    severity,
    reason === "no_accessible_entrance"
      ? `Platform "${stop.stop_name}" has no wheelchair-accessible entrance.`
      : `Platform "${stop.stop_name}" has no accessible pathway from an entrance.`,
    stop.stop_id,
    "pathways.txt",
    recommendation
  );
}

export function auditPathways(feed: GtfsFeed): PathwaysSummary {
  const summary = makeSummary(feed);
  validateLevels(feed, summary);
  const stopsById = new Map<string, Stop>();

  for (const stop of feed.stops) {
    if (!stopsById.has(stop.stop_id)) {
      stopsById.set(stop.stop_id, stop);
    }
  }

  const graphs = new Map<string, PathwayGraph>();
  const seenPathwayIds = new Set<string>();

  for (const [index, pathway] of (feed.pathways ?? []).entries()) {
    const valid = validatePathway(
      pathway,
      index,
      seenPathwayIds,
      stopsById,
      summary
    );
    if (!valid) {
      continue;
    }

    const fromStop = stopsById.get(pathway.from_stop_id)!;
    const group = graphGroupFor(fromStop);
    if (!graphs.has(group)) {
      graphs.set(group, emptyGraph());
    }
    addGraphEdge(
      graphs.get(group)!,
      pathway,
      isAccessiblePathway(valid.pathwayMode)
    );
  }

  if (
    summary.elevatorPathwayCount > 0 &&
    !summary.levelsFilePresent
  ) {
    addIssue(
      summary.issues,
      "MISSING_LEVELS_FOR_ELEVATOR",
      "critical",
      "The feed describes an elevator pathway without levels.txt.",
      undefined,
      "levels.txt",
      "Add levels.txt when pathways.txt contains an elevator."
    );
  }

  for (const [group, graph] of graphs) {
    const groupStops = feed.stops.filter(
      (stop) => graphGroupFor(stop) === group
    );
    const platformStops = [...graph.nodes]
      .map((stopId) => stopsById.get(stopId))
      .filter(
        (stop): stop is Stop =>
          stop !== undefined &&
          isPlatform(stop) &&
          !(normalizedLocationType(stop) === "0" &&
            hasBoardingAreas(feed.stops, stop.stop_id))
      );
    const accessibleEntrances = [...graph.nodes]
      .map((stopId) => stopsById.get(stopId))
      .filter(
        (stop): stop is Stop =>
          stop !== undefined &&
          normalizedLocationType(stop) === "2" &&
          parseWheelchairBoarding(stop.wheelchair_boarding) === 1
      );
    const reached = reachableFrom(
      graph,
      accessibleEntrances.map((stop) => stop.stop_id)
    );

    if (group !== UNPARENTED_GROUP) {
      summary.stationCount++;
    }
    summary.accessibleEntranceCount += accessibleEntrances.length;
    summary.platformCount += platformStops.length;
    summary.reachablePlatformCount += platformStops.filter((stop) =>
      reached.has(stop.stop_id)
    ).length;

    if (platformStops.length > 0 && accessibleEntrances.length === 0) {
      for (const stop of platformStops) {
        addPathwayGap(
          summary,
          group === UNPARENTED_GROUP ? undefined : group,
          stop,
          "no_accessible_entrance",
          "critical",
          "Add a wheelchair-accessible entrance and connect it to this platform."
        );
      }
    } else {
      for (const stop of platformStops) {
        if (reached.has(stop.stop_id)) {
          continue;
        }
        const severity: Severity =
          parseWheelchairBoarding(stop.wheelchair_boarding) === 1
            ? "critical"
            : "warning";
        addPathwayGap(
          summary,
          group === UNPARENTED_GROUP ? undefined : group,
          stop,
          "no_accessible_path",
          severity,
          "Add an accessible pathway from an entrance to this platform."
        );
      }
    }

    if (group !== UNPARENTED_GROUP) {
      for (const stop of groupStops) {
        const type = normalizedLocationType(stop);
        const excludedPlatform =
          type === "0" && hasBoardingAreas(feed.stops, stop.stop_id);
        const streetAccessible = stop.stop_access?.trim() === "1";
        if (
          type === "1" ||
          excludedPlatform ||
          (streetAccessible && isPlatform(stop)) ||
          graph.nodes.has(stop.stop_id)
        ) {
          continue;
        }
        summary.unlinkedLocationCount++;
        addIssue(
          summary.issues,
          "PATHWAY_UNLINKED_LOCATION",
          "warning",
          `Location "${stop.stop_name}" is in a station with pathways but has no pathway connection.`,
          stop.stop_id,
          "pathways.txt",
          "Connect the location to the station pathway graph."
        );
      }
    }
  }

  summary.unreachablePlatformCount =
    summary.platformCount - summary.reachablePlatformCount;
  summary.coverageRate =
    summary.platformCount === 0
      ? 0
      : summary.reachablePlatformCount / summary.platformCount;

  summary.gaps.sort((a, b) => {
    const stationOrder = (a.stationId ?? "").localeCompare(b.stationId ?? "");
    return stationOrder !== 0
      ? stationOrder
      : a.stopName.localeCompare(b.stopName);
  });

  summary.issues.sort((a, b) => {
    const codeOrder = a.code.localeCompare(b.code);
    return codeOrder !== 0
      ? codeOrder
      : (a.entityId ?? "").localeCompare(b.entityId ?? "");
  });


  return summary;
}
