import type { GtfsFeed } from "../types/gtfs.js";
import type {
  AccessibilityScore,
  AuditIssue,
  AuditReport,
  CoverageMetrics,
  DataQualitySummary,
  RouteGap,
} from "../types/audit.js";
import { auditCoverage } from "./coverage.js";
import { auditDataQuality } from "./dataQuality.js";
import { auditRouteGaps } from "./routeGaps.js";
import { computeAccessibilityScore } from "../scoring/scorer.js";

export interface AuditOptions {
  feedPath: string;
}

export function runAudit(feed: GtfsFeed, options: AuditOptions): AuditReport {
  const coverage = auditCoverage(feed);
  const dataQuality = auditDataQuality(feed);
  const routeGaps = auditRouteGaps(feed);
  const issues = collectIssues(coverage, dataQuality, routeGaps);
  const score = computeAccessibilityScore(coverage, dataQuality, routeGaps);

  const agencyName =
    feed.agencies[0]?.agency_name ?? "Unknown Agency";

  return {
    generatedAt: new Date().toISOString(),
    feedPath: options.feedPath,
    agencyName,
    coverage,
    dataQuality,
    routeGaps,
    issues,
    score,
  };
}

function collectIssues(
  coverage: CoverageMetrics,
  dataQuality: DataQualitySummary,
  routeGaps: RouteGap[]
): AuditIssue[] {
  const issues: AuditIssue[] = [...dataQuality.issues];

  if (coverage.missing > 0) {
    issues.push({
      code: "MISSING_WHEELCHAIR_DATA",
      severity: coverage.missing > coverage.totalStops * 0.5 ? "critical" : "warning",
      message: `${coverage.missing} of ${coverage.totalStops} boarding stops lack wheelchair_boarding`,
      entityType: "feed",
      field: "wheelchair_boarding",
      recommendation:
        "Populate wheelchair_boarding for all passenger boarding locations.",
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
