import { NextRequest, NextResponse } from "next/server";
import { getComplianceStatus } from "@/lib/compliance";

export async function GET(req: NextRequest) {
  try {
    // In production, get schoolId from session/auth
    const schoolId = req.nextUrl.searchParams.get("schoolId") || "default";

    const status = await getComplianceStatus(schoolId);

    if (!status) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("[v0] Error fetching compliance status:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance status" },
      { status: 500 }
    );
  }
}
