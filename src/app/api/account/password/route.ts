import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { session, user } = await requireUser();
    const { currentPassword: rawCurrentPassword, newPassword: rawNewPassword } =
      await req.json();
    const currentPassword = String(rawCurrentPassword || "");
    const newPassword = String(rawNewPassword || "");

    if (newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json({ error: "新密码需为 8-72 个字符" }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "新密码不能与旧密码相同" }, { status: 400 });
    }

    const passwordOk = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(newPassword),
          failedLoginCount: 0,
          lockedUntil: null,
          status: "active",
        },
      }),
      prisma.session.updateMany({
        where: {
          userId: user.id,
          id: {
            not: session.id,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Change password error:", error);
    return NextResponse.json({ error: "修改密码失败" }, { status: 500 });
  }
}
