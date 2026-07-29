# GTFS Accessibility Auditor

This TypeScript command-line tool checks wheelchair data in a General Transit Feed Specification feed.

The tool finds missing data, incorrect values, and route-level accessibility gaps. It creates JSON and HTML reports.

The tool does not need an API key or an external service.

## Results

The audit gives these results:

- Wheelchair-data coverage for passenger boarding locations
- The quantity of accessible and inaccessible stops
- Trip wheelchair accessibility coverage from `trips.txt`
- Invalid values and duplicate stop identifiers
- Stop times that refer to missing stops
- Trips that do not have stop times
- Routes that have critical accessibility gaps
- An explained score from 0 through 100

## Score

The tool calculates five score parts.

| Score part | Weight |
|---|---:|
| Accessibility data coverage | 30 percent |
| Accessible stop share | 30 percent |
| Data quality | 15 percent |
| Trip accessibility data | 15 percent |
| Route-level accessibility | 10 percent |

Each score part has a label, a value, and an explanation.

## Requirements

- Node.js 18 or later
- A GTFS feed directory

The feed must contain these files:

- `routes.txt`
- `stops.txt`
- `trips.txt`
- `stop_times.txt`

The tool also reads `agency.txt` when the file is available.

## Installation

1. Clone the repository.

   ```bash
   git clone https://github.com/DanielCuevas1208/gtfs-accessibility-auditor.git
   ```

2. Go to the project directory.

   ```bash
   cd gtfs-accessibility-auditor
   ```

3. Install the dependencies.

   ```bash
   npm install
   ```

4. Build the tool.

   ```bash
   npm run build
   ```

## Use

Audit the sample feed.

```bash
npm run audit -- ./fixtures/sample-feed
```

Audit another feed.

```bash
node dist/cli.js audit ./my-feed
```

Write only a JSON report.

```bash
node dist/cli.js audit ./my-feed --output ./reports --format json
```

Write only an HTML report.

```bash
node dist/cli.js audit ./my-feed --format html
```

The default output directory is `./report-output`. The default format is `both`.

## Sample output

Audit the included fixture and read the score line.

```text
Score: 61/100 (Grade D)
Overall accessibility score: 61/100 (grade D). Weakest area: Accessible stop share (20/100).

Issues: 4 (2 route gaps)
```

The JSON report has a `tripAccessibility` object. It shows the trip counts, the coverage rate, and the invalid values. The HTML report has a `Trip accessibility` card with the same data.

## Test

Run the automated tests.

```bash
npm test
```

Run the TypeScript check.

```bash
npm run typecheck
```

Run the build.

```bash
npm run build
```

The test suite contains unit tests, integration tests, and property-based tests.

## Design

The CSV reader processes one line at a time. This design decreases the temporary memory requirement during file input.

The audit then keeps the parsed feed in memory. This design makes route analysis simple and deterministic.

The HTML report contains its style data. You can open the report without a web server.

The JSON report supports other tools and automated pipelines.

## Project directories

| Directory | Contents |
|---|---|
| `src/ingest` | CSV reader and GTFS loader |
| `src/audit` | Coverage, data quality, trip, and route checks |
| `src/scoring` | Explained score calculation |
| `src/reports` | JSON and HTML report writers |
| `src/types` | GTFS and report types |
| `fixtures` | A small feed with known gaps |
| `tests` | Automated tests |

## Roadmap

Refer to [ROADMAP.md](ROADMAP.md) for the release plan and the remaining work.

## Limits

- The tool does not check GTFS Pathways data.
- The tool does not do geospatial analysis.
- The tool keeps the parsed feed in memory.
- The tool checks one feed during each run.

## Documentation language

This documentation follows the principal writing rules in ASD-STE100 Issue 9.

Instructions have 20 words or fewer. Descriptive sentences have 25 words or fewer.

The text uses active voice and short paragraphs. GTFS terms and software names are technical nouns.

This project does not claim formal ASD-STE100 certification.

## License

The MIT License applies to this project. Refer to [LICENSE](LICENSE).
