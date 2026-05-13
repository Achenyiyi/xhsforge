import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { getRecordsInTable } from "@/lib/feishu";
import { runtimeConfig } from "@/lib/runtimeConfig";

const REWRITE_TABLE_ID = runtimeConfig.feishu.rewriteTableId;

function toStr(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toStr).join("");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.name === "string") return record.name;
    if (typeof record.value === "string") return record.value;
  }
  return String(value);
}

export async function GET() {
  try {
    await requireUser();

    if (!REWRITE_TABLE_ID) {
      return NextResponse.json({ accounts: [] });
    }

    const accounts = new Set<string>();
    let pageToken: string | undefined;

    while (true) {
      const result = await getRecordsInTable(REWRITE_TABLE_ID, 100, pageToken);

      for (const item of result.items || []) {
        const account = toStr(item.fields["发布账号"]).trim();
        if (account) accounts.add(account);
      }

      if (!result.has_more || !result.page_token) break;
      pageToken = result.page_token;
    }

    return NextResponse.json({
      accounts: Array.from(accounts).sort((left, right) =>
        left.localeCompare(right, "zh-CN")
      ),
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Get publish accounts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取发布账号失败" },
      { status: 500 }
    );
  }
}
