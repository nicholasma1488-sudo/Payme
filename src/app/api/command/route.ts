import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { parseCommand } from "@/lib/commands";
import {
  findUserByUsername,
  getOrCreateDm,
  getOrCreateSupport,
  transferPayme,
} from "@/lib/db";
import { executeExchange } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.username) throw Object.assign(new Error("先设置用户名"), { status: 400 });
    const { input } = (await req.json()) as { input?: string };
    const parsed = parseCommand(input || "");

    if (parsed.type === "unknown") {
      return NextResponse.json({ ok: false, parsed, message: parsed.hint }, { status: 400 });
    }
    if (parsed.type === "help") {
      return NextResponse.json({ ok: true, parsed, action: "help" });
    }
    if (parsed.type === "sell") {
      return NextResponse.json({ ok: true, parsed, action: "navigate", href: "/auction/new" });
    }
    if (parsed.type === "support") {
      const conversationId = getOrCreateSupport(user.id);
      return NextResponse.json({
        ok: true,
        parsed,
        action: "navigate",
        href: `/chat?c=${conversationId}`,
      });
    }
    if (parsed.type === "chat") {
      const other = findUserByUsername(parsed.username);
      if (!other) throw new Error(`找不到 @${parsed.username}`);
      const conversationId = getOrCreateDm(user.id, other.id);
      return NextResponse.json({
        ok: true,
        parsed,
        action: "navigate",
        href: `/chat?c=${conversationId}`,
      });
    }
    if (parsed.type === "pay") {
      const other = findUserByUsername(parsed.username);
      if (!other) throw new Error(`找不到 @${parsed.username}`);
      const tx = transferPayme({
        fromUserId: user.id,
        toUserId: other.id,
        amount: parsed.amount,
        type: "pay",
        note: parsed.note || undefined,
      });
      return NextResponse.json({
        ok: true,
        parsed,
        action: "paid",
        message: `已付给 @${other.username} ${parsed.amount} Ᵽ`,
        transaction: tx,
      });
    }
    if (parsed.type === "exchange") {
      const result = await executeExchange({
        userId: user.id,
        side: parsed.side,
        amount: parsed.amount,
        currency: parsed.currency,
      });
      return NextResponse.json({
        ok: true,
        parsed,
        action: "exchanged",
        message: result.message,
        result,
      });
    }

    return NextResponse.json({ ok: false, message: "无法执行" }, { status: 400 });
  } catch (error) {
    return jsonError(error);
  }
}
