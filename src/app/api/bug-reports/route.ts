import { BugReportSeverity } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { createBugReport } from "@/services/bug-reports/bug-report-service";

const LOG_SOURCE = "BugReportsAPI";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const form = await request.formData();
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }
    const severityValue = String(form.get("severity") ?? "MEDIUM").toUpperCase();
    const severity = Object.values(BugReportSeverity).includes(severityValue as BugReportSeverity)
      ? (severityValue as BugReportSeverity)
      : BugReportSeverity.MEDIUM;
    const file = form.get("attachment");
    if (file instanceof File && file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "Attachment must be 5 MB or smaller" }, { status: 413 });
    }
    const report = await createBugReport(auth.userId, {
      title,
      description,
      reproductionSteps: String(form.get("reproductionSteps") ?? ""),
      expectedBehavior: String(form.get("expectedBehavior") ?? ""),
      actualBehavior: String(form.get("actualBehavior") ?? ""),
      severity,
      route: String(form.get("route") ?? ""),
      appVersion: String(form.get("appVersion") ?? ""),
      viewport: String(form.get("viewport") ?? ""),
      theme: String(form.get("theme") ?? ""),
      browser: String(form.get("browser") ?? ""),
      ...(file instanceof File && file.size > 0
        ? {
            attachment: {
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              data: new Uint8Array(await file.arrayBuffer()),
            },
          }
        : {}),
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create bug report", LOG_SOURCE, "Could not submit report.");
  }
}
