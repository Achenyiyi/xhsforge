import Link from "next/link";
import Image from "next/image";

const terms = [
  {
    title: "1. 服务说明",
    body: "剽之有道提供内容采集、二创整理与入库管理能力，用于提升内容生产效率。你应基于真实业务需要使用本工具，并自行确认具体内容、素材与发布行为符合相关平台规则。",
  },
  {
    title: "2. 账号与安全",
    body: "你需要妥善保管账号、密码和验证码。因账号共享、设备遗失、密码泄露或不当操作造成的损失，由账号使用者自行承担。",
  },
  {
    title: "3. 使用原则",
    body: "使用本工具时，请尊重原创、尊重平台规则，不得利用工具进行违法违规、恶意抓取、侵权发布、虚假宣传或干扰他人正常服务的行为。",
  },
  {
    title: "4. 数据与内容",
    body: "系统会保存必要的账号信息、登录设备信息和工作区数据，用于登录校验、设备管理和云端同步。你对自己录入、生成、保存和发布的内容承担相应责任。",
  },
  {
    title: "5. 核心约定",
    body: "听话，照做，拿结果。",
  },
  {
    title: "6. 协议调整",
    body: "我们可能根据产品能力、业务流程或合规要求调整本协议。继续使用服务，即表示你认可调整后的协议内容。",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#202326]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[38%_62%]">
        <section className="relative hidden overflow-hidden bg-[#f3ede2] lg:block">
          <Image
            src="/auth/login-ink-left.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="38vw"
            className="object-cover object-left"
          />
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
          <article className="w-full max-w-[760px] rounded-[8px] border border-[#e8e1d8] bg-white/96 px-7 py-9 shadow-[0_16px_40px_rgba(24,27,31,0.08)] sm:px-12 sm:py-11">
            <Link
              href="/register"
              className="text-sm font-medium text-[#d71920] transition hover:text-[#b91118]"
            >
              返回注册
            </Link>

            <header className="mt-7 border-b border-[#ebe6df] pb-7">
              <p className="text-sm leading-6 text-[#8a8178]">剽之有道</p>
              <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-normal">
                用户协议
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[#76716b]">
                注册和使用本产品前，请阅读以下约定。勾选协议即代表你理解并接受这些规则。
              </p>
            </header>

            <div className="mt-7 space-y-6">
              {terms.map((item) => (
                <section key={item.title}>
                  <h2 className="text-[17px] font-semibold leading-7 text-[#202326]">
                    {item.title}
                  </h2>
                  <p
                    className={
                      item.title === "5. 核心约定"
                        ? "mt-2 rounded-[8px] border border-[#f1c9c9] bg-[#fff5f5] px-4 py-3 text-[20px] font-semibold leading-8 text-[#d71920]"
                        : "mt-2 text-[15px] leading-7 text-[#5d6268]"
                    }
                  >
                    {item.body}
                  </p>
                </section>
              ))}
            </div>

            <footer className="mt-9 border-t border-[#ebe6df] pt-6 text-sm leading-6 text-[#8a8178]">
              生效日期：2026 年 5 月 9 日
            </footer>
          </article>
        </section>
      </div>
    </main>
  );
}
