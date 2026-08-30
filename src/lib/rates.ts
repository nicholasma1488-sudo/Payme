import { getSetting } from "./db";
import { convertViaUsd, SUPPORTED_FIAT } from "./money";
import type { RatesSnapshot } from "./types";

type Cache = { snapshot: RatesSnapshot; fetchedAt: number };
let cache: Cache | null = null;
const TTL_MS = 5 * 60 * 1000;

const FALLBACK_USD: Record<string, number> = {
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

async function fetchUsdRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("rate http");
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (!data.rates) throw new Error("rate shape");
    const usd: Record<string, number> = { USD: 1 };
    for (const code of SUPPORTED_FIAT) {
      if (data.rates[code]) usd[code] = data.rates[code];
    }
    return { ...FALLBACK_USD, ...usd };
  } catch {
    return { ...FALLBACK_USD };
  }
}

export async function getRates(): Promise<RatesSnapshot> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return {
      ...cache.snapshot,
      cnyPerPayme: Number(getSetting("cny_per_payme", "10")),
    };
  }
  const usd = await fetchUsdRates();
  const snapshot: RatesSnapshot = {
    base: "USD",
    updatedAt: Date.now(),
    usd,
    cnyPerPayme: Number(getSetting("cny_per_payme", "10")),
  };
  cache = { snapshot, fetchedAt: Date.now() };
  return snapshot;
}

export function tickerPairs(snapshot: RatesSnapshot) {
  return SUPPORTED_FIAT.map((code) => {
    const cny = convertViaUsd(1, code, "CNY", snapshot.usd);
    const payme = cny / snapshot.cnyPerPayme;
    return {
      code,
      cnyPerUnit: cny,
      paymePerUnit: payme,
      fiatPerPayme: snapshot.cnyPerPayme / cny,
    };
  });
}
