import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { addContact, findUserByUsername, listContacts, searchUsers } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q") || "";
    if (q.trim().length < 1) {
      return NextResponse.json({ users: listContacts(user.id) });
    }
    return NextResponse.json({
      users: searchUsers(q, user.id).map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { username } = (await req.json()) as { username?: string };
    const other = findUserByUsername((username || "").replace(/^@/, ""));
    if (!other) throw new Error("找不到这个用户名");
    addContact(user.id, other.id);
    addContact(other.id, user.id);
    return NextResponse.json({
      user: { id: other.id, username: other.username, displayName: other.displayName },
    });
  } catch (error) {
    return jsonError(error);
  }
}
