import { NextRequest, NextResponse } from "next/server";
import { jsonError, publicUser, requireUser } from "@/lib/auth";
import { findUserByUsername, setUsername } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { username, displayName } = (await req.json()) as {
      username?: string;
      displayName?: string;
    };
    const clean = (username || "").trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(clean)) {
      throw new Error("用户名用 3–16 位字母、数字或下划线");
    }
    const taken = findUserByUsername(clean);
    if (taken && taken.id !== user.id) throw new Error("这个用户名已经被占用");
    setUsername(user.id, clean, (displayName || clean).trim().slice(0, 32));
    return NextResponse.json({
      user: publicUser({
        ...user,
        username: clean,
        displayName: (displayName || clean).trim().slice(0, 32),
      }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
