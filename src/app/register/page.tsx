"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AuthFormShell from "@/components/AuthFormShell";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    setError("");
    setMessage("");
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, scene: "register" }),
      });
      const data = (await response.json()) as { error?: string; delivery?: string };
      if (!response.ok) {
        setError(data.error || "验证码发送失败");
        return;
      }
      setCooldown(60);
      setMessage(data.delivery === "console" ? "验证码已输出到服务端日志。" : "验证码已发送，请查看邮箱。");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email, code, password, acceptedTerms }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "注册失败");
        return;
      }
      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="注册账号"
      subtitle="邮箱验证后即可拥有自己的云端工作区。"
      footer={
        <>
          已有账号？{" "}
          <Link href="/login" className="font-medium text-red-600 hover:text-red-700">
            返回登录
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">昵称</span>
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            required
            maxLength={24}
            className="mt-2 w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
          />
        </label>
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
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              inputMode="numeric"
              maxLength={6}
              className="min-w-0 flex-1 rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
            />
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={sendingCode || cooldown > 0}
              className="w-32 rounded-[8px] border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {cooldown > 0 ? `${cooldown}s` : sendingCode ? "发送中" : "发送验证码"}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">密码</span>
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
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="h-4 w-4"
          />
          <span>同意用户协议</span>
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
          disabled={submitting}
          className="w-full rounded-[8px] bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {submitting ? "注册中..." : "注册"}
        </button>
      </form>
    </AuthFormShell>
  );
}
