import {
  adjustCnyReserve,
  findUserById,
  getAdmin,
  getSetting,
  transferPayme,
} from "./db";
import { fiatToPayme, isFiat, paymeToFiat, roundMoney } from "./money";
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

  if (params.side === "buy") {
    const payme = fiatToPayme(params.amount, currency, rates.usd, cnyPerPayme);
    const cny = fiatToPayme(params.amount, currency, rates.usd, 1);
    return {
      side: params.side,
      inputAmount: params.amount,
      inputCurrency: currency,
      payme,
      cny: roundMoney(cny, 2),
      cnyPerPayme,
      ratesUpdatedAt: rates.updatedAt,
    };
  }

  const fiat = paymeToFiat(params.amount, currency, rates.usd, cnyPerPayme);
  const cny = params.amount * cnyPerPayme;
  return {
    side: params.side,
    inputAmount: params.amount,
    inputCurrency: "PAYME",
    outputCurrency: currency,
    payme: params.amount,
    fiat,
    cny: roundMoney(cny, 2),
    cnyPerPayme,
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
