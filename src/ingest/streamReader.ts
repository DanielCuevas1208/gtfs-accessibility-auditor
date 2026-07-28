import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Parse a single CSV record line, respecting double-quoted fields.
 * GTFS uses simple comma-separated values with optional quoting.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export interface CsvRowHandler {
  onHeader: (headers: string[]) => void;
  onRow: (row: Record<string, string>, lineNumber: number) => void;
}

/**
 * Stream-read a GTFS CSV file line by line without loading the full file.
 */
export async function streamCsvFile(
  filePath: string,
  handler: CsvRowHandler
): Promise<number> {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let lineNumber = 0;
  let rowCount = 0;

  for await (const line of rl) {
    lineNumber++;
    if (line.trim() === "") {
      continue;
    }
    const fields = parseCsvLine(line);
    if (headers === null) {
      headers = fields.map((h) => h.trim());
      handler.onHeader(headers);
      continue;
    }
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = fields[i] ?? "";
    }
    handler.onRow(row, lineNumber);
    rowCount++;
  }

  return rowCount;
}

export function rowToTyped<T>(row: Record<string, string>): T {
  return row as unknown as T;
}
