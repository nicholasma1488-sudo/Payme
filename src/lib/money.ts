export const PAYME_CODE = "PAYME";
export const DEFAULT_DISPLAY = "CNY";
export const SUPPORTED_FIAT = [
  "CNY",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "HKD",
  "KRW",
  "SGD",
  "CAD",
] as const;

export type FiatCode = (typeof SUPPORTED_FIAT)[number];

export function isFiat(code: string): code is FiatCode {
  return (SUPPORTED_FIAT as readonly string[]).includes(code.toUpperCase());
}

export function roundMoney(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatPayme(amount: number): string {
  return `${roundMoney(amount, 2).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Ᵽ`;
}

export function formatFiat(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${roundMoney(amount)} ${currency}`;
  }
}

/** Convert an amount of `from` into `to` using USD-quoted rates. */
export function convertViaUsd(
  amount: number,
  from: string,
  to: string,
  usdRates: Record<string, number>,
): number {
  const src = from.toUpperCase();
  const dst = to.toUpperCase();
  if (src === dst) return amount;
  const fromPerUsd = src === "USD" ? 1 : usdRates[src];
  const toPerUsd = dst === "USD" ? 1 : usdRates[dst];
  if (!fromPerUsd || !toPerUsd) {
    throw new Error(`暂不支持 ${src} → ${dst} 的实时汇率`);
  }
  const usd = amount / fromPerUsd;
  return usd * toPerUsd;
}

export function fiatToPayme(
  amountFiat: number,
  fiat: string,
  usdRates: Record<string, number>,
  cnyPerPayme: number,
): number {
  const cny = convertViaUsd(amountFiat, fiat, "CNY", usdRates);
  return roundMoney(cny / cnyPerPayme, 4);
}

export function paymeToFiat(
  amountPayme: number,
  fiat: string,
  usdRates: Record<string, number>,
  cnyPerPayme: number,
): number {
  const cny = amountPayme * cnyPerPayme;
  return roundMoney(convertViaUsd(cny, "CNY", fiat, usdRates), 2);
}

/** 70 人圈子的流动性规划：每人日常约 1,000 Ᵽ，外加 15% 缓冲。 */
export const CIRCLE_SIZE = 70;
export const PER_PERSON_FLOAT = 1000;
export const TREASURY_BUFFER = 0.15;
export const DEFAULT_CNY_PER_PAYME = 10;
export const PLANNED_TREASURY = Math.round(
  CIRCLE_SIZE * PER_PERSON_FLOAT * (1 + TREASURY_BUFFER),
);
/** 待流通 Ᵽ 对应的现金准备金：80,500 × 10 = 805,000 CNY。 */
export const PLANNED_CNY_RESERVE = PLANNED_TREASURY * DEFAULT_CNY_PER_PAYME;

export function circulationPlan() {
  return {
    people: CIRCLE_SIZE,
    perPerson: PER_PERSON_FLOAT,
    buffer: TREASURY_BUFFER,
    payme: PLANNED_TREASURY,
    cnyPerPayme: DEFAULT_CNY_PER_PAYME,
    cnyReserve: PLANNED_CNY_RESERVE,
  };
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").replace(/^\$/, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return roundMoney(n, 4);
}
