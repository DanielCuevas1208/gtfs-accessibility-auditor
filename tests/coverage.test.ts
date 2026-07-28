import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadGtfsFeed } from "../src/ingest/gtfsLoader.js";
import { auditCoverage, classifyStop } from "../src/audit/coverage.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("auditCoverage", () => {
  it("counts boarding stops and accessibility statuses", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const coverage = auditCoverage(feed);

    // 10 boarding stops (ENTRANCE1 is location_type=2, excluded)
    expect(coverage.boardingStops).toBe(10);
    expect(coverage.accessible).toBe(2);
    expect(coverage.notAccessible).toBe(6);
    expect(coverage.unknown).toBe(2);
    expect(coverage.missing).toBe(0);

    // S4 has wheelchair_boarding=0 which is unknown (value 0), not missing
    const s4 = feed.stops.find((s) => s.stop_id === "S4")!;
    expect(classifyStop(s4)).toBe(0);
  });

  it("computes coverage rates deterministically", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const coverage = auditCoverage(feed);

    expect(coverage.coverageRate).toBeCloseTo(0.8, 5);
    expect(coverage.accessibleRate).toBeCloseTo(0.2, 5);
  });

  it("counts GTFS boarding areas as passenger boarding locations", () => {
    const coverage = auditCoverage({
      agencies: [],
      routes: [],
      trips: [],
      stopTimes: [],
      stops: [
        {
          stop_id: "BOARDING-AREA",
          stop_name: "Platform A boarding area",
          stop_lat: "33.4484",
          stop_lon: "-112.0740",
          location_type: "4",
          wheelchair_boarding: "1",
        },
        {
          stop_id: "ENTRANCE",
          stop_name: "Station entrance",
          stop_lat: "33.4484",
          stop_lon: "-112.0740",
          location_type: "2",
          wheelchair_boarding: "1",
        },
      ],
    });

    expect(coverage.boardingStops).toBe(1);
    expect(coverage.accessible).toBe(1);
  });
});

describe("classifyStop", () => {
  it("classifies missing and invalid values", () => {
    expect(
      classifyStop({
        stop_id: "X",
        stop_name: "Test",
        stop_lat: "0",
        stop_lon: "0",
      })
    ).toBe("missing");

    expect(
      classifyStop({
        stop_id: "Y",
        stop_name: "Test",
        stop_lat: "0",
        stop_lon: "0",
        wheelchair_boarding: "yes",
      })
    ).toBe("invalid");
  });
});
