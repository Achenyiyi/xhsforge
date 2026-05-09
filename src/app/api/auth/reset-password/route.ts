import { NextRequest, NextResponse } from "next/server";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
  verifyCodeHash,
} from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { assertRateLimit, RateLimitError } from "@/lib/rateLimit";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, code: rawCode, password: rawPassword } = await req.json();
    const email = normalizeEmail(String(rawEmail || ""));
    const code = String(rawCode || "").trim();
    const password = String(rawPassword || "");

    assertRateLimit(`reset-password:${email}`, 10, 60 * 60 * 1000);

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "请输入 6 位邮箱验证码" }, { status: 400 });
    }
    if (!validatePassword(password)) {
      return NextResponse.json({ error: "新密码需为 8-72 个字符" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!user) {
        return { error: "该邮箱尚未注册", status: 404 as const };
      }

      const verification = await tx.emailVerificationCode.findFirst({
        where: {
          email,
          scene: "reset_password",
          consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification || verification.expiresAt <= new Date()) {
        return { error: "验证码错误或已过期", status: 400 as const };
      }
      if (verification.attemptCount >= MAX_CODE_ATTEMPTS) {
        return { error: "验证码尝试次数过多，请重新获取", status: 400 as const };
      }
      if (
        !verifyCodeHash({
          email,
          scene: "reset_password",
          code,
          codeHash: verification.codeHash,
        })
      ) {
        await tx.emailVerificationCode.update({
          where: { id: verification.id },
          data: { attemptCount: { increment: 1 } },
        });
        return { error: "验证码错误或已过期", status: 400 as const };
      }

      await tx.emailVerificationCode.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(password),
          failedLoginCount: 0,
          lockedUntil: null,
          status: "active",
        },
      });
      await tx.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Reset password error:", error);
    return NextResponse.json({ error: "重置密码失败" }, { status: 500 });
  }
}
