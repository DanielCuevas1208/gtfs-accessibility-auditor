import { writeFile } from "node:fs/promises";
import type { AuditIssue, AuditReport, RouteGap } from "../types/audit.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function severityBadge(severity: string): string {
  const colors: Record<string, string> = {
    critical: "#c0392b",
    warning: "#e67e22",
    info: "#2980b9",
  };
  const color = colors[severity] ?? "#7f8c8d";
  return `<span class="badge" style="background:${color}">${escapeHtml(severity)}</span>`;
}

function renderIssues(issues: AuditIssue[]): string {
  if (issues.length === 0) {
    return "<p class=\"muted\">No issues found.</p>";
  }
  return `<table>
    <thead><tr><th>Severity</th><th>Code</th><th>Message</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${issues
        .map(
          (i) => `<tr>
        <td>${severityBadge(i.severity)}</td>
        <td><code>${escapeHtml(i.code)}</code></td>
        <td>${escapeHtml(i.message)}</td>
        <td>${escapeHtml(i.recommendation)}</td>
      </tr>`
        )
        .join("\n")}
    </tbody>
  </table>`;
}

function renderRouteGaps(gaps: RouteGap[]): string {
  if (gaps.length === 0) {
    return "<p class=\"muted\">No route-level gaps identified.</p>";
  }
  return `<table>
    <thead><tr><th>Severity</th><th>Route</th><th>Gap type</th><th>Stops (A/I/U)</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${gaps
        .map(
          (g) => `<tr>
        <td>${severityBadge(g.severity)}</td>
        <td>${escapeHtml(g.routeName)}</td>
        <td><code>${escapeHtml(g.gapType)}</code></td>
        <td>${g.accessibleStopCount}/${g.inaccessibleStopCount}/${g.unknownStopCount}</td>
        <td>${escapeHtml(g.recommendation)}</td>
      </tr>`
        )
        .join("\n")}
    </tbody>
  </table>`;
}

export function renderHtmlReport(report: AuditReport): string {
  const { coverage, score, dataQuality, tripAccessibility } = report;
  const components = score.components
    .map(
      (c) => `<div class="component">
      <div class="component-header">
        <strong>${escapeHtml(c.label)}</strong>
        <span>${Math.round(c.rawScore)}/100 (weight ${Math.round(c.weight * 100)}%)</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, c.rawScore))}%"></div></div>
      <p class="explanation">${escapeHtml(c.explanation)}</p>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GTFS Accessibility Audit – ${escapeHtml(report.agencyName)}</title>
  <style>
    :root { --bg: #f8f9fa; --card: #fff; --text: #1a1a2e; --muted: #6c757d; --accent: #0d6efd; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 2rem; line-height: 1.5; }
    h1 { margin-top: 0; }
    .muted { color: var(--muted); }
    .card { background: var(--card); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .score-hero { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; }
    .score-circle small { font-size: .9rem; font-weight: 400; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
    .metric { text-align: center; padding: .75rem; background: var(--bg); border-radius: 6px; }
    .metric strong { display: block; font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #dee2e6; vertical-align: top; }
    th { background: var(--bg); }
    .badge { color: #fff; padding: .15rem .5rem; border-radius: 4px; font-size: .75rem; text-transform: uppercase; }
    .component { margin-bottom: 1rem; }
    .component-header { display: flex; justify-content: space-between; margin-bottom: .25rem; }
    .bar-track { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; }
    .explanation { font-size: .9rem; color: var(--muted); margin: .25rem 0 0; }
    code { background: #e9ecef; padding: .1rem .3rem; border-radius: 3px; font-size: .85em; }
  </style>
</head>
<body>
  <h1>GTFS Accessibility Audit</h1>
  <p class="muted">${escapeHtml(report.agencyName)} · ${escapeHtml(report.feedPath)} · Generated ${escapeHtml(report.generatedAt)}</p>

  <div class="card score-hero">
    <div class="score-circle">${score.overall}<small>Grade ${score.grade}</small></div>
    <div>
      <p>${escapeHtml(score.summary)}</p>
      ${components}
    </div>
  </div>

  <div class="card">
    <h2>Coverage</h2>
    <div class="metrics">
      <div class="metric"><strong>${coverage.totalStops}</strong>Boarding stops</div>
      <div class="metric"><strong>${coverage.accessible}</strong>Accessible</div>
      <div class="metric"><strong>${coverage.notAccessible}</strong>Not accessible</div>
      <div class="metric"><strong>${coverage.unknown}</strong>Unknown (0)</div>
      <div class="metric"><strong>${coverage.missing}</strong>Missing field</div>
      <div class="metric"><strong>${Math.round(coverage.coverageRate * 100)}%</strong>Known status</div>
    </div>
  </div>

  <div class="card">
    <h2>Data quality</h2>
    <p>${dataQuality.issues.length} issue(s): ${dataQuality.invalidWheelchairValues} invalid values, ${dataQuality.duplicateStopIds} duplicates, ${dataQuality.orphanStopTimes} orphan references.</p>
  </div>

  <div class="card">
    <h2>Trip accessibility</h2>
    <div class="metrics">
      <div class="metric"><strong>${tripAccessibility.totalTrips}</strong>Trips</div>
      <div class="metric"><strong>${tripAccessibility.accessible}</strong>Accessible</div>
      <div class="metric"><strong>${tripAccessibility.notAccessible}</strong>Not accessible</div>
      <div class="metric"><strong>${tripAccessibility.unknown}</strong>Unknown (0)</div>
      <div class="metric"><strong>${tripAccessibility.missing}</strong>Missing field</div>
      <div class="metric"><strong>${tripAccessibility.invalid}</strong>Invalid values</div>
      <div class="metric"><strong>${Math.round(tripAccessibility.coverageRate * 100)}%</strong>Data coverage</div>
    </div>
  </div>

  <div class="card">
    <h2>Route-level gaps</h2>
    ${renderRouteGaps(report.routeGaps)}
  </div>

  <div class="card">
    <h2>All issues</h2>
    ${renderIssues(report.issues)}
  </div>
</body>
</html>`;
}

export async function writeHtmlReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  await writeFile(outputPath, renderHtmlReport(report), "utf-8");
}
