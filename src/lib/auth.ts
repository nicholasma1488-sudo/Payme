import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  createSession,
  deleteSession,
  findUserByEmail,
  userFromSession,
} from "./db";
import type { User } from "./types";

const COOKIE = "payme_session";

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return userFromSession(jar.get(COOKIE)?.value);
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    balancePayme: user.balancePayme,
    displayCurrency: user.displayCurrency,
  };
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    throw Object.assign(new Error("未登录"), { status: 401 });
  }
  return user;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function attachSession(userId: string, response: NextResponse) {
  const token = createSession(userId);
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteSession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export function loginWithPassword(email: string, password: string): User {
  const found = findUserByEmail(email);
  if (!found || !checkPassword(password, found.passwordHash)) {
    throw Object.assign(new Error("邮箱或密码不对"), { status: 401 });
  }
  return found;
}

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "出错了";
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status: number }).status) || 400
    : 400;
  return NextResponse.json({ error: message }, { status });
}
