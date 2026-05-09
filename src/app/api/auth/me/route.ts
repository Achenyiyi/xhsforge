import { NextResponse } from "next/server";
import { getCurrentSession, toSafeUser } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();

  if (!session || session.user.status !== "active") {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: toSafeUser(session.user),
  });
}
