"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { saveCurrentWorkspaceSnapshot } from "@/lib/workspaceSnapshot";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  avatarColor: string;
  avatarInitial: string;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });
      if (!response.ok) {
        setUser(null);
        return null;
      }

      const data = (await response.json()) as { user: AuthUser | null };
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await saveCurrentWorkspaceSnapshot().catch((error) => {
      console.error("退出前保存工作区失败:", error);
    });
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (initialUser) return;
    void refreshUser();
  }, [initialUser, refreshUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      setUser,
      logout,
    }),
    [loading, logout, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
