import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { getCollectRecords } from "@/lib/feishu";
import { dedupeTags, extractTagsFromText, stripTagsFromText } from "@/lib/xhs";
import { buildOpenableNoteLink } from "@/lib/xhsLink";
import type { FeishuCollectRecord } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "Surrogate-Control": "no-store",
};

const REPLACE_INFO_FIELD_NAMES = {
  title: "标题替换信息",
  body: "正文替换信息",
  cover: "封面文案替换信息",
} as const;

/** 安全取数字 */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

/** 安全取字符串 */
function toStr(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(toStr).join("");
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if (obj.text) return String(obj.text);
    if (obj.link) return String(obj.link);
  }
  return String(v);
}

function toLinkUrl(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if (typeof obj.link === "string") return obj.link;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.text === "string") return obj.text;
  }
  return "";
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (!normalized) return false;
    if (["false", "0", "no", "off", "否", "不是", "未勾选"].includes(normalized)) {
      return false;
    }
    return true;
  }
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.checked === "boolean") return obj.checked;
    if (typeof obj.value === "boolean") return obj.value;
  }
  return Boolean(v);
}

function parseTags(v: unknown): string[] {
  const raw = toStr(v).trim();
  if (!raw) return [];
  if (["无", "暂无标签", "-", "—"].includes(raw)) return [];

  const extracted = extractTagsFromText(raw);
  if (extracted.length > 0) return extracted;

  return dedupeTags(raw.split(/[\s、，,]+/));
}

/** 取附件URL */
function toAttachmentUrl(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0] as Record<string, unknown>;
    return (first.tmp_url || first.url || first.link || "") as string;
  }
  if (typeof v === "string") return v;
  return "";
}

function toAttachmentToken(v: unknown): string {
  if (!Array.isArray(v) || v.length === 0) return "";

  const first = v[0];
  if (!first || typeof first !== "object") return "";

  const attachment = first as Record<string, unknown>;
  return String(attachment.file_token || attachment.token || "");
}

function toAttachmentUrls(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const attachment = item as Record<string, unknown>;
      return String(attachment.tmp_url || attachment.url || attachment.link || "");
    })
    .filter(Boolean);
}

function tsToStr(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") {
    return v.slice(0, 16);
  }
  const ts = typeof v === "number" ? v : Number(v);
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function GET() {
  try {
    await requireUser();

    let allItems: Array<{ record_id: string; fields: Record<string, unknown> }> = [];
    let pageToken: string | undefined;

    // 循环拉取所有记录（处理分页）
    while (true) {
      const result = await getCollectRecords(100, pageToken);
      allItems = allItems.concat(result.items || []);
      if (!result.has_more || !result.page_token) break;
      pageToken = result.page_token;
    }

    const records: FeishuCollectRecord[] = allItems.map((item) => {
      const f = item.fields;
      const noteLink = buildOpenableNoteLink(toLinkUrl(f["笔记链接"]));
      const rewriteTagsFromCollect = parseTags(f["二创标签"]);

      return {
        recordId: item.record_id,
        collectDate: tsToStr(f["采集日期"]),
        searchKeyword: toStr(f["搜索关键词"]),
        noteLink,
        publishTime: tsToStr(f["发布时间"]),
        likedCount: toNum(f["点赞数"]),
        collectedCount: toNum(f["收藏数"]),
        commentCount: toNum(f["评论数"]),
        shareCount: toNum(f["转发数"]),
        cover: toAttachmentUrl(f["封面"]),
        coverAttachmentToken: toAttachmentToken(f["封面"]),
        coverText: toStr(f["封面文案"]),
        rewriteTitleReplaceInfo: toStr(f[REPLACE_INFO_FIELD_NAMES.title]),
        rewriteBodyReplaceInfo: toStr(f[REPLACE_INFO_FIELD_NAMES.body]),
        rewriteCoverReplaceInfo: toStr(f[REPLACE_INFO_FIELD_NAMES.cover]),
        rewriteDate: tsToStr(f["二创日期"]),
        rewriteTitle: toStr(f["二创标题"]),
        rewriteBody: toStr(f["二创正文"]),
        rewriteCover:
          toAttachmentUrl(f["二创封面"]) ||
          toAttachmentUrls(f["封面"])[1] ||
          "",
        rewriteCoverText: toStr(f["二创封面文案"]),
        rewriteTags: rewriteTagsFromCollect,
        rewriteRemark: toStr(f["备注"]),
        publishPersona: toStr(f["发布人设"]),
        recruitmentDirection: toStr(f["招聘方向"]),
        publishAccount: toStr(f["发布账号"]),
        scheduledPublishTime: tsToStr(f["定时发布时间"]),
        isTestPost: toBool(f["测试"]),
        hasRewritten: toBool(f["已二创"]),
        // 标题和正文字段（实际字段名已确认）
        originalTitle: toStr(f["标题"]),
        originalBody: stripTagsFromText(toStr(f["正文"])),
        originalTags: parseTags(f["标签"]),
      };
    });

    return NextResponse.json(
      { records, total: records.length, source: "feishu-collect-table" },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e: unknown) {
    const authResponse = authErrorResponse(e);
    if (authResponse) return authResponse;

    console.error("Feishu records error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "获取记录失败" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
