"use client";

import Link from "next/link";

export default function AuthFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-gray-950">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-[0_28px_80px_rgba(17,24,39,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[640px] overflow-hidden bg-gray-950 lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,_rgba(239,68,68,0.92),_rgba(17,24,39,0.94)_48%,_rgba(245,158,11,0.72))]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:42px_42px]" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <Link href="/" className="w-fit text-3xl font-black tracking-[0.16em]">
              剽之有道
            </Link>
            <div className="max-w-md">
              <p className="text-sm font-medium tracking-[0.32em] text-orange-100">
                XHS OPERATIONS
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[1.08] tracking-normal">
                采集、二创、入库都跟着账号走。
              </h1>
              <p className="mt-6 text-base leading-8 text-orange-50/85">
                登录后工作区会同步到云端，换设备也能继续上一次的内容生产节奏。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-orange-50/80">
              <div className="border-t border-white/25 pt-3">邮箱验证</div>
              <div className="border-t border-white/25 pt-3">设备管理</div>
              <div className="border-t border-white/25 pt-3">云端工作区</div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[640px] items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <Link href="/" className="text-3xl font-black tracking-[0.16em] text-red-600">
                剽之有道
              </Link>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-normal text-gray-950">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">{subtitle}</p>
            </div>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-7 text-center text-sm text-gray-500">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
