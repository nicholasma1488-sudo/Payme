import { NextRequest, NextResponse } from "next/server";
import { attachSession, jsonError, loginWithPassword, publicUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) throw Object.assign(new Error("请填写邮箱和密码"), { status: 400 });
    const user = loginWithPassword(email, password);
    const res = NextResponse.json({ user: publicUser(user) });
    return attachSession(user.id, res);
  } catch (error) {
    return jsonError(error);
  }
}
