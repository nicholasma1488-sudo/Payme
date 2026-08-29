import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { listAllTransactions, listUsers, setSetting, treasuryStats } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
    return NextResponse.json({
      treasury: treasuryStats(),
      users: listUsers().map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        balancePayme: u.balancePayme,
        displayCurrency: u.displayCurrency,
        createdAt: u.createdAt,
      })),
      transactions: listAllTransactions(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
    const body = (await req.json()) as {
      cnyPerPayme?: number;
      cnyReserve?: number;
      plannedPeople?: number;
      perPersonFloat?: number;
    };
    if (body.cnyPerPayme && body.cnyPerPayme > 0) {
      setSetting("cny_per_payme", String(body.cnyPerPayme));
    }
    if (typeof body.cnyReserve === "number" && body.cnyReserve >= 0) {
      setSetting("cny_reserve", String(body.cnyReserve));
    }
    if (body.plannedPeople && body.plannedPeople > 0) {
      setSetting("planned_people", String(Math.round(body.plannedPeople)));
    }
    if (body.perPersonFloat && body.perPersonFloat > 0) {
      setSetting("per_person_float", String(body.perPersonFloat));
    }
    return NextResponse.json({ treasury: treasuryStats() });
  } catch (error) {
    return jsonError(error);
  }
}
