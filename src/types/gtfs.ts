/** GTFS wheelchair_boarding values per the spec. */
export type WheelchairBoarding = 0 | 1 | 2;

/** GTFS wheelchair_accessible values for trips per the spec. */
export type WheelchairAccessible = 0 | 1 | 2;

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

export interface GtfsFeed {
  agencies: Agency[];
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  stopTimes: StopTime[];
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
