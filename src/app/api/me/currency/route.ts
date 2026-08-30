import { NextRequest, NextResponse } from "next/server";
import { jsonError, publicUser, requireUser } from "@/lib/auth";
import { setDisplayCurrency } from "@/lib/db";
import { isFiat } from "@/lib/money";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { currency } = (await req.json()) as { currency?: string };
    const code = (currency || "").toUpperCase();
    if (!isFiat(code)) throw new Error("不支持这个货币");
    setDisplayCurrency(user.id, code);
    return NextResponse.json({ user: publicUser({ ...user, displayCurrency: code }) });
  } catch (error) {
    return jsonError(error);
  }
}
