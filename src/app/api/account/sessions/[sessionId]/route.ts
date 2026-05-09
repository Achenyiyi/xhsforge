import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, clearSessionCookie, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function DELETE(_req: NextRequest, context: Params) {
  try {
    const { session, user } = await requireUser();
    const { sessionId } = await context.params;

    const target = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
      select: {
        id: true,
        revokedAt: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    if (target.revokedAt) {
      await prisma.session.delete({
        where: {
          id: target.id,
        },
      });

      return NextResponse.json({ success: true, deleted: true, current: false });
    }

    await prisma.session.update({
      where: {
        id: target.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const response = NextResponse.json({ success: true, current: target.id === session.id });
    if (target.id === session.id) {
      await clearSessionCookie(response);
    }

    return response;
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Revoke session error:", error);
    return NextResponse.json({ error: "退出设备失败" }, { status: 500 });
  }
}
