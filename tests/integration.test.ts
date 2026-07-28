import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadGtfsFeed } from "../src/ingest/gtfsLoader.js";
import { runAudit } from "../src/audit/runAudit.js";
import { serializeReportJson } from "../src/reports/jsonReport.js";
import { renderHtmlReport } from "../src/reports/htmlReport.js";

const FIXTURE = join(import.meta.dirname, "../fixtures/sample-feed");

describe("integration", () => {
  it("runs a full audit on the sample feed", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const report = runAudit(feed, { feedPath: FIXTURE });

    expect(report.agencyName).toBe("Metro Valley Transit");
    expect(report.coverage.boardingStops).toBe(10);
    expect(report.issues).toHaveLength(2);
    expect(report.routeGaps).toHaveLength(2);
    expect(report.score.overall).toBe(62);
    expect(report.score.grade).toBe("D");
  });

  it("produces valid JSON and HTML reports", async () => {
    const feed = await loadGtfsFeed(FIXTURE);
    const report = runAudit(feed, { feedPath: FIXTURE });

    const json = serializeReportJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.score.grade).toBe(report.score.grade);

    const html = renderHtmlReport(report);
    expect(html).toContain("GTFS Accessibility Audit");
    expect(html).toContain("Metro Valley Transit");
    expect(html).toContain(report.score.grade);
  });

  it("writes reports to a temp directory", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "gtfs-audit-"));
    const feed = await loadGtfsFeed(FIXTURE);
    const report = runAudit(feed, { feedPath: FIXTURE });

    const jsonPath = join(outDir, "accessibility-audit.json");
    const htmlPath = join(outDir, "accessibility-audit.html");

    const { writeJsonReport } = await import("../src/reports/jsonReport.js");
    const { writeHtmlReport } = await import("../src/reports/htmlReport.js");

    await writeJsonReport(report, jsonPath);
    await writeHtmlReport(report, htmlPath);

    const jsonContent = await readFile(jsonPath, "utf-8");
    expect(JSON.parse(jsonContent).agencyName).toBe("Metro Valley Transit");

    const htmlContent = await readFile(htmlPath, "utf-8");
    expect(htmlContent).toContain("<!DOCTYPE html>");
  });
});
