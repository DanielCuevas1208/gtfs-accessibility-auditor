import type { GtfsFeed } from "../types/gtfs.js";
import type {
  AccessibilityScore,
  AuditIssue,
  AuditReport,
  CoverageMetrics,
  DataQualitySummary,
  PathwaysSummary,
  RouteGap,
  TripAccessibilitySummary,
} from "../types/audit.js";
import { auditCoverage } from "./coverage.js";
import { auditDataQuality } from "./dataQuality.js";
import { auditPathways } from "./pathways.js";
import { auditRouteGaps } from "./routeGaps.js";
import { auditTripAccessibility } from "./tripAccessibility.js";
import { computeAccessibilityScore } from "../scoring/scorer.js";

export interface AuditOptions {
  feedPath: string;
}

export function runAudit(feed: GtfsFeed, options: AuditOptions): AuditReport {
  const coverage = auditCoverage(feed);
  const dataQuality = auditDataQuality(feed);
  const tripAccessibility = auditTripAccessibility(feed);
  const pathways = auditPathways(feed);
  const routeGaps = auditRouteGaps(feed);
  const issues = collectIssues(
    coverage,
    dataQuality,
    tripAccessibility,
    pathways,
    routeGaps
  );
  const score = computeAccessibilityScore(
    coverage,
    dataQuality,
    routeGaps,
    tripAccessibility
  );

  const agencyName = feed.agencies[0]?.agency_name ?? "Unknown Agency";

  return {
    generatedAt: new Date().toISOString(),
    feedPath: options.feedPath,
    agencyName,
    coverage,
    dataQuality,
    tripAccessibility,
    pathways,
    routeGaps,
    issues,
    score,
  };
}

function collectIssues(
  coverage: CoverageMetrics,
  dataQuality: DataQualitySummary,
  tripAccessibility: TripAccessibilitySummary,
  pathways: PathwaysSummary,
  routeGaps: RouteGap[]
): AuditIssue[] {
  const issues: AuditIssue[] = [
    ...dataQuality.issues,
    ...tripAccessibility.issues,
    ...pathways.issues,
  ];

  if (coverage.missing > 0) {
    issues.push({
      code: "MISSING_WHEELCHAIR_DATA",
      severity:
        coverage.missing > coverage.totalStops * 0.5 ? "critical" : "warning",
      message: `${coverage.missing} of ${coverage.totalStops} boarding stops lack wheelchair_boarding`,
      entityType: "feed",
      field: "wheelchair_boarding",
      recommendation:
        "Populate wheelchair_boarding for all passenger boarding locations.",
    });
  }

  if (tripAccessibility.totalTrips > 0 && tripAccessibility.missing > 0) {
    issues.push({
      code: "MISSING_TRIP_WHEELCHAIR_DATA",
      severity:
        tripAccessibility.missing > tripAccessibility.totalTrips * 0.5
          ? "critical"
          : "warning",
      message: `${tripAccessibility.missing} of ${tripAccessibility.totalTrips} trips lack wheelchair_accessible`,
      entityType: "feed",
      field: "wheelchair_accessible",
      recommendation:
        "Populate wheelchair_accessible for every published trip.",
    });
  }

  for (const gap of routeGaps) {
    if (gap.gapType === "no_accessible_stops") {
      issues.push({
        code: "ROUTE_NO_ACCESSIBLE_STOPS",
        severity: "critical",
        message: `Route "${gap.routeName}" serves ${gap.stopCount} stops with zero marked accessible`,
        entityType: "route",
        entityId: gap.routeId,
        recommendation: gap.recommendation,
      });
    }
  }

  return issues;
}
