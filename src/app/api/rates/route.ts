import { NextResponse } from "next/server";
import { getRates, tickerPairs } from "@/lib/rates";
import { paymeToFiat } from "@/lib/money";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const rates = await getRates();
  const user = await currentUser();
  const display = user?.displayCurrency || "CNY";
  const fiatPerPayme = paymeToFiat(1, display, rates.usd, rates.cnyPerPayme);
  return NextResponse.json({
    rates,
    ticker: tickerPairs(rates),
    displayCurrency: display,
    fiatPerPayme,
    live: true,
  });
}
