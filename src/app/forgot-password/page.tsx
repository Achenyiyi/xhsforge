"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthFormShell from "@/components/AuthFormShell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, scene: "reset_password" }),
      });
      const data = (await response.json()) as { error?: string; delivery?: string };

      if (!response.ok) {
        setError(data.error || "验证码发送失败");
        return;
      }

      setCooldown(60);
      setMessage(data.delivery === "console" ? "验证码已输出到服务端日志。" : "验证码已发送，请查看邮箱。");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="忘记密码"
      subtitle="输入邮箱后，我们会发送 6 位验证码用于重置密码。"
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

        {message ? (
          <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || cooldown > 0}
          className="w-full rounded-[8px] bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {cooldown > 0 ? `${cooldown}s 后可重发` : submitting ? "发送中..." : "发送验证码"}
        </button>
      </form>
    </AuthFormShell>
  );
}
