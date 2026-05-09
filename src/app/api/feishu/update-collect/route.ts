import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { getTableFields, TABLE_ID, updateCollectRecords } from "@/lib/feishu";
import { dedupeTags, extractTagsFromText, formatTagsForStorage } from "@/lib/xhs";

const FIELD_TYPE_TEXT = 1;

type UpdateCollectPayload = {
  recordId?: unknown;
  fields?: {
    coverText?: unknown;
    title?: unknown;
    body?: unknown;
    tags?: unknown;
  };
};

function hasOwnField(fields: NonNullable<UpdateCollectPayload["fields"]>, key: keyof NonNullable<UpdateCollectPayload["fields"]>) {
  return Object.prototype.hasOwnProperty.call(fields, key);
}

function assertTextField(fieldTypeMap: Map<string, number>, fieldName: string) {
  const actualType = fieldTypeMap.get(fieldName);
  if (actualType === FIELD_TYPE_TEXT) return;

  throw new Error(
    `飞书爆款库字段「${fieldName}」类型错误，当前为 ${actualType ?? "缺失"}，预期为文本字段。`
  );
}

function normalizeText(value: unknown, options: { trim?: boolean } = {}) {
  const normalized = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return options.trim === false ? normalized : normalized.trim();
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeTags(value.map((item) => String(item ?? "")));
  }

  const raw = String(value ?? "").trim();
  if (!raw) return [];

  const extracted = extractTagsFromText(raw);
  const looseTokens = raw
    .split(/[\s\u3000、，,#\n]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return dedupeTags([...extracted, ...looseTokens]);
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const { recordId, fields }: UpdateCollectPayload = await req.json();
    const normalizedRecordId = typeof recordId === "string" ? recordId.trim() : "";

    if (!normalizedRecordId) {
      return NextResponse.json({ error: "缺少爆款库记录ID" }, { status: 400 });
    }
    if (!fields || typeof fields !== "object") {
      return NextResponse.json({ error: "缺少需要同步的字段" }, { status: 400 });
    }

    const { items: tableFields } = await getTableFields(TABLE_ID);
    const fieldTypeMap = new Map(tableFields.map((field) => [field.field_name, field.type]));
    const updateFields: Record<string, unknown> = {};
    const updatedRecord: Record<string, unknown> = {};

    if (hasOwnField(fields, "coverText")) {
      assertTextField(fieldTypeMap, "封面文案");
      const coverText = normalizeText(fields.coverText, { trim: false });
      updateFields["封面文案"] = coverText;
      updatedRecord.coverText = coverText;
    }

    if (hasOwnField(fields, "title")) {
      assertTextField(fieldTypeMap, "标题");
      const title = normalizeText(fields.title);
      updateFields["标题"] = title;
      updatedRecord.originalTitle = title;
    }

    if (hasOwnField(fields, "body")) {
      assertTextField(fieldTypeMap, "正文");
      const body = normalizeText(fields.body, { trim: false }).trim();
      updateFields["正文"] = body;
      updatedRecord.originalBody = body;
    }

    if (hasOwnField(fields, "tags")) {
      assertTextField(fieldTypeMap, "标签");
      const tags = normalizeTags(fields.tags);
      updateFields["标签"] = formatTagsForStorage(tags);
      updatedRecord.originalTags = tags;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "没有可同步的字段" }, { status: 400 });
    }

    await updateCollectRecords([
      {
        record_id: normalizedRecordId,
        fields: updateFields,
      },
    ]);

    return NextResponse.json({
      success: true,
      recordId: normalizedRecordId,
      updatedRecord,
    });
  } catch (error: unknown) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Update collect record error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "同步爆款库失败" },
      { status: 500 }
    );
  }
}
