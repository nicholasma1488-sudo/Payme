import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import {
  availableSlots,
  canBookDate,
  isValidSlot,
  nextBookableDate,
  nextOpenSlot,
  SLOT_TIMES,
  upcomingWeekdays,
} from "@/lib/booking";
import {
  bookingCountsByDate,
  createBooking,
  findUserById,
  findUserByUsername,
  getOrCreateSupport,
  listBookings,
  listTakenByDate,
  sendMessage,
  setBookingStatus,
} from "@/lib/db";
import { settleBookingFromMarket } from "@/lib/exchange";
import { isFiat } from "@/lib/money";
import { formatLegalName } from "@/lib/names";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const date = req.nextUrl.searchParams.get("date") || undefined;
    const takenByDate = listTakenByDate();
    const nextOpen = nextOpenSlot(takenByDate);
    const dates = upcomingWeekdays();
    const openByDate: Record<string, string[]> = {};
    for (const d of dates) {
      openByDate[d] = availableSlots(d, takenByDate[d] || []);
    }
    const payload = {
      dates,
      slots: SLOT_TIMES,
      takenByDate,
      openByDate,
      openSlots: openByDate[date || nextOpen?.date || nextBookableDate()] || [],
      nextDate: nextOpen?.date || nextBookableDate(),
      nextOpen,
      cutoff: "15:30",
    };
    if (user.role === "admin") {
      return NextResponse.json({
        ...payload,
        bookings: listBookings(date),
        counts: bookingCountsByDate(),
      });
    }
    return NextResponse.json({
      ...payload,
      bookings: listBookings(date).filter((b) => b.userId === user.id || b.username === user.username),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      id?: string;
      status?: "done" | "cancelled" | "pending";
      slotDate?: string;
      slotTime?: string;
      side?: "buy" | "sell";
      amount?: number;
      currency?: string;
      note?: string;
      username?: string;
    };
    if (body.id && body.status && user.role === "admin") {
      if (body.status === "done") {
        const settled = await settleBookingFromMarket(body.id);
        return NextResponse.json({ ok: true, ...settled });
      }
      setBookingStatus(body.id, body.status);
      return NextResponse.json({ ok: true });
    }
    const slotDate = (body.slotDate || nextBookableDate()).trim();
    const slotTime = (body.slotTime || "").trim();
    const side = body.side === "sell" ? "sell" : "buy";
    const amount = Number(body.amount);
    const currency = (body.currency || "CNY").toUpperCase();
    if (!isValidSlot(slotTime)) throw new Error("选一个预约时间");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
    if (!isFiat(currency)) throw new Error("请选择法币");

    const isAdmin = user.role === "admin";
    if (!isAdmin && !canBookDate(slotDate)) {
      throw new Error("已过截止：每个工作日 15:30 前预约。周末和下班后约下一个工作日");
    }

    let username = (user.username || "").replace(/^@/, "");
    let userId: string | null = user.id;
    if (isAdmin && body.username) {
      username = body.username.replace(/^@/, "").trim();
      if (!username) throw new Error("填写用户名");
      const found = findUserByUsername(username);
      userId = found?.id ?? null;
    }
    if (!username) throw new Error("先设置用户名");

    const booking = createBooking({
      userId,
      username,
      slotDate,
      slotTime,
      side,
      amount,
      currency,
      note: body.note,
      createdBy: isAdmin ? "admin" : "user",
    });

    const convId = getOrCreateSupport(userId || user.id);
    const booked = userId ? findUserById(userId) : findUserByUsername(username);
    const legal = formatLegalName(booked || user);
    const label = side === "buy" ? `买入 ${amount} ${currency}` : `兑出 ${amount} Ᵽ → ${currency}`;
    sendMessage(
      convId,
      user.id,
      `[兑换预约] ${legal ? `${legal} ` : ""}@${username} ${slotDate} ${slotTime} ${label}${body.note ? ` · ${body.note}` : ""}`,
    );

    return NextResponse.json({
      booking,
      message: `已预约 ${slotDate} ${slotTime} 当面现金兑换，消息已发给 @admin`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
    const body = (await req.json()) as { id?: string; status?: "done" | "cancelled" | "pending" };
    if (!body.id || !body.status) throw new Error("缺少预约");
    if (body.status === "done") {
      const settled = await settleBookingFromMarket(body.id);
      return NextResponse.json({ ok: true, ...settled });
    }
    setBookingStatus(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
