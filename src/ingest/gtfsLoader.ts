import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  type Agency,
  type GtfsFeed,
  type Route,
  type Stop,
  type StopTime,
  type Trip,
  REQUIRED_GTFS_FILES,
} from "../types/gtfs.js";
import { rowToTyped, streamCsvFile } from "./streamReader.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class GtfsLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GtfsLoadError";
  }
}

export async function validateFeedDirectory(feedPath: string): Promise<void> {
  const missing: string[] = [];
  for (const file of REQUIRED_GTFS_FILES) {
    if (!(await fileExists(join(feedPath, file)))) {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    throw new GtfsLoadError(
      `Missing required GTFS files: ${missing.join(", ")}`
    );
  }
}

export async function loadGtfsFeed(feedPath: string): Promise<GtfsFeed> {
  await validateFeedDirectory(feedPath);

  const agencies: Agency[] = [];
  const routes: Route[] = [];
  const stops: Stop[] = [];
  const trips: Trip[] = [];
  const stopTimes: StopTime[] = [];

  if (await fileExists(join(feedPath, "agency.txt"))) {
    await streamCsvFile(join(feedPath, "agency.txt"), {
      onHeader: () => {},
      onRow: (row) => agencies.push(rowToTyped<Agency>(row)),
    });
  }

  await streamCsvFile(join(feedPath, "routes.txt"), {
    onHeader: () => {},
    onRow: (row) => routes.push(rowToTyped<Route>(row)),
  });

  await streamCsvFile(join(feedPath, "stops.txt"), {
    onHeader: () => {},
    onRow: (row) => stops.push(rowToTyped<Stop>(row)),
  });

  await streamCsvFile(join(feedPath, "trips.txt"), {
    onHeader: () => {},
    onRow: (row) => trips.push(rowToTyped<Trip>(row)),
  });

  await streamCsvFile(join(feedPath, "stop_times.txt"), {
    onHeader: () => {},
    onRow: (row) => stopTimes.push(rowToTyped<StopTime>(row)),
  });

  return { agencies, routes, stops, trips, stopTimes };
}

/** Count rows in a GTFS file via streaming without retaining them. */
export async function countCsvRows(filePath: string): Promise<number> {
  return streamCsvFile(filePath, {
    onHeader: () => {},
    onRow: () => {},
  });
}
