import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  circulationPlan,
  convertViaUsd,
  fiatToPayme,
  PLANNED_CNY_RESERVE,
  PLANNED_TREASURY,
  parseAmount,
} from "./money";

describe("money", () => {
  it("plans treasury for 70 people", () => {
    assert.equal(PLANNED_TREASURY, 80500);
    assert.equal(PLANNED_CNY_RESERVE, 805000);
    assert.deepEqual(circulationPlan(), {
      people: 70,
      perPerson: 1000,
      buffer: 0.15,
      payme: 80500,
      cnyPerPayme: 10,
      cnyReserve: 805000,
    });
  });

  it("converts fiat to payme via CNY peg", () => {
    const usd = { USD: 1, CNY: 10 };
    assert.equal(fiatToPayme(100, "CNY", usd, 10), 10);
    assert.equal(fiatToPayme(10, "USD", usd, 10), 10);
  });

  it("parses amounts", () => {
    assert.equal(parseAmount("20"), 20);
    assert.equal(parseAmount("1,200.5"), 1200.5);
    assert.equal(parseAmount("-3"), null);
  });

  it("crosses via usd", () => {
    const usd = { USD: 1, CNY: 7, EUR: 0.7 };
    assert.equal(convertViaUsd(7, "CNY", "USD", usd), 1);
  });
});
