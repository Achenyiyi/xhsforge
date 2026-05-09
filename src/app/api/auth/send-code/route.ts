import { NextRequest, NextResponse } from "next/server";
import type { EmailVerificationScene } from "@prisma/client";
import {
  createVerificationCode,
  getClientIp,
  hashCode,
  normalizeEmail,
  validateEmail,
} from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { assertRateLimit, RateLimitError } from "@/lib/rateLimit";

const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const DAILY_EMAIL_LIMIT = 10;
const HOURLY_IP_LIMIT = 20;

function isValidScene(scene: unknown): scene is EmailVerificationScene {
  return scene === "register" || scene === "reset_password";
}

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, scene: rawScene } = await req.json();
    const email = normalizeEmail(String(rawEmail || ""));
    const scene = rawScene || "register";
    const ip = await getClientIp(req);

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "请输入有效邮箱" }, { status: 400 });
    }
    if (!isValidScene(scene)) {
      return NextResponse.json({ error: "验证码场景无效" }, { status: 400 });
    }

    assertRateLimit(`email-code:ip:${ip || "unknown"}`, HOURLY_IP_LIMIT, 60 * 60 * 1000);
    assertRateLimit(`email-code:email:${email}`, DAILY_EMAIL_LIMIT, 24 * 60 * 60 * 1000);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (scene === "register" && existingUser) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }
    if (scene === "reset_password" && !existingUser) {
      return NextResponse.json({ error: "该邮箱尚未注册" }, { status: 404 });
    }

    const latestCode = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        scene,
        consumedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    if (latestCode && Date.now() - latestCode.createdAt.getTime() < SEND_COOLDOWN_MS) {
      return NextResponse.json({ error: "验证码发送太频繁，请 60 秒后再试" }, { status: 429 });
    }

    const code = createVerificationCode();
    await prisma.emailVerificationCode.create({
      data: {
        email,
        scene,
        codeHash: hashCode(email, scene, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    const delivery = await sendVerificationEmail({ to: email, code, scene });

    return NextResponse.json({
      success: true,
      delivery: delivery.delivery,
      cooldownSeconds: 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Send verification code error:", error);
    return NextResponse.json({ error: "验证码发送失败" }, { status: 500 });
  }
}
