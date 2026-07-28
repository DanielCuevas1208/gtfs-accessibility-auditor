import { writeFile } from "node:fs/promises";
import type { AuditReport } from "../types/audit.js";

export function serializeReportJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

export async function writeJsonReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  await writeFile(outputPath, serializeReportJson(report), "utf-8");
}
