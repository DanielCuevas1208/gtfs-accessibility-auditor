import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadGtfsFeed } from "../src/ingest/gtfsLoader.js";
import { auditPathways } from "../src/audit/pathways.js";
import type { GtfsFeed, Pathway, Stop } from "../src/types/gtfs.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

function stop(
  stop_id: string,
  location_type: string,
  wheelchair_boarding: string,
  parent_station = "STA"
): Stop {
  return {
    stop_id,
    stop_name: stop_id,
    stop_lat: "0",
    stop_lon: "0",
    location_type,
    wheelchair_boarding,
    parent_station,
  };
}

function feed(
  stops: Stop[],
  pathways?: Pathway[],
  levels?: GtfsFeed["levels"]
): GtfsFeed {
  return {
    agencies: [],
    routes: [],
    stops,
    trips: [],
    stopTimes: [],
    pathways,
    levels,
  };
}

describe("auditPathways", () => {
  it("loads and audits the sample pathway graph", async () => {
    const loaded = await loadGtfsFeed(FIXTURE);
    const summary = auditPathways(loaded);

    expect(loaded.pathways).toHaveLength(2);
    expect(loaded.levels).toHaveLength(2);
    expect(summary.pathwaysFilePresent).toBe(true);
    expect(summary.levelsFilePresent).toBe(true);
    expect(summary.pathwayCount).toBe(2);
    expect(summary.levelCount).toBe(2);
    expect(summary.accessibleEntranceCount).toBe(1);
    expect(summary.platformCount).toBe(2);
    expect(summary.reachablePlatformCount).toBe(1);
    expect(summary.unreachablePlatformCount).toBe(1);
    expect(summary.coverageRate).toBe(0.5);
    expect(summary.gaps).toEqual([
      expect.objectContaining({
        stopId: "S2",
        reason: "no_accessible_path",
        severity: "critical",
      }),
    ]);
    expect(summary.issues.map((issue) => issue.code)).toContain(
      "PATHWAY_NO_ACCESSIBLE_PATH"
    );
  });

  it("does not report pathway gaps when pathways.txt is absent", () => {
    const summary = auditPathways(
      feed([
        stop("P", "0", "1"),
        stop("E", "2", "1"),
      ])
    );

    expect(summary.pathwaysFilePresent).toBe(false);
    expect(summary.pathwayCount).toBe(0);
    expect(summary.platformCount).toBe(0);
    expect(summary.gaps).toHaveLength(0);
    expect(summary.issues).toHaveLength(0);
  });

  it("flags invalid pathway rows and missing levels for elevators", () => {
    const pathways: Pathway[] = [
      {
        pathway_id: "bad-mode",
        from_stop_id: "E",
        to_stop_id: "P",
        pathway_mode: "9",
        is_bidirectional: "1",
      },
      {
        pathway_id: "elevator",
        from_stop_id: "E",
        to_stop_id: "P",
        pathway_mode: "5",
        is_bidirectional: "1",
      },
      {
        pathway_id: "elevator",
        from_stop_id: "E",
        to_stop_id: "P",
        pathway_mode: "5",
        is_bidirectional: "1",
      },
    ];

    const summary = auditPathways(
      feed([stop("E", "2", "1"), stop("P", "0", "1")], pathways)
    );

    expect(summary.invalidPathways).toBe(2);
    expect(summary.elevatorPathwayCount).toBe(1);
    expect(summary.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "INVALID_PATHWAY_MODE",
        "INVALID_PATHWAY_ID",
        "MISSING_LEVELS_FOR_ELEVATOR",
      ])
    );
    expect(summary.reachablePlatformCount).toBe(1);
  });
});
