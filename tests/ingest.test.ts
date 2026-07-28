import { describe, expect, it } from "vitest";
import { parseCsvLine } from "../src/ingest/streamReader.js";
import { loadGtfsFeed, countCsvRows } from "../src/ingest/gtfsLoader.js";
import { join } from "node:path";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("parseCsvLine", () => {
  it("parses simple comma-separated fields", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("handles escaped double quotes", () => {
    expect(parseCsvLine('"say ""hello""",b')).toEqual(['say "hello"', "b"]);
  });
});

describe("loadGtfsFeed", () => {
  it("loads the sample feed with expected entity counts", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    expect(feed.agencies).toHaveLength(1);
    expect(feed.routes).toHaveLength(3);
    expect(feed.stops).toHaveLength(11);
    expect(feed.trips).toHaveLength(5);
    expect(feed.stopTimes).toHaveLength(17);
  });

  it("streams stop_times without loading entire file into memory at once", async () => {
    const count = await countCsvRows(join(FIXTURE, "stop_times.txt"));
    expect(count).toBe(17);
  });
});
