/** GTFS wheelchair_boarding values per the spec. */
export type WheelchairBoarding = 0 | 1 | 2;

/** GTFS wheelchair_accessible values for trips per the spec. */
export type WheelchairAccessible = 0 | 1 | 2;

/** GTFS pathway_mode values from pathways.txt. */
export type PathwayMode = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Agency {
  agency_id?: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
}

export interface Route {
  route_id: string;
  agency_id?: string;
  route_short_name?: string;
  route_long_name?: string;
  route_type: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  wheelchair_boarding?: string;
  location_type?: string;
  parent_station?: string;
  level_id?: string;
  stop_access?: string;
}

export interface Trip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  direction_id?: string;
  wheelchair_accessible?: string;
}

export interface StopTime {
  trip_id: string;
  arrival_time?: string;
  departure_time?: string;
  stop_id: string;
  stop_sequence: string;
}

export interface Pathway {
  pathway_id: string;
  from_stop_id: string;
  to_stop_id: string;
  pathway_mode: string;
  is_bidirectional: string;
  length?: string;
  traversal_time?: string;
  stair_count?: string;
  max_slope?: string;
  min_width?: string;
  signposted_as?: string;
  reversed_signposted_as?: string;
}

export interface Level {
  level_id: string;
  level_index: string;
  level_name?: string;
}

export interface GtfsFeed {
  agencies: Agency[];
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  stopTimes: StopTime[];
  /** Optional because pathways.txt is an optional GTFS file. */
  pathways?: Pathway[];
  /** Optional because levels.txt is conditionally required by GTFS. */
  levels?: Level[];
}

export const REQUIRED_GTFS_FILES = [
  "routes.txt",
  "stops.txt",
  "trips.txt",
  "stop_times.txt",
] as const;

export type RequiredGtfsFile = (typeof REQUIRED_GTFS_FILES)[number];

export function parseWheelchairBoarding(
  value: string | undefined
): WheelchairBoarding | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  const n = Number(value);
  if (n === 0 || n === 1 || n === 2) {
    return n;
  }
  return null;
}

export function wheelchairLabel(value: WheelchairBoarding | null): string {
  switch (value) {
    case 0:
      return "unknown";
    case 1:
      return "accessible";
    case 2:
      return "not_accessible";
    default:
      return "missing";
  }
}

/** Parse a GTFS trips.txt wheelchair_accessible value into 0, 1, 2, or null. */
export function parseWheelchairAccessible(
  value: string | undefined
): WheelchairAccessible | null {
  return parseWheelchairBoarding(value);
}

export function parsePathwayMode(value: string | undefined): PathwayMode | null {
  if (value === undefined || value.trim() === "") {
    return null;
  }
  switch (value.trim()) {
    case "1":
      return 1;
    case "2":
      return 2;
    case "3":
      return 3;
    case "4":
      return 4;
    case "5":
      return 5;
    case "6":
      return 6;
    case "7":
      return 7;
    default:
      return null;
  }
}

export function parsePathwayDirection(
  value: string | undefined
): 0 | 1 | null {
  if (value === "0") return 0;
  if (value === "1") return 1;
  return null;
}
