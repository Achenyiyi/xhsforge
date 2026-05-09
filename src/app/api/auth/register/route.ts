import { NextRequest, NextResponse } from "next/server";
import {
  buildAvatarColor,
  buildAvatarInitial,
  getClientIp,
  getUserAgent,
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
    const {
      nickname: rawNickname,
      email: rawEmail,
      password: rawPassword,
      code: rawCode,
      acceptedTerms,
    } = await req.json();
    const nickname = String(rawNickname || "").trim();
    const email = normalizeEmail(String(rawEmail || ""));
    const password = String(rawPassword || "");
    const code = String(rawCode || "").trim();
    const ip = await getClientIp(req);

    assertRateLimit(`register:ip:${ip || "unknown"}`, 10, 60 * 60 * 1000);

    if (!nickname || nickname.length > 24) {
      return NextResponse.json({ error: "昵称需为 1-24 个字符" }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
    }
    if (!validatePassword(password)) {
      return NextResponse.json({ error: "密码需为 8-72 个字符" }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "请输入 6 位邮箱验证码" }, { status: 400 });
    }
    if (acceptedTerms !== true) {
      return NextResponse.json({ error: "请先阅读并同意用户协议" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        return { error: "该邮箱已注册", status: 409 as const };
      }

      const verification = await tx.emailVerificationCode.findFirst({
        where: {
          email,
          scene: "register",
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
      if (!verifyCodeHash({ email, scene: "register", code, codeHash: verification.codeHash })) {
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

      const user = await tx.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          nickname,
          avatarColor: buildAvatarColor(email),
          avatarInitial: buildAvatarInitial(nickname, email),
          passwordHash: await hashPassword(password),
        },
      });

      await tx.loginLog.create({
        data: {
          userId: user.id,
          email,
          ip,
          userAgent: await getUserAgent(req),
          success: true,
          reason: "register",
        },
      });

      return { userId: user.id };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Register error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
