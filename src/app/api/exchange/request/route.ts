import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import {
  createExchangeRequest,
  getExchangeRequest,
  getOrCreateSupport,
  listExchangeRequests,
  sendMessage,
  setExchangeRequestStatus,
  userInConversation,
} from "@/lib/db";
import { executeExchange } from "@/lib/exchange";
import { isFiat } from "@/lib/money";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const conversationId = req.nextUrl.searchParams.get("conversationId") || undefined;
    const status = req.nextUrl.searchParams.get("status") as "pending" | "filled" | "rejected" | null;
    if (conversationId && !userInConversation(conversationId, user.id)) {
      throw Object.assign(new Error("无权查看"), { status: 403 });
    }
    const requests = listExchangeRequests({
      conversationId,
      status: status || (user.role === "admin" ? "pending" : undefined),
    }).filter((r) => user.role === "admin" || r.userId === user.id);
    return NextResponse.json({ requests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      id?: string;
      action?: "fill" | "reject";
      side?: "buy" | "sell";
      amount?: number;
      currency?: string;
      note?: string;
      conversationId?: string;
    };
    if (body.id && (body.action === "fill" || body.action === "reject")) {
      return fulfillRequest(user, body.id, body.action);
    }
    const side = body.side === "sell" ? "sell" : "buy";
    const amount = Number(body.amount);
    const currency = (body.currency || "CNY").toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额必须大于 0");
    if (!isFiat(currency)) throw new Error("请选择人民币或其他法币");
    const conversationId = body.conversationId || getOrCreateSupport(user.id);
    if (!userInConversation(conversationId, user.id)) {
      throw Object.assign(new Error("无权在这个对话申请"), { status: 403 });
    }
    const request = createExchangeRequest({
      userId: user.id,
      conversationId,
      side,
      amount,
      currency,
      note: body.note,
    });
    const label =
      side === "buy"
        ? `想当面用现金 ${amount} ${currency} 买入 Pay Me`
        : `想当面交出现金，卖出 ${amount} Ᵽ 换成 ${currency}`;
    sendMessage(
      conversationId,
      user.id,
      `[现金兑换] ${label}${body.note ? ` · ${body.note}` : ""}`,
    );
    return NextResponse.json({
      request,
      conversationId,
      message: "已发给管理员。当面交现金后才会入账。",
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { id?: string; action?: "fill" | "reject" };
    if (!body.id || (body.action !== "fill" && body.action !== "reject")) {
      throw new Error("缺少申请");
    }
    return fulfillRequest(user, body.id, body.action);
  } catch (error) {
    return jsonError(error);
  }
}

async function fulfillRequest(user: { id: string; role: string }, id: string, action: "fill" | "reject") {
  if (user.role !== "admin") throw Object.assign(new Error("仅管理员"), { status: 403 });
  const request = getExchangeRequest(id);
  if (!request) throw new Error("申请不存在");
  if (request.status !== "pending") throw new Error("这单已经处理过了");

  if (action === "reject") {
    setExchangeRequestStatus(request.id, "rejected");
    if (request.conversationId) {
      sendMessage(request.conversationId, user.id, `[兑换申请] 已拒绝 @${request.username} 的申请`);
    }
    return NextResponse.json({ request: getExchangeRequest(request.id) });
  }

  const result = await executeExchange({
    userId: request.userId,
    side: request.side,
    amount: request.amount,
    currency: request.currency,
  });
  setExchangeRequestStatus(request.id, "filled");
  if (request.conversationId) {
    sendMessage(request.conversationId, user.id, `[兑换申请] 已入账：${result.message}`);
  }
  return NextResponse.json({ request: getExchangeRequest(request.id), result });
}
