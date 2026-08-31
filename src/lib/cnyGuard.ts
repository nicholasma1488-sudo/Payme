import { convertViaUsd, isFiat, roundMoney } from "./money";

/** 流动市场相对人民币兑换，单笔最多能抵消的偏差。 */
export const MAX_CNY_OFFSET = 5;

/**
 * 人民币对照牌价（每 1 USD）。
 * 自动按流动市场入账时，兑成人民币后不能比这张牌价多抵消超过 5 元。
 */
export const OFFICIAL_USD_BOOK: Record<string, number> = {
  USD: 1,
  CNY: 7.24,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 149.2,
  AUD: 1.54,
  HKD: 7.78,
  KRW: 1380,
  SGD: 1.35,
  CAD: 1.38,
};

export type MarketSettleQuote = {
  side: "buy" | "sell";
  inputAmount: number;
  inputCurrency: string;
  outputCurrency?: string;
  payme: number;
  fiat?: number;
  cny: number;
  officialCny: number;
  marketCny: number;
  offset: number;
  clamped: boolean;
  maxOffset: number;
  cnyPerPayme: number;
};

export function fiatToCny(
  amount: number,
  currency: string,
  usdRates: Record<string, number>,
): number {
  const code = currency.toUpperCase();
  if (!isFiat(code)) throw new Error("请选择人民币或其他法币");
  if (code === "CNY") return roundMoney(amount, 2);
  return roundMoney(convertViaUsd(amount, code, "CNY", usdRates), 2);
}

export function clampMarketCnyToRmb(officialCny: number, marketCny: number) {
  const official = roundMoney(officialCny, 2);
  const market = roundMoney(marketCny, 2);
  const rawOffset = roundMoney(market - official, 2);
  if (Math.abs(rawOffset) <= MAX_CNY_OFFSET + 1e-9) {
    return { cny: market, officialCny: official, offset: rawOffset, clamped: false };
  }
  const offset = rawOffset > 0 ? MAX_CNY_OFFSET : -MAX_CNY_OFFSET;
  return {
    cny: roundMoney(official + offset, 2),
    officialCny: official,
    offset,
    clamped: true,
  };
}

export function settleMarketCredit(params: {
  side: "buy" | "sell";
  amount: number;
  currency: string;
  marketUsd: Record<string, number>;
  cnyPerPayme: number;
  officialUsd?: Record<string, number>;
}): MarketSettleQuote {
  if (params.amount <= 0 || !Number.isFinite(params.amount)) {
    throw new Error("金额必须大于 0");
  }
  if (params.cnyPerPayme <= 0) throw new Error("人民币牌价无效");
  const currency = params.currency.toUpperCase();
  const officialUsd = params.officialUsd || OFFICIAL_USD_BOOK;

  if (params.side === "buy") {
    const officialCny = fiatToCny(params.amount, currency, officialUsd);
    const marketCny = fiatToCny(params.amount, currency, params.marketUsd);
    const settled = clampMarketCnyToRmb(officialCny, marketCny);
    const payme = roundMoney(settled.cny / params.cnyPerPayme, 4);
    return {
      side: "buy",
      inputAmount: params.amount,
      inputCurrency: currency,
      payme,
      cny: settled.cny,
      officialCny: settled.officialCny,
      marketCny,
      offset: settled.offset,
      clamped: settled.clamped,
      maxOffset: MAX_CNY_OFFSET,
      cnyPerPayme: params.cnyPerPayme,
    };
  }

  const officialCny = roundMoney(params.amount * params.cnyPerPayme, 2);
  const marketFiatUnclamped = roundMoney(
    convertViaUsd(officialCny, "CNY", currency, params.marketUsd),
    2,
  );
  const marketCny = fiatToCny(marketFiatUnclamped, currency, params.marketUsd);
  const settled = clampMarketCnyToRmb(officialCny, marketCny);
  const fiat = roundMoney(convertViaUsd(settled.cny, "CNY", currency, params.marketUsd), 2);
  return {
    side: "sell",
    inputAmount: params.amount,
    inputCurrency: "PAYME",
    outputCurrency: currency,
    payme: params.amount,
    fiat,
    cny: settled.cny,
    officialCny: settled.officialCny,
    marketCny,
    offset: settled.offset,
    clamped: settled.clamped,
    maxOffset: MAX_CNY_OFFSET,
    cnyPerPayme: params.cnyPerPayme,
  };
}

/** 手工入账：Ᵽ × 牌价 与人民币兑换的差额不能超过 5 元。 */
export function assertPaymeMatchesRmb(params: {
  payme: number;
  fiatAmount: number;
  fiatCurrency: string;
  cnyPerPayme: number;
  officialUsd?: Record<string, number>;
}) {
  const officialCny = fiatToCny(
    params.fiatAmount,
    params.fiatCurrency,
    params.officialUsd || OFFICIAL_USD_BOOK,
  );
  const settlementCny = roundMoney(params.payme * params.cnyPerPayme, 2);
  if (Math.abs(settlementCny - officialCny) > MAX_CNY_OFFSET + 1e-9) {
    throw new Error(
      `入账 ${params.payme} Ᵽ = ${settlementCny} CNY，人民币兑换是 ${officialCny} CNY，偏差不能超过 ${MAX_CNY_OFFSET} 元`,
    );
  }
}

export const MARKET_OFFSET_NOTE = `自动按流动市场入账，但相对人民币兑换单笔最多抵消 ${MAX_CNY_OFFSET} 元。`;
