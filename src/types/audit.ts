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
  routeGaps: RouteGap[];
  issues: AuditIssue[];
  score: AccessibilityScore;
}

export interface StopAccessibilityMap {
  [stopId: string]: WheelchairBoarding | null;
}
