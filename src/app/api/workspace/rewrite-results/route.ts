import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WORKSPACE_SNAPSHOT_KEY = "workspace-snapshot";
const MAX_DELETE_IDS = 1000;
const MAX_DELETED_REWRITE_RESULT_IDS = 5000;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePayload(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function getRewriteResultId(value: unknown) {
  if (!isObject(value)) return null;
  return typeof value.id === "string" ? value.id : null;
}

function parseDeleteIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_DELETE_IDS);
}

function getDeletedRewriteResultIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string");
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = parseDeleteIds(body.ids);

    if (ids.length === 0) {
      return NextResponse.json({ error: "请选择要删除的二创记录" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.workspaceSnapshot.findUnique({
        where: {
          userId_key: {
            userId: user.id,
            key: WORKSPACE_SNAPSHOT_KEY,
          },
        },
        select: {
          payload: true,
        },
      });

      const payload = normalizePayload(existing?.payload);
      const rewriteResults = Array.isArray(payload.rewriteResults)
        ? payload.rewriteResults
        : [];
      const idSet = new Set(ids);
      const nextRewriteResults = rewriteResults.filter((result) => {
        const id = getRewriteResultId(result);
        return !id || !idSet.has(id);
      });
      const deletedRewriteResultIds = Array.from(
        new Set([
          ...getDeletedRewriteResultIds(payload.deletedRewriteResultIds),
          ...ids,
        ])
      ).slice(-MAX_DELETED_REWRITE_RESULT_IDS);
      const nextPayload = {
        ...payload,
        rewriteResults: nextRewriteResults,
        deletedRewriteResultIds,
      };

      await tx.workspaceSnapshot.upsert({
        where: {
          userId_key: {
            userId: user.id,
            key: WORKSPACE_SNAPSHOT_KEY,
          },
        },
        update: {
          payload: nextPayload as Prisma.InputJsonValue,
        },
        create: {
          userId: user.id,
          key: WORKSPACE_SNAPSHOT_KEY,
          payload: nextPayload as Prisma.InputJsonValue,
        },
      });

      return {
        deleted: rewriteResults.length - nextRewriteResults.length,
        remaining: nextRewriteResults.length,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Delete rewrite results error:", error);
    return NextResponse.json({ error: "删除二创记录失败" }, { status: 500 });
  }
}
