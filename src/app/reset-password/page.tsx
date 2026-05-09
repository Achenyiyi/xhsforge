"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import AuthFormShell from "@/components/AuthFormShell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "重置密码失败");
        return;
      }

      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="重置密码"
      subtitle="输入邮箱验证码和新密码，重置后需要重新登录。"
      footer={
        <Link href="/login" className="font-medium text-red-600 hover:text-red-700">
          返回登录
        </Link>
      }
    >
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
          <span className="text-sm font-medium text-gray-700">邮箱验证码</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            inputMode="numeric"
            maxLength={6}
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">新密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">确认新密码</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>

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
          {submitting ? "重置中..." : "重置密码"}
        </button>
      </form>
    </AuthFormShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f5]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
