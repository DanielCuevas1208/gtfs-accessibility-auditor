# GTFS Accessibility Auditor

Audit static GTFS feeds for wheelchair-accessibility coverage, data quality, route gaps, and pathway reachability.

The CLI reads local GTFS text files. It produces deterministic JSON and HTML reports. It needs no API key or external service.

## Value

Transit data teams can find missing accessibility values before riders depend on them.

The report links each finding to a feed entity, field, severity, and recommendation.

The pathway audit shows whether accessible entrances connect to platform locations.

## Results

The audit reports:

- Wheelchair boarding coverage for passenger locations.
- Accessible, inaccessible, unknown, and missing stop values.
- Trip wheelchair accessibility coverage.
- Invalid values, duplicate stops, orphan references, and trips without stops.
- Route-level accessibility gaps.
- Pathway graph coverage between accessible entrances and platform locations.
- Invalid pathway references and unlinked station locations.
- An explained score from 0 through 100.

The score has five components. Pathway findings remain separate because pathway files are optional.

| Score component | Weight |
|---|---:|
| Accessibility data coverage | 30 percent |
| Accessible stop share | 30 percent |
| Data quality | 15 percent |
| Trip accessibility data | 15 percent |
| Route-level equity | 10 percent |

## Architecture

The loader streams each CSV file and keeps typed feed rows in memory.

The audit modules calculate independent summaries. The report layer serializes the same report as JSON or HTML.

| Directory | Purpose |
|---|---|
| src/ingest | Stream CSV rows and load optional GTFS files. |
| src/audit | Audit stops, trips, routes, and pathway graphs. |
| src/scoring | Calculate weighted score components. |
| src/reports | Write JSON and self-contained HTML. |
| src/types | Define GTFS and report contracts. |
| fixtures | Store a small feed with known gaps. |
| tests | Verify core behavior and integration output. |

## Setup

Requirements:

- Node.js 18 or later.
- A local GTFS feed directory.

Required feed files:

- routes.txt
- stops.txt
- trips.txt
- stop_times.txt

Optional pathway files:

- pathways.txt
- levels.txt

Install dependencies from the committed lockfile.

~~~bash
npm ci
~~~

Build the TypeScript sources.

~~~bash
npm run build
~~~

## Use

Audit the included feed.

~~~bash
npm run audit -- ./fixtures/sample-feed
~~~

Audit another feed after building.

~~~bash
node dist/cli.js audit ./my-feed
~~~

Write only JSON.

~~~bash
node dist/cli.js audit ./my-feed --output ./reports --format json
~~~

Write only HTML.

~~~bash
node dist/cli.js audit ./my-feed --format html
~~~

The default output directory is ./report-output.

The default format is both.

## Pathway audit

The loader reads pathways.txt and levels.txt when present.

The audit treats walkways, moving sidewalks, elevators, and gates as traversable.

The audit treats stairs and escalators as non-accessible connections.

The audit starts at wheelchair-accessible entrances.

It checks reachability for platform and boarding-area locations in the pathway graph.

It reports missing levels for elevator pathways, invalid references, and unlinked station locations.

This rule is a conservative data check. It does not model temporary outages, staff assistance, slope, width, or equipment condition.

## Sample output

Run the included audit.

~~~text
Score: 61/100 (Grade D)
Overall accessibility score: 61/100 (grade D). Weakest area: Accessible stop share (20/100).

Issues: 5 (2 route gaps)
Reports written:
  ./report-output/accessibility-audit.json
  ./report-output/accessibility-audit.html
~~~

The sample pathway graph reaches one of two platform locations.

The second platform uses stairs, so the report records one critical pathway gap.

The JSON report contains a pathways object.

The HTML report contains a Pathway coverage card.

## Tests

Run the automated tests.

~~~bash
npm test
~~~

Run the TypeScript check.

~~~bash
npm run typecheck
~~~

Build the distribution.

~~~bash
npm run build
~~~

The tests cover CSV parsing, optional-file loading, audits, scoring, reports, integration, and property-based invariants.

The checked-in CI workflow runs tests, type checks, builds, and the sample audit.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed releases and planned work.

## Limitations

- The tool audits one local feed per run.
- The tool keeps parsed feed rows in memory.
- The tool does not download feeds.
- The tool does not check GTFS Realtime data.
- The tool does not perform geospatial analysis.
- The pathway rule does not model outages or assistance.
- The score does not include optional pathway coverage.

## Documentation

This documentation follows ASD-STE100 Issue 9 principles.

Instructions use short active sentences.

Descriptive sentences use short active sentences.

This project does not claim formal ASD-STE100 certification.

## License

The MIT License applies. See [LICENSE](LICENSE).
