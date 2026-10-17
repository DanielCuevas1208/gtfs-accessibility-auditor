# Roadmap

This roadmap tracks coherent releases for the GTFS Accessibility Auditor.

## Completed

### Release 1: Core audit

- Stream GTFS CSV files.
- Load required GTFS files.
- Audit stop wheelchair_boarding coverage.
- Find invalid values, duplicate stops, orphan references, and trips without stop times.
- Find route-level accessibility gaps.
- Calculate an explained score.
- Write JSON and HTML reports.

### Release 2: Trip accessibility

- Read wheelchair_accessible from trips.txt.
- Report trip accessibility coverage and invalid values.
- Add tripAccessibility to JSON and HTML reports.
- Add a trip accessibility score component.
- Report missing trip accessibility data.

### Release 3: Pathway coverage

- Read optional pathways.txt and levels.txt files.
- Validate pathway identifiers, endpoints, modes, directions, and level references.
- Traverse accessible pathway modes from wheelchair-accessible entrances.
- Report platform locations without an accessible path.
- Report unlinked station locations and missing levels for elevators.
- Add pathways to JSON and HTML reports.
- Add a pathway graph fixture and deterministic tests.

## Planned

### Release 4: Geospatial checks

- Find stops without coordinates.
- Find stops far from the route corridor.
- Report coordinate data quality findings.

### Release 5: Multi-feed runs

- Accept more than one feed in one run.
- Compare accessibility results across feeds.
- Write one comparison report.

## Limits today

- The tool reads one local feed during each run.
- The tool keeps parsed feed rows in memory.
- The tool does not download feeds.
- The tool does not check GTFS Realtime data.
- The tool does not perform geospatial analysis.
- The score does not include optional pathway coverage.
