"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthFormShell from "@/components/AuthFormShell";
import { useAuth, type AuthUser } from "@/components/AuthProvider";
import { getClientDeviceInfo } from "@/lib/clientDeviceInfo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = searchParams.get("next") || "/";
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
      title="登录账号"
      subtitle="使用邮箱和密码进入你的内容工作台。"
      footer={
        <>
          还没有账号？{" "}
          <Link href="/register" className="font-medium text-red-600 hover:text-red-700">
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">登录态保持 30 天</span>
          <Link href="/forgot-password" className="font-medium text-red-600 hover:text-red-700">
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
          className="w-full rounded-[8px] bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
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
