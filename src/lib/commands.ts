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
    return { type: "unknown", raw, hint: "输入 /pay、/exchange、/chat 或 /support" };
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
      return { type: "unknown", raw, hint: "用法：/chat 用户名" };
    }
    return { type: "chat", username };
  }

  if (verb === "add" || verb === "加" || verb === "好友") {
    const username = normalizeUser(parts.slice(1).join(" "));
    if (!username) {
      return { type: "unknown", raw, hint: "用法：/add 用户名" };
    }
    return { type: "add", username };
  }

  if (verb === "pay" || verb === "转" || verb === "付款") {
    const paid = parsePayArgs(parts.slice(1), { allowUsernameFirst: true });
    if (!paid) {
      return { type: "unknown", raw, hint: "用法：/pay 20 to luna 或 /pay 20 luna [备注]" };
    }
    return { type: "pay", ...paid };
  }

  if (verb === "exchange" || verb === "ex" || verb === "兑换") {
    // /exchange 200 CNY          → 用 200 CNY 买入 PAYME
    // /exchange 15 PAYME CNY     → 卖出 15 PAYME 换成 CNY
    // /exchange buy 200 CNY
    // /exchange sell 15 CNY
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
      return { type: "unknown", raw, hint: "用法：/exchange 200 CNY 或 /exchange 15 PAYME CNY" };
    }
    if (second === "PAYME" || second === "Ᵽ" || second === "PM") {
      const currency = isFiat(third) ? third : "CNY";
      return { type: "exchange", amount, currency, side: "sell" };
    }
    if (isFiat(second)) {
      return { type: "exchange", amount, currency: second, side: "buy" };
    }
    return { type: "unknown", raw, hint: "用法：/exchange 200 CNY 或 /exchange 15 PAYME CNY" };
  }

  // Bare "20 to luna lunch" from the command bar
  const implicit = parsePayArgs(parts, { allowUsernameFirst: false, requireTo: true });
  if (implicit) {
    return { type: "pay", ...implicit };
  }

  return {
    type: "unknown",
    raw,
    hint: "未知命令。试试 /pay 20 to luna、/exchange 200 CNY、/chat luna、/support",
  };
}

function looksLikeUsername(raw: string): boolean {
  const name = normalizeUser(raw).toLowerCase();
  if (!name) return false;
  if (isFiat(name) || name === "payme" || name === "pm") return false;
  return /^[a-z0-9_]{2,16}$/.test(name);
}

function parsePayArgs(
  args: string[],
  opts: { allowUsernameFirst?: boolean; requireTo?: boolean } = {},
): { amount: number; username: string; note: string } | null {
  const tokens = args.filter(Boolean);
  if (!tokens.length) return null;

  const toIndex = tokens.findIndex((t) => t.toLowerCase() === "to" || t === "给" || t === "to:");
  if (toIndex >= 0) {
    const before = tokens.slice(0, toIndex);
    const after = tokens.slice(toIndex + 1);
    const amountFromBefore = parseAmount(before[0] || "");
    const amountFromAfter = parseAmount(after[0] || "");
    if (amountFromBefore && looksLikeUsername(after[0] || "")) {
      return {
        amount: amountFromBefore,
        username: normalizeUser(after[0]),
        note: after.slice(1).join(" ").trim(),
      };
    }
    if (amountFromAfter && looksLikeUsername(before[0] || "")) {
      return {
        amount: amountFromAfter,
        username: normalizeUser(before[0]),
        note: after.slice(1).join(" ").trim(),
      };
    }
    return null;
  }

  if (opts.requireTo) return null;

  const firstAmount = parseAmount(tokens[0] || "");
  if (firstAmount && looksLikeUsername(tokens[1] || "")) {
    return {
      amount: firstAmount,
      username: normalizeUser(tokens[1]),
      note: tokens.slice(2).join(" ").trim(),
    };
  }

  if (opts.allowUsernameFirst) {
    const secondAmount = parseAmount(tokens[1] || "");
    if (secondAmount && looksLikeUsername(tokens[0] || "")) {
      return {
        amount: secondAmount,
        username: normalizeUser(tokens[0]),
        note: tokens.slice(2).join(" ").trim(),
      };
    }
  }

  return null;
}

export const COMMAND_HELP = [
  { cmd: "/pay 20 to luna 午饭", desc: "向用户名转账 Pay Me" },
  { cmd: "/exchange 200 CNY", desc: "用人民币买入 Pay Me" },
  { cmd: "/exchange 15 PAYME USD", desc: "把 Pay Me 兑成美元" },
  { cmd: "/chat luna", desc: "按用户名打开私聊" },
  { cmd: "/add kai", desc: "按用户名加朋友并聊天" },
  { cmd: "/support", desc: "连接客服（管理员）兑钱" },
  { cmd: "/sell", desc: "去拍卖上传照片出售" },
];
