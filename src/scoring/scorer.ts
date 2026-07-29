import type {
  AccessibilityScore,
  CoverageMetrics,
  DataQualitySummary,
  RouteGap,
  ScoreComponent,
  TripAccessibilitySummary,
} from "../types/audit.js";
import { EMPTY_TRIP_SUMMARY } from "../audit/tripAccessibility.js";

const WEIGHTS = {
  coverage: 0.3,
  accessibility: 0.3,
  dataQuality: 0.15,
  tripAccessibility: 0.15,
  routeEquity: 0.1,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toGrade(score: number): AccessibilityScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreCoverage(coverage: CoverageMetrics): ScoreComponent {
  const rawScore = coverage.coverageRate * 100;
  const explanation =
    coverage.totalStops === 0
      ? "No boarding stops found; coverage cannot be assessed."
      : `${Math.round(coverage.coverageRate * 100)}% of boarding stops have a known accessibility status ` +
        `(${coverage.accessible + coverage.notAccessible + coverage.unknown} known, ${coverage.missing} missing).`;

  return {
    id: "coverage",
    label: "Accessibility data coverage",
    weight: WEIGHTS.coverage,
    rawScore,
    weightedScore: rawScore * WEIGHTS.coverage,
    explanation,
  };
}

function scoreAccessibility(coverage: CoverageMetrics): ScoreComponent {
  const knownStops =
    coverage.accessible + coverage.notAccessible + coverage.unknown;
  const rawScore =
    knownStops === 0
      ? 0
      : (coverage.accessible / knownStops) * 100;

  const explanation =
    knownStops === 0
      ? "No stops with known accessibility status."
      : `${coverage.accessible} of ${knownStops} known stops are marked accessible ` +
        `(${Math.round(rawScore)}% accessible among known stops).`;

  return {
    id: "accessibility",
    label: "Accessible stop share",
    weight: WEIGHTS.accessibility,
    rawScore,
    weightedScore: rawScore * WEIGHTS.accessibility,
    explanation,
  };
}

function scoreDataQuality(dataQuality: DataQualitySummary): ScoreComponent {
  const penalty =
    dataQuality.invalidWheelchairValues * 5 +
    dataQuality.duplicateStopIds * 10 +
    dataQuality.orphanStopTimes * 2 +
    dataQuality.tripsWithoutStops * 8;

  const rawScore = clamp(100 - penalty, 0, 100);
  const issueCount = dataQuality.issues.length;

  const explanation =
    issueCount === 0
      ? "No data-quality issues detected."
      : `Detected ${issueCount} data-quality issue(s): ` +
        `${dataQuality.invalidWheelchairValues} invalid wheelchair values, ` +
        `${dataQuality.duplicateStopIds} duplicate stops, ` +
        `${dataQuality.orphanStopTimes} orphan stop references, ` +
        `${dataQuality.tripsWithoutStops} trips without stops.`;

  return {
    id: "data_quality",
    label: "Data quality",
    weight: WEIGHTS.dataQuality,
    rawScore,
    weightedScore: rawScore * WEIGHTS.dataQuality,
    explanation,
  };
}

function scoreRouteEquity(routeGaps: RouteGap[]): ScoreComponent {
  const criticalGaps = routeGaps.filter((g) => g.severity === "critical").length;
  const warningGaps = routeGaps.filter((g) => g.severity === "warning").length;
  const penalty = criticalGaps * 15 + warningGaps * 5;
  const rawScore = clamp(100 - penalty, 0, 100);

  const explanation =
    routeGaps.length === 0
      ? "No route-level accessibility gaps identified."
      : `${routeGaps.length} route(s) flagged: ` +
        `${criticalGaps} critical, ${warningGaps} warning.`;

  return {
    id: "route_equity",
    label: "Route-level equity",
    weight: WEIGHTS.routeEquity,
    rawScore,
    weightedScore: rawScore * WEIGHTS.routeEquity,
    explanation,
  };
}

function scoreTripAccessibility(
  trips: TripAccessibilitySummary
): ScoreComponent {
  const rawScore = trips.coverageRate * 100;
  const covered =
    trips.accessible + trips.notAccessible + trips.unknown;

  const explanation =
    trips.totalTrips === 0
      ? "No trips found; trip accessibility data cannot be assessed."
      : `${Math.round(trips.coverageRate * 100)}% of trips have a known wheelchair_accessible status ` +
        `(${covered} valid, ${trips.missing} missing, ${trips.invalid} invalid).`;

  return {
    id: "trip_accessibility",
    label: "Trip accessibility data",
    weight: WEIGHTS.tripAccessibility,
    rawScore,
    weightedScore: rawScore * WEIGHTS.tripAccessibility,
    explanation,
  };
}

export function computeAccessibilityScore(
  coverage: CoverageMetrics,
  dataQuality: DataQualitySummary,
  routeGaps: RouteGap[],
  tripAccessibility: TripAccessibilitySummary = EMPTY_TRIP_SUMMARY
): AccessibilityScore {
  const components = [
    scoreCoverage(coverage),
    scoreAccessibility(coverage),
    scoreDataQuality(dataQuality),
    scoreTripAccessibility(tripAccessibility),
    scoreRouteEquity(routeGaps),
  ];

  const overall = Math.round(
    components.reduce((sum, c) => sum + c.weightedScore, 0)
  );

  const grade = toGrade(overall);
  const summary = buildSummary(overall, grade, components);

  return { overall, grade, components, summary };
}

function buildSummary(
  overall: number,
  grade: AccessibilityScore["grade"],
  components: ScoreComponent[]
): string {
  const weakest = [...components].sort((a, b) => a.rawScore - b.rawScore)[0];
  return (
    `Overall accessibility score: ${overall}/100 (grade ${grade}). ` +
    `Weakest area: ${weakest.label} (${Math.round(weakest.rawScore)}/100).`
  );
}

export { WEIGHTS };
