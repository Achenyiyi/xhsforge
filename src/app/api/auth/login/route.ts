import { NextRequest, NextResponse } from "next/server";
import {
  createUserSession,
  getClientIp,
  getUserAgent,
  normalizeEmail,
  toSafeUser,
  validateEmail,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { assertRateLimit, RateLimitError } from "@/lib/rateLimit";

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 5 * 60 * 1000;

async function writeLoginLog(params: {
  userId?: string;
  email: string;
  request: NextRequest;
  success: boolean;
  reason: string;
}) {
  await prisma.loginLog.create({
    data: {
      userId: params.userId,
      email: params.email,
      ip: await getClientIp(params.request),
      userAgent: await getUserAgent(params.request),
      success: params.success,
      reason: params.reason,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, password: rawPassword, deviceInfo } = await req.json();
    const email = normalizeEmail(String(rawEmail || ""));
    const password = String(rawPassword || "");
    const ip = await getClientIp(req);

    assertRateLimit(`login:ip:${ip || "unknown"}`, 30, 15 * 60 * 1000);

    if (!validateEmail(email) || !password) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await writeLoginLog({
        email,
        request: req,
        success: false,
        reason: "user_not_found",
      });
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    if (user.status === "disabled") {
      await writeLoginLog({
        userId: user.id,
        email,
        request: req,
        success: false,
        reason: "disabled",
      });
      return NextResponse.json({ error: "账号当前不可用" }, { status: 403 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await writeLoginLog({
        userId: user.id,
        email,
        request: req,
        success: false,
        reason: "locked",
      });
      return NextResponse.json({ error: "密码错误次数过多，请 5 分钟后再试" }, { status: 423 });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      const failedLoginCount = user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= MAX_FAILED_LOGINS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MS) : null,
          status: shouldLock ? "locked" : user.status,
        },
      });
      await writeLoginLog({
        userId: user.id,
        email,
        request: req,
        success: false,
        reason: shouldLock ? "password_locked" : "bad_password",
      });

      return NextResponse.json(
        {
          error: shouldLock
            ? "密码错误次数过多，账号已锁定 5 分钟"
            : "邮箱或密码错误",
        },
        { status: 401 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        status: user.status === "locked" ? "active" : user.status,
        lastLoginAt: new Date(),
      },
    });

    await createUserSession({
      userId: updatedUser.id,
      request: req,
      deviceInfo: {
        language: typeof deviceInfo?.language === "string" ? deviceInfo.language : "",
        timeZone: typeof deviceInfo?.timeZone === "string" ? deviceInfo.timeZone : "",
      },
    });
    await writeLoginLog({
      userId: updatedUser.id,
      email,
      request: req,
      success: true,
      reason: "login",
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(updatedUser),
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
