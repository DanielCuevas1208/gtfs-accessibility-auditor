# GTFS Accessibility Auditor

A production-quality TypeScript CLI that audits public-transit [GTFS](https://gtfs.org/) feeds for wheelchair-accessibility coverage, data quality, and actionable route-level gaps. It streams CSV ingestion for large feeds, produces explainable scores, and generates JSON and HTML reports.

## Problem

Transit agencies publish GTFS feeds with a `wheelchair_boarding` field on stops, but coverage is often incomplete and inconsistent. Planners and advocates need a fast, local tool that answers:

- How much of the feed has known accessibility data?
- What share of stops are marked accessible?
- Are there data-quality problems (invalid values, orphans, duplicates)?
- Which routes have no accessible stops or serve mostly inaccessible locations?

This tool answers those questions with deterministic scoring and human-readable explanations—no external services or API keys required.

## Design choices

| Area | Choice | Rationale |
|------|--------|-----------|
| Runtime | Node.js 18+ (ESM) | Ubiquitous, strong streaming I/O |
| Language | Strict TypeScript | Type safety for GTFS entities and audit results |
| CSV ingestion | Native `readline` streams | True line-by-line streaming without extra runtime deps |
| Scoring | Weighted, explainable components | Each sub-score has a label, weight, raw value, and narrative |
| Reports | JSON (machine) + HTML (human) | Self-contained HTML with inline CSS; JSON for pipelines |
| Tests | Vitest + fast-check | Unit, integration, and property-based coverage |

### Scoring model

The overall score (0–100, grade A–F) combines four weighted components:

1. **Accessibility data coverage** (35%) — share of boarding stops with a known `wheelchair_boarding` value (1 or 2, not missing/invalid).
2. **Accessible stop share** (35%) — among stops with known status, how many are marked accessible (1).
3. **Data quality** (20%) — penalties for invalid values, duplicate IDs, orphan references, trips without stops.
4. **Route-level equity** (10%) — penalties for routes with critical or warning-level accessibility gaps.

Each component includes an explanation string suitable for reports and stakeholder briefings.

### Route gap types

- `no_accessible_stops` — route serves stops but none are marked accessible (critical).
- `all_unknown` — every served stop lacks accessibility data (warning).
- `majority_inaccessible` — more inaccessible than accessible stops on the route (warning).

## Setup

**Prerequisites:** Node.js 18 or later.

```bash
git clone <repo-url>
cd gtfs-accessibility-auditor
npm install
npm run build
```

## Usage

Audit a GTFS feed directory (folder containing `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`):

```bash
npm run audit -- ./fixtures/sample-feed
```

Or after building:

```bash
node dist/cli.js audit ./fixtures/sample-feed
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--output`, `-o` | Report output directory | `./report-output` |
| `--format`, `-f` | `json`, `html`, or `both` | `both` |

### Examples

```bash
# JSON report only
node dist/cli.js audit ./my-feed -o ./reports -f json

# HTML report only
node dist/cli.js audit ./my-feed -f html
```

### Sample output

```
Loading GTFS feed from .../fixtures/sample-feed...
Loaded 11 stops, 3 routes, 5 trips, 17 stop_times
Running accessibility audit...

Score: 62/100 (Grade D)
Overall accessibility score: 62/100 (grade D). Weakest area: Accessible stop share (20/100).

Issues: 2 (2 route gaps)
Reports written:
  .../report-output/accessibility-audit.json
  .../report-output/accessibility-audit.html
```

Open `accessibility-audit.html` in a browser for a visual summary with coverage metrics, score breakdown, route gaps, and issue tables.

## Development

```bash
npm test          # Run all tests (unit + property + integration)
npm run typecheck # TypeScript check without emit
npm run build     # Compile to dist/
npm run test:watch
```

## Project structure

```
src/
  ingest/       Streaming CSV reader and GTFS loader
  audit/        Coverage, data quality, route gaps
  scoring/      Explainable weighted score
  reports/      JSON and HTML generators
  types/        GTFS and audit type definitions
  cli.ts        CLI entry point
fixtures/
  sample-feed/  Demo GTFS feed with intentional gaps
tests/          Unit, property-based, and integration tests
```

## Limitations

- **Stop-level only** — does not evaluate `trips.wheelchair_accessible` or pathway/elevator data from GTFS Pathways extensions.
- **No geospatial analysis** — does not measure sidewalk quality, grade, or distance to accessible alternatives.
- **In-memory graph** — while CSV files are streamed, the full feed is held in memory after load. Very large feeds (millions of `stop_times` rows) may require additional optimization.
- **Single agency** — scoring assumes one feed per run; multi-agency consolidation is out of scope.
- **GTFS subset** — requires core files only; optional files (`calendar`, `shapes`, etc.) are ignored.

## License

MIT
