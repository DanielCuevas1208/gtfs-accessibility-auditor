import type { WheelchairBoarding } from "./gtfs.js";

export type Severity = "info" | "warning" | "critical";

export interface AuditIssue {
  code: string;
  severity: Severity;
  message: string;
  entityType: "stop" | "route" | "trip" | "feed";
  entityId?: string;
  field?: string;
  recommendation: string;
}

export interface CoverageMetrics {
  totalStops: number;
  boardingStops: number;
  accessible: number;
  notAccessible: number;
  unknown: number;
  missing: number;
  coverageRate: number;
  knownRate: number;
  accessibleRate: number;
}

export interface RouteGap {
  routeId: string;
  routeName: string;
  tripCount: number;
  stopCount: number;
  accessibleStopCount: number;
  inaccessibleStopCount: number;
  unknownStopCount: number;
  gapType: "no_accessible_stops" | "majority_inaccessible" | "all_unknown";
  severity: Severity;
  recommendation: string;
}

export interface DataQualitySummary {
  invalidWheelchairValues: number;
  duplicateStopIds: number;
  orphanStopTimes: number;
  tripsWithoutStops: number;
  issues: AuditIssue[];
}

export interface TripAccessibilitySummary {
  totalTrips: number;
  accessible: number;
  notAccessible: number;
  unknown: number;
  missing: number;
  invalid: number;
  coverageRate: number;
  accessibleRate: number;
  issues: AuditIssue[];
}

export interface PathwayGap {
  stationId?: string;
  stopId: string;
  stopName: string;
  reason: "no_accessible_entrance" | "no_accessible_path";
  severity: Severity;
  recommendation: string;
}

export interface PathwaysSummary {
  pathwaysFilePresent: boolean;
  levelsFilePresent: boolean;
  pathwayCount: number;
  levelCount: number;
  stationCount: number;
  accessibleEntranceCount: number;
  platformCount: number;
  reachablePlatformCount: number;
  unreachablePlatformCount: number;
  unlinkedLocationCount: number;
  invalidPathways: number;
  invalidLevels: number;
  elevatorPathwayCount: number;
  coverageRate: number;
  gaps: PathwayGap[];
  issues: AuditIssue[];
}

export interface ScoreComponent {
  id: string;
  label: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  explanation: string;
}

export interface AccessibilityScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  components: ScoreComponent[];
  summary: string;
}

export interface AuditReport {
  generatedAt: string;
  feedPath: string;
  agencyName: string;
  coverage: CoverageMetrics;
  dataQuality: DataQualitySummary;
  tripAccessibility: TripAccessibilitySummary;
  pathways: PathwaysSummary;
  routeGaps: RouteGap[];
  issues: AuditIssue[];
  score: AccessibilityScore;
}

export interface StopAccessibilityMap {
  [stopId: string]: WheelchairBoarding | null;
}
