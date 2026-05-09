import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { User, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "xhs_session";
const SESSION_TTL_DAYS = 30;
const MAX_ACTIVE_SESSIONS = 2;

export type SafeUser = {
  id: string;
  email: string;
  nickname: string;
  avatarColor: string;
  avatarInitial: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export class AuthError extends Error {
  status: 401 | 403;

  constructor(message = "请先登录", status: 401 | 403 = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarColor: user.avatarColor,
    avatarInitial: user.avatarInitial,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string) {
  return password.length >= 8 && password.length <= 72;
}

export function buildAvatarInitial(nickname: string, email: string) {
  const source = nickname.trim() || email.trim();
  return Array.from(source)[0]?.toUpperCase() || "U";
}

export function buildAvatarColor(input: string) {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];
  const hash = createHash("sha256").update(input).digest();
  return colors[hash[0] % colors.length];
}

export async function getClientIp(request?: Request) {
  if (request) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "";
    return request.headers.get("x-real-ip") || "";
  }

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "";
  return headerStore.get("x-real-ip") || "";
}

export async function getUserAgent(request?: Request) {
  if (request) return request.headers.get("user-agent") || "";
  const headerStore = await headers();
  return headerStore.get("user-agent") || "";
}

export function getDeviceName(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const os = ua.includes("windows")
    ? "Windows"
    : ua.includes("mac os") || ua.includes("macintosh")
      ? "macOS"
      : ua.includes("iphone") || ua.includes("ipad")
        ? "iOS"
        : ua.includes("android")
          ? "Android"
          : "未知设备";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/")
      ? "Chrome"
      : ua.includes("safari/")
        ? "Safari"
        : ua.includes("firefox/")
          ? "Firefox"
          : "浏览器";

  return `${os} · ${browser}`;
}

function getCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashCode(email: string, scene: string, code: string) {
  const pepper = process.env.AUTH_CODE_PEPPER || process.env.AUTH_SECRET || "dev-code-pepper";
  return createHash("sha256")
    .update(`${pepper}:${normalizeEmail(email)}:${scene}:${code}`)
    .digest("hex");
}

export function verifyCodeHash(params: {
  email: string;
  scene: string;
  code: string;
  codeHash: string;
}) {
  const expected = Buffer.from(
    hashCode(params.email, params.scene, params.code),
    "hex"
  );
  const actual = Buffer.from(params.codeHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createUserSession(params: {
  userId: string;
  request: Request;
  deviceInfo?: {
    language?: string;
    timeZone?: string;
  };
}) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = await getUserAgent(params.request);
  const ip = await getClientIp(params.request);

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        userId: params.userId,
        tokenHash,
        deviceName: getDeviceName(userAgent),
        userAgent,
        ip,
        language: params.deviceInfo?.language?.slice(0, 64) || null,
        timeZone: params.deviceInfo?.timeZone?.slice(0, 64) || null,
        lastSeenAt: now,
        expiresAt,
      },
    });

    const activeSessions = await tx.session.findMany({
      where: {
        userId: params.userId,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    const overflow = activeSessions.slice(0, Math.max(0, activeSessions.length - MAX_ACTIVE_SESSIONS));
    if (overflow.length > 0) {
      await tx.session.updateMany({
        where: {
          id: {
            in: overflow.map((session) => session.id),
          },
        },
        data: {
          revokedAt: now,
        },
      });
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getCookieOptions(expiresAt));

  return { token, expiresAt };
}

export async function clearSessionCookie(response?: NextResponse) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };

  if (response) {
    response.cookies.set(SESSION_COOKIE_NAME, "", options);
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", options);
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;

  await prisma.session.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await clearSessionCookie();
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      user: true,
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= now) {
    return null;
  }

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: now,
    },
  });

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError("请先登录", 401);
  }

  if (session.user.status !== "active") {
    throw new AuthError("账号当前不可用", 403);
  }

  return {
    session,
    user: session.user,
  };
}

export const requireActiveUser = requireUser;

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return null;
}
