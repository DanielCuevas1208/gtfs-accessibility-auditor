#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadGtfsFeed } from "./ingest/gtfsLoader.js";
import { runAudit } from "./audit/runAudit.js";
import { writeJsonReport } from "./reports/jsonReport.js";
import { writeHtmlReport } from "./reports/htmlReport.js";

interface CliArgs {
  command: string;
  feedPath: string;
  outputDir: string;
  format: "json" | "html" | "both";
}

function printHelp(): void {
  console.log(`GTFS Accessibility Auditor

Usage:
  gtfs-a11y-audit audit <feed-path> [options]

Commands:
  audit    Audit a GTFS feed directory for wheelchair accessibility

Options:
  --output, -o <dir>   Output directory (default: ./report-output)
  --format, -f <fmt>   Report format: json, html, or both (default: both)
  --help, -h           Show this help message

Examples:
  gtfs-a11y-audit audit ./fixtures/sample-feed
  gtfs-a11y-audit audit ./my-feed -o ./reports -f json
`);
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return null;
  }

  const command = args[0];
  if (command !== "audit") {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  const feedPath = args[1];
  if (!feedPath) {
    console.error("Error: feed path is required.");
    printHelp();
    process.exit(1);
  }

  let outputDir = "./report-output";
  let format: CliArgs["format"] = "both";

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--output" || arg === "-o") {
      outputDir = args[++i] ?? outputDir;
    } else if (arg === "--format" || arg === "-f") {
      const fmt = args[++i];
      if (fmt === "json" || fmt === "html" || fmt === "both") {
        format = fmt;
      } else {
        console.error(`Invalid format: ${fmt}`);
        process.exit(1);
      }
    }
  }

  return {
    command,
    feedPath: resolve(feedPath),
    outputDir: resolve(outputDir),
    format,
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed) {
    return;
  }

  const { feedPath, outputDir, format } = parsed;

  console.log(`Loading GTFS feed from ${feedPath}...`);
  const feed = await loadGtfsFeed(feedPath);

  console.log(
    `Loaded ${feed.stops.length} stops, ${feed.routes.length} routes, ${feed.trips.length} trips, ${feed.stopTimes.length} stop_times`
  );

  console.log("Running accessibility audit...");
  const report = runAudit(feed, { feedPath });

  await mkdir(outputDir, { recursive: true });

  const baseName = "accessibility-audit";
  const written: string[] = [];

  if (format === "json" || format === "both") {
    const jsonPath = join(outputDir, `${baseName}.json`);
    await writeJsonReport(report, jsonPath);
    written.push(jsonPath);
  }

  if (format === "html" || format === "both") {
    const htmlPath = join(outputDir, `${baseName}.html`);
    await writeHtmlReport(report, htmlPath);
    written.push(htmlPath);
  }

  console.log("");
  console.log(`Score: ${report.score.overall}/100 (Grade ${report.score.grade})`);
  console.log(report.score.summary);
  console.log("");
  console.log(`Issues: ${report.issues.length} (${report.routeGaps.length} route gaps)`);
  console.log(`Reports written:`);
  for (const path of written) {
    console.log(`  ${path}`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
