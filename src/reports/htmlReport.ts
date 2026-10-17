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
    critical: "#b42318",
    warning: "#b54708",
    info: "#1769aa",
  };
  const color = colors[severity] ?? "#667085";
  return `<span class="badge" style="background:${color}">${escapeHtml(severity)}</span>`;
}

function renderIssues(issues: AuditIssue[]): string {
  if (issues.length === 0) {
    return '<p class="muted">No issues found.</p>';
  }
  return `<table>
    <thead><tr><th>Severity</th><th>Code</th><th>Message</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${issues
        .map(
          (issue) => `<tr>
        <td>${severityBadge(issue.severity)}</td>
        <td><code>${escapeHtml(issue.code)}</code></td>
        <td>${escapeHtml(issue.message)}</td>
        <td>${escapeHtml(issue.recommendation)}</td>
      </tr>`
        )
        .join("\n")}
    </tbody>
  </table>`;
}

function renderRouteGaps(gaps: RouteGap[]): string {
  if (gaps.length === 0) {
    return '<p class="muted">No route-level gaps identified.</p>';
  }
  return `<table>
    <thead><tr><th>Severity</th><th>Route</th><th>Gap type</th><th>Stops (A/I/U)</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${gaps
        .map(
          (gap) => `<tr>
        <td>${severityBadge(gap.severity)}</td>
        <td>${escapeHtml(gap.routeName)}</td>
        <td><code>${escapeHtml(gap.gapType)}</code></td>
        <td>${gap.accessibleStopCount}/${gap.inaccessibleStopCount}/${gap.unknownStopCount}</td>
        <td>${escapeHtml(gap.recommendation)}</td>
      </tr>`
        )
        .join("\n")}
    </tbody>
  </table>`;
}

function renderPathways(report: AuditReport): string {
  const pathways = report.pathways;
  if (!pathways.pathwaysFilePresent) {
    return '<p class="muted">This feed does not include pathways.txt.</p>';
  }

  const gapTable =
    pathways.gaps.length === 0
      ? '<p class="muted">All connected platform locations have an accessible entrance path.</p>'
      : `<table>
    <thead><tr><th>Severity</th><th>Platform</th><th>Gap</th><th>Recommendation</th></tr></thead>
    <tbody>
      ${pathways.gaps
        .map(
          (gap) => `<tr>
        <td>${severityBadge(gap.severity)}</td>
        <td>${escapeHtml(gap.stopName)}</td>
        <td><code>${escapeHtml(gap.reason)}</code></td>
        <td>${escapeHtml(gap.recommendation)}</td>
      </tr>`
        )
        .join("\n")}
    </tbody>
  </table>`;

  return `<div class="metrics">
    <div class="metric"><strong>${pathways.pathwayCount}</strong>Pathways</div>
    <div class="metric"><strong>${pathways.levelCount}</strong>Levels</div>
    <div class="metric"><strong>${pathways.accessibleEntranceCount}</strong>Accessible entrances</div>
    <div class="metric"><strong>${pathways.platformCount}</strong>Platforms</div>
    <div class="metric"><strong>${pathways.reachablePlatformCount}</strong>Reachable platforms</div>
    <div class="metric"><strong>${Math.round(pathways.coverageRate * 100)}%</strong>Pathway coverage</div>
  </div>
  <p class="muted">${pathways.elevatorPathwayCount} elevator pathway(s); ${pathways.unlinkedLocationCount} unlinked location(s); ${pathways.invalidPathways} invalid pathway row(s).</p>
  ${gapTable}`;
}

export function renderHtmlReport(report: AuditReport): string {
  const { coverage, score, dataQuality, tripAccessibility } = report;
  const components = score.components
    .map(
      (component) => `<div class="component">
      <div class="component-header">
        <strong>${escapeHtml(component.label)}</strong>
        <span>${Math.round(component.rawScore)}/100 · weight ${Math.round(component.weight * 100)}%</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, component.rawScore))}%"></div></div>
      <p class="explanation">${escapeHtml(component.explanation)}</p>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GTFS Accessibility Audit · ${escapeHtml(report.agencyName)}</title>
  <style>
    :root { --navy: #102a43; --teal: #0f766e; --mint: #e7f6f2; --paper: #f5f7fa; --card: #fff; --ink: #172b4d; --muted: #5b6b7a; --line: #d9e2ec; }
    * { box-sizing: border-box; }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--paper); color: var(--ink); margin: 0; padding: 2rem; line-height: 1.5; }
    main { max-width: 1120px; margin: 0 auto; }
    h1 { margin: 0; color: #fff; font-size: clamp(1.8rem, 4vw, 2.7rem); }
    h2 { color: var(--navy); margin-top: 0; }
    .masthead { background: var(--navy); border-top: 0.4rem solid var(--teal); border-radius: 1rem; padding: 2rem; margin-bottom: 1.5rem; }
    .masthead p { color: #d9e2ec; margin-bottom: 0; overflow-wrap: anywhere; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 0.5rem 1.5rem rgba(16, 42, 67, .06); }
    .score-hero { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 2rem; }
    .score-circle { width: 132px; height: 132px; border-radius: 50%; background: var(--teal); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 2.3rem; font-weight: 800; box-shadow: 0 0 0 0.5rem var(--mint); }
    .score-circle small { font-size: .9rem; font-weight: 500; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: .8rem; }
    .metric { text-align: center; padding: .8rem; background: var(--mint); border-radius: .7rem; }
    .metric strong { display: block; font-size: 1.45rem; color: var(--navy); }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th, td { text-align: left; padding: .65rem .75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { background: var(--paper); color: var(--navy); }
    .badge { color: #fff; padding: .15rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .component { margin-bottom: 1.1rem; }
    .component:last-child { margin-bottom: 0; }
    .component-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: .3rem; }
    .bar-track { height: .55rem; background: #e6edf3; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--teal); border-radius: 999px; }
    .explanation, .muted { color: var(--muted); }
    .explanation { font-size: .9rem; margin: .3rem 0 0; }
    code { background: #eef2f6; color: var(--navy); padding: .1rem .3rem; border-radius: .25rem; font-size: .85em; }
    @media (max-width: 640px) { body { padding: 1rem; } .score-hero { grid-template-columns: 1fr; } .score-circle { margin: 0 auto; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
  <main>
    <header class="masthead">
      <h1>GTFS Accessibility Audit</h1>
      <p>${escapeHtml(report.agencyName)} · ${escapeHtml(report.feedPath)} · Generated ${escapeHtml(report.generatedAt)}</p>
    </header>

    <section class="card score-hero">
      <div class="score-circle">${score.overall}<small>Grade ${score.grade}</small></div>
      <div>
        <p>${escapeHtml(score.summary)}</p>
        ${components}
      </div>
    </section>

    <section class="card">
      <h2>Stop coverage</h2>
      <div class="metrics">
        <div class="metric"><strong>${coverage.totalStops}</strong>Boarding stops</div>
        <div class="metric"><strong>${coverage.accessible}</strong>Accessible</div>
        <div class="metric"><strong>${coverage.notAccessible}</strong>Not accessible</div>
        <div class="metric"><strong>${coverage.unknown}</strong>Unknown</div>
        <div class="metric"><strong>${coverage.missing}</strong>Missing field</div>
        <div class="metric"><strong>${Math.round(coverage.coverageRate * 100)}%</strong>Known status</div>
      </div>
    </section>

    <section class="card">
      <h2>Trip accessibility</h2>
      <div class="metrics">
        <div class="metric"><strong>${tripAccessibility.totalTrips}</strong>Trips</div>
        <div class="metric"><strong>${tripAccessibility.accessible}</strong>Accessible</div>
        <div class="metric"><strong>${tripAccessibility.notAccessible}</strong>Not accessible</div>
        <div class="metric"><strong>${tripAccessibility.unknown}</strong>Unknown</div>
        <div class="metric"><strong>${tripAccessibility.missing}</strong>Missing field</div>
        <div class="metric"><strong>${tripAccessibility.invalid}</strong>Invalid values</div>
        <div class="metric"><strong>${Math.round(tripAccessibility.coverageRate * 100)}%</strong>Data coverage</div>
      </div>
    </section>

    <section class="card">
      <h2>Pathway coverage</h2>
      ${renderPathways(report)}
    </section>

    <section class="card">
      <h2>Data quality</h2>
      <p>${dataQuality.issues.length} issue(s): ${dataQuality.invalidWheelchairValues} invalid values, ${dataQuality.duplicateStopIds} duplicates, ${dataQuality.orphanStopTimes} orphan references.</p>
    </section>

    <section class="card">
      <h2>Route-level gaps</h2>
      ${renderRouteGaps(report.routeGaps)}
    </section>

    <section class="card">
      <h2>All issues</h2>
      ${renderIssues(report.issues)}
    </section>
  </main>
</body>
</html>`;
}

export async function writeHtmlReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  await writeFile(outputPath, renderHtmlReport(report), "utf-8");
}
