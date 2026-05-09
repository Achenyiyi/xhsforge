"use client";

import Image from "next/image";

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
    <main className="min-h-screen bg-[#fbfaf7] text-[#202326]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[56.37%_43.63%]">
        <section className="relative hidden min-h-screen overflow-hidden bg-[#f3ede2] lg:block">
          <Image
            src="/auth/login-ink-left.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="56vw"
            className="object-cover"
          />
        </section>

        <section className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-6 py-10 sm:px-10 lg:items-start lg:pt-[9.6vh]">
          <div className="w-full max-w-[492px] rounded-[8px] border border-[#e8e1d8] bg-white/96 px-7 py-10 shadow-[0_16px_40px_rgba(24,27,31,0.08)] sm:px-11 sm:py-12 md:px-[54px] md:py-[54px]">
            <div>
              <h2 className="text-[34px] font-semibold leading-tight tracking-normal text-[#202326]">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-[10px] text-[14px] leading-6 text-[#76716b]">{subtitle}</p>
              ) : null}
            </div>
            <div className={subtitle ? "mt-8" : "mt-9"}>{children}</div>
            {footer ? (
              <div className="mt-9 border-t border-[#ebe6df] pt-7 text-center text-[15px] leading-7 text-[#55585d]">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
