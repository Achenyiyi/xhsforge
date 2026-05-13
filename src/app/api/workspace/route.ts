import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_KEYS = new Set([
  "app-store",
  "workspace-snapshot",
  "rewrite-settings",
  "prompts-settings",
  "cover-template-library",
]);
const MAX_DELETED_REWRITE_RESULT_IDS = 5000;

type WorkspacePayload = Record<string, unknown>;

function normalizePayload(value: unknown): WorkspacePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as WorkspacePayload;
}

function getRewriteResultId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mergeWorkspaceSnapshotPayload(
  incomingPayload: unknown,
  existingPayload: Prisma.JsonValue | null | undefined
) {
  const incoming = normalizePayload(incomingPayload);
  const existing = normalizePayload(existingPayload);
  const deletedRewriteResultIds = Array.from(
    new Set([
      ...normalizeStringArray(existing.deletedRewriteResultIds),
      ...normalizeStringArray(incoming.deletedRewriteResultIds),
    ])
  ).slice(-MAX_DELETED_REWRITE_RESULT_IDS);

  if (deletedRewriteResultIds.length === 0) {
    return incoming;
  }

  const deletedIdSet = new Set(deletedRewriteResultIds);
  const rewriteResults = Array.isArray(incoming.rewriteResults)
    ? incoming.rewriteResults.filter((result) => {
        const id = getRewriteResultId(result);
        return !id || !deletedIdSet.has(id);
      })
    : incoming.rewriteResults;

  return {
    ...incoming,
    rewriteResults,
    deletedRewriteResultIds,
  };
}

export async function GET() {
  try {
    const { user } = await requireUser();
    const snapshots = await prisma.workspaceSnapshot.findMany({
      where: {
        userId: user.id,
      },
      select: {
        key: true,
        payload: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      snapshots: Object.fromEntries(
        snapshots.map((snapshot) => [
          snapshot.key,
          {
            payload: snapshot.payload,
            updatedAt: snapshot.updatedAt.toISOString(),
          },
        ])
      ),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Get workspace error:", error);
    return NextResponse.json({ error: "获取工作区失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const body = await req.json();
    const snapshots = normalizePayload(body.snapshots);
    const entries = Object.entries(snapshots).filter(([key]) => ALLOWED_KEYS.has(key));

    if (entries.length === 0) {
      return NextResponse.json({ error: "没有可保存的工作区数据" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const [key, payload] of entries) {
        const existing = await tx.workspaceSnapshot.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key,
            },
          },
          select: {
            payload: true,
          },
        });
        const nextPayload =
          key === "workspace-snapshot"
            ? mergeWorkspaceSnapshotPayload(payload, existing?.payload)
            : payload;

        await tx.workspaceSnapshot.upsert({
          where: {
            userId_key: {
              userId: user.id,
              key,
            },
          },
          update: {
            payload: nextPayload as Prisma.InputJsonValue,
          },
          create: {
            userId: user.id,
            key,
            payload: nextPayload as Prisma.InputJsonValue,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Save workspace error:", error);
    return NextResponse.json({ error: "保存工作区失败" }, { status: 500 });
  }
}
