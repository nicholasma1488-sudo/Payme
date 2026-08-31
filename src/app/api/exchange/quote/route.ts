import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { quoteExchange } from "@/lib/exchange";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = (await req.json()) as {
      side?: "buy" | "sell";
      amount?: number;
      currency?: string;
    };
    const quote = await quoteExchange({
      side: body.side === "sell" ? "sell" : "buy",
      amount: Number(body.amount),
      currency: body.currency || "CNY",
    });
    return NextResponse.json({ quote });
  } catch (error) {
    return jsonError(error);
  }
}
