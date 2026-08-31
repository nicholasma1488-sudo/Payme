import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CASH_ONLY_NOTE, CASH_MEETUP_PROMPT, cleanLegalName, formatLegalName, hasLegalName } from "./names";

describe("legal names", () => {
  it("accepts latin first and last names", () => {
    assert.equal(cleanLegalName("  Luna  ", "First name"), "Luna");
    assert.equal(cleanLegalName("Chen", "Last name"), "Chen");
  });

  it("accepts chinese names", () => {
    assert.equal(cleanLegalName("明", "First name"), "明");
    assert.equal(cleanLegalName("张", "Last name"), "张");
  });

  it("rejects empty or numeric names", () => {
    assert.throws(() => cleanLegalName("  ", "First name"));
    assert.throws(() => cleanLegalName("Luna2", "First name"));
  });

  it("formats and detects a full legal name", () => {
    assert.equal(formatLegalName({ firstName: "Luna", lastName: "Chen" }), "Luna Chen");
    assert.equal(hasLegalName({ firstName: "Luna", lastName: "Chen" }), true);
    assert.equal(hasLegalName({ firstName: "Luna", lastName: null }), false);
  });

  it("settlement copy is cash only", () => {
    assert.match(CASH_ONLY_NOTE, /当面现金/);
    assert.match(CASH_MEETUP_PROMPT, /当面现金/);
    assert.doesNotMatch(CASH_ONLY_NOTE, /支付宝|微信/);
    assert.doesNotMatch(CASH_MEETUP_PROMPT, /支付宝|微信/);
  });
});
