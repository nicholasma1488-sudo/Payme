import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import {
  addContact,
  findUserByUsername,
  getOrCreateDm,
  getOrCreateSupport,
  listConversations,
} from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ conversations: listConversations(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { username?: string; support?: boolean };
    if (body.support) {
      const id = getOrCreateSupport(user.id);
      return NextResponse.json({ conversationId: id });
    }
    const other = findUserByUsername((body.username || "").replace(/^@/, ""));
    if (!other) throw new Error("找不到这个用户名");
    addContact(user.id, other.id);
    addContact(other.id, user.id);
    const id = getOrCreateDm(user.id, other.id);
    return NextResponse.json({ conversationId: id });
  } catch (error) {
    return jsonError(error);
  }
}
