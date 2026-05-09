import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { getCurrentSession, toSafeUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "剽之有道",
  description: "小红书内容爬取、二创、发布一体化工具",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();
  const initialUser =
    session && session.user.status === "active" ? toSafeUser(session.user) : null;

  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full min-h-screen bg-gray-50 text-gray-900 antialiased">
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </body>
    </html>
  );
}
