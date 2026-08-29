import { isFiat, parseAmount } from "./money";

export type ParsedCommand =
  | { type: "pay"; amount: number; username: string; note: string }
  | { type: "exchange"; amount: number; currency: string; side: "buy" | "sell" }
  | { type: "chat"; username: string }
  | { type: "add"; username: string }
  | { type: "support" }
  | { type: "sell" }
  | { type: "help" }
  | { type: "unknown"; raw: string; hint: string };

function stripPrefix(input: string): string {
  return input.trim().replace(/^\/+/, "").trim();
}

function normalizeUser(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  if (!raw) {
    return { type: "unknown", raw, hint: "输入 /pay 20 @luna" };
  }

  const body = stripPrefix(raw);
  const parts = body.split(/\s+/);
  const verb = (parts[0] || "").toLowerCase();

  if (verb === "help" || verb === "帮助") {
    return { type: "help" };
  }

  if (verb === "support" || verb === "cs" || verb === "客服") {
    return { type: "support" };
  }

  if (verb === "sell" || verb === "auction" || verb === "拍卖") {
    return { type: "sell" };
  }

  if (verb === "chat" || verb === "msg" || verb === "聊") {
    const username = normalizeUser(parts.slice(1).join(" "));
    if (!username) {
      return { type: "unknown", raw, hint: "用法：/chat @luna" };
    }
    return { type: "chat", username };
  }

  if (verb === "add" || verb === "加" || verb === "好友") {
    const username = normalizeUser(parts.slice(1).join(" "));
    if (!username) {
      return { type: "unknown", raw, hint: "用法：/add @kai" };
    }
    return { type: "add", username };
  }

  if (verb === "pay" || verb === "转" || verb === "付款") {
    const paid = parsePayArgs(parts.slice(1));
    if (!paid) {
      return { type: "unknown", raw, hint: "用法：/pay 20 @luna" };
    }
    return { type: "pay", ...paid };
  }

  if (verb === "exchange" || verb === "ex" || verb === "兑换") {
    const rest = parts.slice(1);
    if (rest[0]?.toLowerCase() === "buy" || rest[0] === "买") {
      const amount = parseAmount(rest[1] || "");
      const currency = (rest[2] || "CNY").toUpperCase();
      if (!amount || !isFiat(currency)) {
        return { type: "unknown", raw, hint: "用法：/exchange 200 CNY" };
      }
      return { type: "exchange", amount, currency, side: "buy" };
    }
    if (rest[0]?.toLowerCase() === "sell" || rest[0] === "卖") {
      const amount = parseAmount(rest[1] || "");
      const currency = (rest[2] || "CNY").toUpperCase();
      if (!amount) {
        return { type: "unknown", raw, hint: "用法：/exchange sell 15 CNY" };
      }
      return { type: "exchange", amount, currency: isFiat(currency) ? currency : "CNY", side: "sell" };
    }

    const amount = parseAmount(rest[0] || "");
    const second = (rest[1] || "").toUpperCase();
    const third = (rest[2] || "").toUpperCase();
    if (!amount) {
      return { type: "unknown", raw, hint: "用法：/exchange 200 CNY" };
    }
    if (second === "PAYME" || second === "Ᵽ" || second === "PM") {
      const currency = isFiat(third) ? third : "CNY";
      return { type: "exchange", amount, currency, side: "sell" };
    }
    if (isFiat(second)) {
      return { type: "exchange", amount, currency: second, side: "buy" };
    }
    return { type: "unknown", raw, hint: "用法：/exchange 200 CNY" };
  }

  return {
    type: "unknown",
    raw,
    hint: "未知命令。/pay 20 @luna  /exchange 200 CNY  /support",
  };
}

function looksLikeUsername(raw: string): boolean {
  const name = normalizeUser(raw).toLowerCase();
  if (!name) return false;
  if (isFiat(name) || name === "payme" || name === "pm") return false;
  return /^[a-z0-9_]{2,16}$/.test(name);
}

/** Canonical: /pay (amount) @(username) [note] */
function parsePayArgs(args: string[]): { amount: number; username: string; note: string } | null {
  const tokens = args.filter(Boolean);
  if (tokens.length < 2) return null;
  const amount = parseAmount(tokens[0] || "");
  if (!amount || !looksLikeUsername(tokens[1] || "")) return null;
  return {
    amount,
    username: normalizeUser(tokens[1]),
    note: tokens.slice(2).join(" ").trim(),
  };
}

export const COMMAND_HELP = [
  { cmd: "/pay 20 @luna", desc: "转账" },
  { cmd: "/exchange 200 CNY", desc: "买入 PAYME" },
  { cmd: "/exchange 15 PAYME USD", desc: "兑出法币" },
  { cmd: "/chat @luna", desc: "私聊" },
  { cmd: "/add @kai", desc: "加好友" },
  { cmd: "/support", desc: "客服兑钱" },
  { cmd: "/sell", desc: "上架拍卖" },
];
