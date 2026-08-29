import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCommand } from "./commands";

describe("parseCommand", () => {
  it("parses pay with note", () => {
    const cmd = parseCommand("/pay 20 luna lunch");
    assert.deepEqual(cmd, {
      type: "pay",
      amount: 20,
      username: "luna",
      note: "lunch",
    });
  });

  it("parses buy exchange", () => {
    const cmd = parseCommand("exchange 200 CNY");
    assert.deepEqual(cmd, { type: "exchange", amount: 200, currency: "CNY", side: "buy" });
  });

  it("parses sell exchange", () => {
    const cmd = parseCommand("/exchange 15 PAYME USD");
    assert.deepEqual(cmd, { type: "exchange", amount: 15, currency: "USD", side: "sell" });
  });

  it("parses chat and support", () => {
    assert.deepEqual(parseCommand("/chat @kai"), { type: "chat", username: "kai" });
    assert.deepEqual(parseCommand("support"), { type: "support" });
  });

  it("parses pay 20 to username", () => {
    assert.deepEqual(parseCommand("pay 20 to luna lunch"), {
      type: "pay",
      amount: 20,
      username: "luna",
      note: "lunch",
    });
    assert.deepEqual(parseCommand("20 to @kai"), {
      type: "pay",
      amount: 20,
      username: "kai",
      note: "",
    });
    assert.deepEqual(parseCommand("/pay luna 15 电影"), {
      type: "pay",
      amount: 15,
      username: "luna",
      note: "电影",
    });
  });

  it("parses add friend", () => {
    assert.deepEqual(parseCommand("/add nova"), { type: "add", username: "nova" });
  });
});
