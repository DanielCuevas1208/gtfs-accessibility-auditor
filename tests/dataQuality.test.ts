import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadGtfsFeed, validateFeedDirectory, GtfsLoadError } from "../src/ingest/gtfsLoader.js";
import { auditDataQuality } from "../src/audit/dataQuality.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("auditDataQuality", () => {
  it("flags invalid wheelchair_boarding on stop S10", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const dq = auditDataQuality(feed);

    expect(dq.invalidWheelchairValues).toBe(1);
    const invalid = dq.issues.find((i) => i.code === "INVALID_WHEELCHAIR_BOARDING");
    expect(invalid).toBeDefined();
    expect(invalid!.entityId).toBe("S10");
  });

  it("reports no duplicate or orphan issues for the sample feed", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const dq = auditDataQuality(feed);

    expect(dq.duplicateStopIds).toBe(0);
    expect(dq.orphanStopTimes).toBe(0);
    expect(dq.tripsWithoutStops).toBe(0);
  });
});

describe("validateFeedDirectory", () => {
  it("throws GtfsLoadError when required files are missing", async () => {
    await expect(validateFeedDirectory(join(import.meta.dirname, ".."))).rejects.toThrow(
      GtfsLoadError
    );
  });
});
