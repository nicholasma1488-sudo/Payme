import {
  adjustCnyReserve,
  findUserById,
  findUserByUsername,
  getAdmin,
  getBooking,
  getSetting,
  markBookingSettled,
  setBookingStatus,
  transferPayme,
} from "./db";
import { OFFICIAL_USD_BOOK, settleMarketCredit } from "./cnyGuard";
import { isFiat } from "./money";
import { getRates } from "./rates";

export async function quoteExchange(params: {
  side: "buy" | "sell";
  amount: number;
  currency: string;
}) {
  const currency = params.currency.toUpperCase();
  if (!isFiat(currency)) throw new Error("请选择人民币或其他法币");
  if (params.amount <= 0) throw new Error("金额必须大于 0");
  const rates = await getRates();
  const cnyPerPayme = Number(getSetting("cny_per_payme", "10"));
  const quote = settleMarketCredit({
    side: params.side,
    amount: params.amount,
    currency,
    marketUsd: rates.usd,
    cnyPerPayme,
    officialUsd: OFFICIAL_USD_BOOK,
  });
  return {
    ...quote,
    ratesUpdatedAt: rates.updatedAt,
  };
}

export async function executeExchange(params: {
  userId: string;
  side: "buy" | "sell";
  amount: number;
  currency: string;
}) {
  const quote = await quoteExchange(params);
  const admin = getAdmin();
  const user = findUserById(params.userId);
  if (!user) throw new Error("用户不存在");
  if (user.id === admin.id) throw new Error("管理员金库不走个人兑换口，请在后台调整");

  if (params.side === "buy") {
    if (admin.balancePayme < quote.payme) {
      throw new Error("金库 Pay Me 暂时不够，请联系客服");
    }
    const tx = transferPayme({
      fromUserId: admin.id,
      toUserId: user.id,
      amount: quote.payme,
      type: "exchange_in",
      note: `兑入 ${params.amount} ${params.currency.toUpperCase()}`,
      fiatAmount: params.amount,
      fiatCurrency: params.currency.toUpperCase(),
    });
    adjustCnyReserve(quote.cny);
    return {
      message: `已用 ${params.amount} ${params.currency.toUpperCase()} 兑入 ${quote.payme} Ᵽ`,
      quote,
      transaction: tx,
    };
  }

  const reserve = Number(getSetting("cny_reserve", "0"));
  if (reserve < quote.cny) {
    throw new Error("金库现金准备金不足，请改约见面兑换");
  }
  const tx = transferPayme({
    fromUserId: user.id,
    toUserId: admin.id,
    amount: quote.payme,
    type: "exchange_out",
    note: `兑出 ${quote.fiat} ${params.currency.toUpperCase()}`,
    fiatAmount: quote.fiat,
    fiatCurrency: params.currency.toUpperCase(),
  });
  adjustCnyReserve(-quote.cny);
  return {
    message: `已兑出 ${quote.payme} Ᵽ ≈ ${quote.fiat} ${params.currency.toUpperCase()}`,
    quote,
    transaction: tx,
  };
}

/** 预约完成后，按流动市场自动入账，人民币偏差不超过 5 元。 */
export async function settleBookingFromMarket(bookingId: string) {
  const booking = getBooking(bookingId);
  if (!booking) throw new Error("预约不存在");
  if (booking.status === "cancelled") throw new Error("预约已取消");
  if (booking.settledTxId) {
    setBookingStatus(bookingId, "done");
    return {
      alreadySettled: true,
      booking: getBooking(bookingId),
      quote: null,
      message: "这笔预约已经按流动市场入过账",
    };
  }

  const user = booking.userId ? findUserById(booking.userId) : findUserByUsername(booking.username);
  if (!user) throw new Error(`找不到 @${booking.username}，无法自动入账`);

  const result = await executeExchange({
    userId: user.id,
    side: booking.side,
    amount: booking.amount,
    currency: booking.currency,
  });
  markBookingSettled(bookingId, {
    txId: result.transaction.id,
    payme: result.quote.payme,
    cny: result.quote.cny,
    offset: result.quote.offset,
  });
  const offsetNote = result.quote.clamped
    ? `流动市场已按人民币兑换夹紧，偏差 ${result.quote.offset} CNY`
    : `相对人民币兑换偏差 ${result.quote.offset} CNY`;
  return {
    alreadySettled: false,
    booking: getBooking(bookingId),
    quote: result.quote,
    transaction: result.transaction,
    message:
      booking.side === "buy"
        ? `已按流动市场拨出 ${result.quote.payme} Ᵽ（${result.quote.cny} CNY）。${offsetNote}`
        : `已按流动市场收回 ${result.quote.payme} Ᵽ（${result.quote.cny} CNY）。${offsetNote}`,
  };
}
