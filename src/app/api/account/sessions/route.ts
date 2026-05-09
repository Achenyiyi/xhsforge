import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { session, user } = await requireUser();
    const now = new Date();
    const sessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });

    return NextResponse.json({
      sessions: sessions.map((item) => ({
        id: item.id,
        deviceName: item.deviceName,
        ip: item.ip,
        language: item.language,
        timeZone: item.timeZone,
        lastSeenAt: item.lastSeenAt.toISOString(),
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        revokedAt: item.revokedAt?.toISOString() ?? null,
        current: item.id === session.id,
      })),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("List sessions error:", error);
    return NextResponse.json({ error: "获取登录设备失败" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { session } = await requireUser();
    const { language, timeZone } = await req.json();

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        language: typeof language === "string" ? language.slice(0, 64) || null : null,
        timeZone: typeof timeZone === "string" ? timeZone.slice(0, 64) || null : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Update session device info error:", error);
    return NextResponse.json({ error: "更新登录设备信息失败" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { user } = await requireUser();

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        revokedAt: {
          not: null,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Clear session history error:", error);
    return NextResponse.json({ error: "清空已退出记录失败" }, { status: 500 });
  }
}
