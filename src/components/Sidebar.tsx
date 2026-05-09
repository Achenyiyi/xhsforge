"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getClientDeviceInfo } from "@/lib/clientDeviceInfo";
import { useAppStore } from "@/store/appStore";
import type { ActiveModule } from "@/types";
import {
  Archive,
  ChevronRight,
  KeyRound,
  List,
  LogOut,
  MonitorSmartphone,
  Search,
  Settings,
  Sparkles,
  UserRoundPen,
  X,
} from "lucide-react";
import clsx from "clsx";

const modules: { id: ActiveModule; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "crawl",
    label: "采集模块",
    icon: <Search className="w-5 h-5" />,
    desc: "搜索并采集小红书笔记",
  },
  {
    id: "list",
    label: "爆款库",
    icon: <List className="w-5 h-5" />,
    desc: "从飞书同步，选择爆款笔记二创",
  },
  {
    id: "rewrite",
    label: "二创模块",
    icon: <Sparkles className="w-5 h-5" />,
    desc: "AI生成对比，人工编辑",
  },
  {
    id: "draft",
    label: "草稿箱",
    icon: <Archive className="w-5 h-5" />,
    desc: "历史保存到二创库存档",
  },
  {
    id: "settings",
    label: "高级设置",
    icon: <Settings className="w-5 h-5" />,
    desc: "自定义提示词配置",
  },
];

const accountMenuItems = [
  {
    id: "nickname",
    label: "修改昵称",
    icon: UserRoundPen,
    tone: "default",
  },
  {
    id: "password",
    label: "修改密码",
    icon: KeyRound,
    tone: "default",
  },
  {
    id: "devices",
    label: "登录设备",
    icon: MonitorSmartphone,
    tone: "default",
  },
  {
    id: "logout",
    label: "退出登录",
    icon: LogOut,
    tone: "danger",
  },
] as const;

export default function Sidebar() {
  const { activeModule, setActiveModule } = useAppStore();
  const { user, setUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"nickname" | "password" | "devices" | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelMenuClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleMenuClose() {
    cancelMenuClose();
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 140);
  }

  useEffect(() => () => cancelMenuClose(), []);

  return (
    <aside className="w-1/4 min-w-[220px] max-w-[280px] bg-gray-900 flex flex-col h-full shadow-xl">
      {/* Logo区域 */}
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_34%),linear-gradient(135deg,_rgba(17,24,39,0.98),_rgba(15,23,42,0.94))] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/70 to-transparent" />
          <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative">
            <div className="relative inline-block">
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-[2px] translate-y-[4px] text-[31px] font-black tracking-[0.18em] text-orange-500/25 blur-[2px]"
                style={{ fontFamily: '"STKaiti","KaiTi","DFKai-SB","Microsoft YaHei",serif' }}
              >
                剽之有道
              </span>
              <h1
                className="relative text-[31px] font-black leading-none tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-orange-50 via-amber-200 to-orange-300 [transform:skewX(-8deg)]"
                style={{ fontFamily: '"STKaiti","KaiTi","DFKai-SB","Microsoft YaHei",serif' }}
              >
                剽之有道
              </h1>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-orange-400/80 to-transparent" />
              <p className="rounded-full border border-orange-300/25 bg-white/5 px-2.5 py-1 text-[10px] font-medium tracking-[0.34em] text-orange-100/80 backdrop-blur-sm">
                采集 · 二创 · 入库
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 导航模块 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className={clsx(
              "sidebar-item w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 group",
              activeModule === mod.id
                ? "bg-red-600 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            )}
          >
            <span className={clsx(
              "mt-0.5 flex-shrink-0",
              activeModule === mod.id ? "text-white" : "text-gray-400 group-hover:text-white"
            )}>
              {mod.icon}
            </span>
            <div>
              <div className="text-sm font-medium">{mod.label}</div>
              <div className={clsx(
                "text-xs mt-0.5",
                activeModule === mod.id ? "text-red-200" : "text-gray-500 group-hover:text-gray-400"
              )}>
                {mod.desc}
              </div>
            </div>
          </button>
        ))}
      </nav>

      <div
        className="relative px-4 py-4"
        onMouseEnter={cancelMenuClose}
        onMouseLeave={scheduleMenuClose}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-40 h-px bg-gray-700"
        />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="relative z-30 flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 text-left transition-colors duration-200 hover:bg-gray-800"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: user?.avatarColor || "#ef4444" }}
          >
            {user?.avatarInitial || "U"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-100">
              {user?.nickname || "未登录"}
            </span>
            <span className="block truncate text-xs text-gray-500">{user?.email || ""}</span>
          </span>
          <ChevronRight
            className={clsx(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
              menuOpen && "-rotate-90"
            )}
          />
        </button>
        <div
          className={clsx(
            "absolute bottom-[calc(100%-1px)] left-0 right-0 z-20 overflow-hidden",
            menuOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
          onMouseEnter={cancelMenuClose}
          onMouseLeave={scheduleMenuClose}
          role="menu"
        >
          <div
            className={clsx(
              "overflow-hidden border-x border-t border-gray-700/80 bg-gray-900 px-3 py-2 shadow-[0_-18px_40px_rgba(0,0,0,0.24)] transition-transform duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
              menuOpen ? "translate-y-0" : "translate-y-full"
            )}
          >
          <div className="space-y-1">
            {accountMenuItems.map((item) => {
              const Icon = item.icon;
              const isDanger = item.tone === "danger";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "logout") {
                      void logout();
                      return;
                    }

                    setDialog(item.id);
                    setMenuOpen(false);
                  }}
                  className={clsx(
                    "sidebar-item group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium",
                    isDanger
                      ? "text-red-300 hover:bg-gray-700 hover:text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                  role="menuitem"
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0 transition-colors duration-150",
                      isDanger ? "text-red-300 group-hover:text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-gray-600">精深求索内容运营助手</p>
      </div>

      {dialog === "nickname" && user ? (
        <NicknameDialog
          currentNickname={user.nickname}
          onClose={() => setDialog(null)}
          onUpdated={(nextUser) => setUser(nextUser)}
        />
      ) : null}
      {dialog === "password" ? <PasswordDialog onClose={() => setDialog(null)} /> : null}
      {dialog === "devices" ? <DevicesDialog onClose={() => setDialog(null)} /> : null}
    </aside>
  );
}

function DialogFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function NicknameDialog({
  currentNickname,
  onClose,
  onUpdated,
}: {
  currentNickname: string;
  onClose: () => void;
  onUpdated: (user: import("@/components/AuthProvider").AuthUser) => void;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "修改昵称失败");
        return;
      }
      onUpdated(data.user);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogFrame title="修改昵称" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={24}
          className="w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[8px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
      </form>
    </DialogFrame>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "修改密码失败");
        return;
      }
      setMessage("密码已更新，其他设备会被退出。");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogFrame title="修改密码" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="旧密码"
          className="w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="新密码"
          minLength={8}
          className="w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="确认新密码"
          minLength={8}
          className="w-full rounded-[8px] border border-gray-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />
        {message ? <div className="text-sm text-emerald-600">{message}</div> : null}
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[8px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
        >
          {submitting ? "保存中..." : "保存"}
        </button>
      </form>
    </DialogFrame>
  );
}

type DeviceSession = {
  id: string;
  deviceName: string;
  ip: string;
  language: string | null;
  timeZone: string | null;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  current: boolean;
};

function DevicesDialog({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { logout } = useAuth();

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/sessions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "获取登录设备失败");
        return;
      }
      setSessions(data.sessions || []);
    } finally {
      setLoading(false);
    }
  }

  async function syncCurrentDeviceInfo() {
    await fetch("/api/account/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getClientDeviceInfo()),
    });
  }

  async function revokeSession(session: DeviceSession) {
    const response = await fetch(`/api/account/sessions/${session.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "退出设备失败");
      return;
    }
    if (data.current) {
      await logout();
      return;
    }
    await loadSessions();
  }

  async function deleteHistorySession(session: DeviceSession) {
    const response = await fetch(`/api/account/sessions/${session.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "删除记录失败");
      return;
    }
    await loadSessions();
  }

  async function clearHistorySessions() {
    const response = await fetch("/api/account/sessions", {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "清空已退出记录失败");
      return;
    }
    setShowHistory(false);
    await loadSessions();
  }

  useEffect(() => {
    void (async () => {
      await syncCurrentDeviceInfo();
      await loadSessions();
    })();
  }, []);

  const activeSessions = sessions.filter((session) => !session.revokedAt);
  const historySessions = sessions.filter((session) => session.revokedAt);

  return (
    <DialogFrame title="登录设备" onClose={onClose}>
      {loading ? <div className="text-sm text-gray-500">加载中...</div> : null}
      {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
      <div className="space-y-3">
        {!loading && activeSessions.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-gray-200 p-3 text-sm text-gray-500">
            暂无活跃设备
          </div>
        ) : null}
        {activeSessions.map((session) => (
          <div key={session.id} className="rounded-[8px] border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-950">
                  {session.deviceName}
                  {session.current ? " · 当前设备" : ""}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {session.ip || "未知 IP"} · 最近活跃 {new Date(session.lastSeenAt).toLocaleString()}
                </div>
                {session.language || session.timeZone ? (
                  <div className="mt-1 text-xs text-gray-500">
                    {[session.language, session.timeZone].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
                {session.revokedAt ? (
                  <div className="mt-1 text-xs text-red-500">已退出</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void revokeSession(session)}
                className="shrink-0 rounded-[8px] border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                退出
              </button>
            </div>
          </div>
        ))}
        {historySessions.length > 0 ? (
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistory((open) => !open)}
                className="flex min-w-0 flex-1 items-center justify-between rounded-[8px] px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
              >
                <span>已退出记录（{historySessions.length}）</span>
                <ChevronRight
                  className={clsx(
                    "h-4 w-4 transition-transform duration-200",
                    showHistory && "rotate-90"
                  )}
                />
              </button>
              <button
                type="button"
                onClick={() => void clearHistorySessions()}
                className="shrink-0 rounded-[8px] px-2 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                清空
              </button>
            </div>
            {showHistory ? (
              <div className="mt-2 max-h-[200px] space-y-3 overflow-y-auto pr-1">
                {historySessions.map((session) => (
                  <div key={session.id} className="rounded-[8px] border border-gray-100 bg-gray-50/70 p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-700">
                          {session.deviceName}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {session.ip || "未知 IP"} · 最近活跃 {new Date(session.lastSeenAt).toLocaleString()}
                        </div>
                        {session.language || session.timeZone ? (
                          <div className="mt-1 text-xs text-gray-500">
                            {[session.language, session.timeZone].filter(Boolean).join(" · ")}
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-red-500">已退出</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteHistorySession(session)}
                        className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="删除记录"
                        title="删除记录"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </DialogFrame>
  );
}
