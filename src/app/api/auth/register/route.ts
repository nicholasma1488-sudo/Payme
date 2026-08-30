import { NextRequest, NextResponse } from "next/server";
import { attachSession, hashPassword, jsonError, publicUser } from "@/lib/auth";
import { createUser, findUserByEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };
    if (!email || !email.includes("@")) throw Object.assign(new Error("请输入有效邮箱"), { status: 400 });
    if (!password || password.length < 6) {
      throw Object.assign(new Error("密码至少 6 位"), { status: 400 });
    }
    if (findUserByEmail(email)) {
      throw Object.assign(new Error("这个邮箱已经注册过了"), { status: 409 });
    }
    const user = createUser(email.trim(), hashPassword(password));
    const res = NextResponse.json({ user: publicUser(user) });
    return attachSession(user.id, res);
  } catch (error) {
    return jsonError(error);
  }
}
