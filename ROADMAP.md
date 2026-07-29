# Roadmap

This roadmap tracks the releases of the GTFS Accessibility Auditor.
Each release adds one coherent slice of behavior.

## Completed

### Release 1: Core audit

- Streaming CSV reader for GTFS files.
- Loader for required GTFS files.
- Stop wheelchair_boarding coverage audit.
- Data-quality audit for invalid values, duplicate stop identifiers, orphan stop references, and trips without stop times.
- Route-level accessibility gap audit.
- Explained score with four weighted components.
- JSON and HTML report writers.

### Release 2: Trip accessibility

- Parse the `wheelchair_accessible` field in `trips.txt`.
- Trip-level coverage, status, and invalid-value audit.
- New `tripAccessibility` section in the JSON and HTML reports.
- Fifth score component for trip accessibility data.
- Issues for missing trip data and invalid trip values.

## Planned

### Release 3: Stop pathway data

- Read GTFS Pathways files (`pathways.txt`, `levels.txt`).
- Audit pathway connectivity between accessible stops.
- Add a pathways coverage section to the reports.

### Release 4: Geospatial checks

- Detect stops without coordinates.
- Detect stops that lie too far from the route corridor.

### Release 5: Multi-feed runs

- Accept more than one feed in a single run.
- Merge results into one comparison report.

## Limits today

- The tool reads one feed during each run.
- The tool keeps the parsed feed in memory.
- The tool does not check GTFS Pathways data.
- The tool does not do geospatial analysis.