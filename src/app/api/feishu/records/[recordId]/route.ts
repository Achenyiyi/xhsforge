import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { deleteRecordInTable, TABLE_ID } from "@/lib/feishu";

type Params = {
  params: Promise<{
    recordId: string;
  }>;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

export async function DELETE(_req: NextRequest, context: Params) {
  try {
    await requireUser();

    const { recordId } = await context.params;
    const normalizedRecordId = recordId.trim();

    if (!normalizedRecordId) {
      return NextResponse.json(
        { error: "缺少爆款库记录ID" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    await deleteRecordInTable(TABLE_ID, normalizedRecordId);

    return NextResponse.json(
      { success: true, recordId: normalizedRecordId },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Delete collect record error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除爆款库记录失败" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
