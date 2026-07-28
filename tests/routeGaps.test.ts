import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadGtfsFeed } from "../src/ingest/gtfsLoader.js";
import { auditRouteGaps } from "../src/audit/routeGaps.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("auditRouteGaps", () => {
  it("flags route 2 for no accessible stops", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const gaps = auditRouteGaps(feed);

    const r2 = gaps.find((g) => g.routeId === "R2");
    expect(r2).toBeDefined();
    expect(r2!.gapType).toBe("no_accessible_stops");
    expect(r2!.severity).toBe("critical");
    expect(r2!.accessibleStopCount).toBe(0);
  });

  it("flags route 3 for majority inaccessible stops", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const gaps = auditRouteGaps(feed);

    const r3 = gaps.find((g) => g.routeId === "R3");
    expect(r3).toBeDefined();
    expect(r3!.gapType).toBe("majority_inaccessible");
  });

  it("does not flag route 1 when accessible stops exist", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const gaps = auditRouteGaps(feed);

    const r1 = gaps.find((g) => g.routeId === "R1");
    expect(r1).toBeUndefined();
  });
});
