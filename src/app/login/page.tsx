"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import AuthFormShell from "@/components/AuthFormShell";
import { useAuth, type AuthUser } from "@/components/AuthProvider";
import { getClientDeviceInfo } from "@/lib/clientDeviceInfo";

function getSafeLoginNext(rawNext: string | null) {
  if (!rawNext) return "/";
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return "/";
  if (rawNext.length > 512) return "/";

  try {
    const parsed = new URL(rawNext, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/";
    if (["/login", "/register", "/forgot-password", "/reset-password"].includes(parsed.pathname)) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = getSafeLoginNext(searchParams.get("next"));
  const expired = searchParams.get("expired") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceInfo: getClientDeviceInfo() }),
      });
      const data = (await response.json()) as { error?: string; user?: AuthUser };

      if (!response.ok || !data.user) {
        setError(data.error || "登录失败");
        return;
      }

      setUser(data.user);
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="登录"
      subtitle="欢迎回来，继续管理你的内容工作台。"
      footer={
        <>
          没有账号？{" "}
          <Link
            href="/register"
            className="font-semibold text-[#d71920] transition hover:text-[#b91118]"
          >
            注册账号
          </Link>
        </>
      }
    >
      {expired ? (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          登录已过期，请重新登录。
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-7">
        <label className="block">
          <span className="text-[16px] font-medium text-[#24272b]">邮箱</span>
          <div className="mt-[10px] flex h-[56px] items-center rounded-[8px] border border-[#d8d8d8] bg-white px-4 transition duration-200 focus-within:border-[#d71920] focus-within:shadow-[0_0_0_4px_rgba(215,25,32,0.08)]">
            <Mail className="h-[19px] w-[19px] shrink-0 text-[#9ca0a6]" strokeWidth={1.8} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="请输入邮箱"
              className="min-w-0 flex-1 bg-transparent px-[14px] text-[15px] text-[#24272b] outline-none placeholder:text-[#a3a6aa]"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[16px] font-medium text-[#24272b]">密码</span>
          <div className="mt-[10px] flex h-[56px] items-center rounded-[8px] border border-[#d8d8d8] bg-white px-4 transition duration-200 focus-within:border-[#d71920] focus-within:shadow-[0_0_0_4px_rgba(215,25,32,0.08)]">
            <LockKeyhole className="h-[19px] w-[19px] shrink-0 text-[#9ca0a6]" strokeWidth={1.8} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="请输入密码"
              className="min-w-0 flex-1 bg-transparent px-[14px] text-[15px] text-[#24272b] outline-none placeholder:text-[#a3a6aa]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9ca0a6] transition hover:bg-[#f4f1ed] hover:text-[#6f747a]"
            >
              {showPassword ? (
                <EyeOff className="h-[19px] w-[19px]" strokeWidth={1.8} />
              ) : (
                <Eye className="h-[19px] w-[19px]" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </label>

        <div className="-mt-3 flex justify-end text-[15px]">
          <Link
            href="/forgot-password"
            className="font-medium text-[#d71920] transition hover:text-[#b91118]"
          >
            忘记密码
          </Link>
        </div>

        {error ? (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 h-[60px] w-full rounded-[8px] bg-[#d71920] px-4 text-[20px] font-semibold text-white shadow-[0_10px_20px_rgba(215,25,32,0.16)] transition duration-200 hover:bg-[#c9151c] hover:shadow-[0_14px_26px_rgba(215,25,32,0.22)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#e58a8e] disabled:shadow-none"
        >
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>
    </AuthFormShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f5]" />}>
      <LoginForm />
    </Suspense>
  );
}
