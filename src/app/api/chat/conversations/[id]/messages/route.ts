import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { listMessages, sendMessage, userInConversation } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!userInConversation(id, user.id)) {
      throw Object.assign(new Error("无权查看"), { status: 403 });
    }
    return NextResponse.json({ messages: listMessages(id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!userInConversation(id, user.id)) {
      throw Object.assign(new Error("无权发送"), { status: 403 });
    }
    const { body } = (await req.json()) as { body?: string };
    const text = (body || "").trim();
    if (!text) throw new Error("先写点什么");
    const message = sendMessage(id, user.id, text.slice(0, 2000));
    return NextResponse.json({ message });
  } catch (error) {
    return jsonError(error);
  }
}
