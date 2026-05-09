import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  buildAvatarInitial,
  requireUser,
  toSafeUser,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await requireUser();
    const { nickname: rawNickname } = await req.json();
    const nickname = String(rawNickname || "").trim();

    if (!nickname || nickname.length > 24) {
      return NextResponse.json({ error: "昵称需为 1-24 个字符" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        nickname,
        avatarInitial: buildAvatarInitial(nickname, user.email),
      },
    });

    return NextResponse.json({
      success: true,
      user: toSafeUser(updatedUser),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("Update profile error:", error);
    return NextResponse.json({ error: "修改昵称失败" }, { status: 500 });
  }
}
