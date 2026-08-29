import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { adminPayout, listExchangeRequests, treasuryStats } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
    const body = (await req.json()) as {
      username?: string;
      amount?: number;
      direction?: "credit" | "debit";
      note?: string;
      fiatAmount?: number;
      fiatCurrency?: string;
    };
    const username = (body.username || "").replace(/^@/, "").trim();
    const amount = Number(body.amount);
    if (!username) throw new Error("填写用户名");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
    const tx = adminPayout({
      username,
      amount,
      direction: body.direction === "debit" ? "debit" : "credit",
      note: body.note,
      fiatAmount: body.fiatAmount,
      fiatCurrency: body.fiatCurrency,
    });
    return NextResponse.json({ transaction: tx, treasury: treasuryStats() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
    return NextResponse.json({ requests: listExchangeRequests({ status: "pending" }) });
  } catch (error) {
    return jsonError(error);
  }
}
