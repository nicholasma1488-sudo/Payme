import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { executeExchange } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") {
      throw Object.assign(
        new Error("兑换只收当面现金。请先预约见面，交出现金后再由管理员入账。"),
        { status: 400 },
      );
    }
    const body = (await req.json()) as {
      side?: "buy" | "sell";
      amount?: number;
      currency?: string;
    };
    const result = await executeExchange({
      userId: user.id,
      side: body.side === "sell" ? "sell" : "buy",
      amount: Number(body.amount),
      currency: body.currency || "CNY",
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
