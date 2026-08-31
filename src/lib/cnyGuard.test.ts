import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CNY_OFFSET,
  OFFICIAL_USD_BOOK,
  assertPaymeMatchesRmb,
  clampMarketCnyToRmb,
  settleMarketCredit,
} from "./cnyGuard";

describe("cny guard", () => {
  it("allows market CNY within 5 of the RMB book", () => {
    const ok = clampMarketCnyToRmb(200, 204);
    assert.equal(ok.clamped, false);
    assert.equal(ok.cny, 204);
    assert.equal(ok.offset, 4);
  });

  it("clamps market CNY that would offset more than 5 yuan", () => {
    const high = clampMarketCnyToRmb(200, 212);
    assert.equal(high.clamped, true);
    assert.equal(high.cny, 205);
    assert.equal(high.offset, MAX_CNY_OFFSET);

    const low = clampMarketCnyToRmb(200, 190);
    assert.equal(low.clamped, true);
    assert.equal(low.cny, 195);
    assert.equal(low.offset, -MAX_CNY_OFFSET);
  });

  it("credits CNY cash at the official peg with zero offset", () => {
    const quote = settleMarketCredit({
      side: "buy",
      amount: 200,
      currency: "CNY",
      marketUsd: OFFICIAL_USD_BOOK,
      cnyPerPayme: 10,
    });
    assert.equal(quote.payme, 20);
    assert.equal(quote.cny, 200);
    assert.equal(quote.officialCny, 200);
    assert.equal(quote.offset, 0);
    assert.equal(quote.clamped, false);
  });

  it("follows the circulating USD market but caps RMB offset at 5", () => {
    const hotMarket = { ...OFFICIAL_USD_BOOK, CNY: 8.2 };
    const quote = settleMarketCredit({
      side: "buy",
      amount: 100,
      currency: "USD",
      marketUsd: hotMarket,
      cnyPerPayme: 10,
    });
    const official = 100 * OFFICIAL_USD_BOOK.CNY;
    assert.equal(quote.officialCny, official);
    assert.equal(quote.clamped, true);
    assert.equal(quote.cny, official + MAX_CNY_OFFSET);
    assert.equal(quote.offset, MAX_CNY_OFFSET);
    assert.equal(quote.payme, (official + MAX_CNY_OFFSET) / 10);
  });

  it("rejects a manual payout that gifts more than 5 CNY vs RMB", () => {
    assert.doesNotThrow(() =>
      assertPaymeMatchesRmb({
        payme: 20,
        fiatAmount: 200,
        fiatCurrency: "CNY",
        cnyPerPayme: 10,
      }),
    );
    assert.throws(
      () =>
        assertPaymeMatchesRmb({
          payme: 21,
          fiatAmount: 200,
          fiatCurrency: "CNY",
          cnyPerPayme: 10,
        }),
      /偏差不能超过 5 元/,
    );
  });
});
