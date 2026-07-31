import { NextRequest, NextResponse } from "next/server";
import { checkModuleAccess } from "@/lib/compliance";

/**
 * Check if a module can be accessed based on compliance status
 * GET /api/v1/compliance/module-access?schoolId=&module=AI_TUTOR
 */
export async function GET(req: NextRequest) {
  try {
    const schoolId = req.nextUrl.searchParams.get("schoolId");
    const module = req.nextUrl.searchParams.get("module");

    if (!schoolId || !module) {
      return NextResponse.json(
        { error: "Missing schoolId or module parameter" },
        { status: 400 }
      );
    }

    const result = await checkModuleAccess(schoolId, module);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[v0] Error checking module access:", error);
    return NextResponse.json(
      { error: "Failed to check module access" },
      { status: 500 }
    );
  }
}
