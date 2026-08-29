import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { findUserByUsername, transferPayme } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.username) throw Object.assign(new Error("先设置用户名"), { status: 400 });
    const body = (await req.json()) as { username?: string; amount?: number; note?: string };
    const username = (body.username || "").replace(/^@/, "").trim();
    const amount = Number(body.amount);
    if (!username) throw new Error("填写用户名");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
    const other = findUserByUsername(username);
    if (!other) throw new Error(`找不到 @${username}`);
    const tx = transferPayme({
      fromUserId: user.id,
      toUserId: other.id,
      amount,
      type: "pay",
      note: body.note || undefined,
    });
    return NextResponse.json({
      transaction: tx,
      message: `已付给 @${other.username} ${amount} Ᵽ`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
