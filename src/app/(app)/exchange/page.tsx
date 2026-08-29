"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flash } from "@/components/Flash";
import { SUPPORTED_FIAT } from "@/lib/money";

type Quote = {
  side: "buy" | "sell";
  inputAmount: number;
  payme: number;
  fiat?: number;
  cny: number;
  cnyPerPayme: number;
};

export default function ExchangePage() {
  const router = useRouter();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("200");
  const [currency, setCurrency] = useState("CNY");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const n = Number(amount);
      if (!n || n <= 0) {
        setQuote(null);
        return;
      }
      const res = await fetch("/api/exchange/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: n, currency }),
      });
      const data = await res.json();
      if (res.ok) setQuote(data.quote);
    }, 250);
    return () => clearTimeout(t);
  }, [side, amount, currency]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/exchange/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount: Number(amount), currency }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "兑换失败");
        return;
      }
      setMessage(data.message);
      router.refresh();
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  async function openSupport() {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ support: true }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/chat?c=${data.conversationId}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-copper">实时兑换</p>
        <h1 className="mt-2 font-display text-4xl">人民币或其他货币 ↔ Pay Me</h1>
        <p className="mt-3 max-w-xl text-muted">
          汇率按公开市场中间价滚动更新，Pay Me 锚定人民币（默认 1 Ᵽ = 10 CNY，管理员可改）。买入时金库付出 Pay Me、收入法币准备金；卖出相反。
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-[28px] border border-line bg-paper p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                side === "buy" ? "bg-gold text-[#1a1208]" : "text-muted"
              }`}
            >
              买入 Pay Me
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                side === "sell" ? "bg-gold text-[#1a1208]" : "text-muted"
              }`}
            >
              兑出法币
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-2xl border border-line bg-bg px-4 py-3 font-mono outline-none"
              inputMode="decimal"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-2xl border border-line bg-bg px-3 py-3"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {quote && (
            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 font-mono text-sm">
              {side === "buy" ? (
                <p>
                  {quote.inputAmount} {currency} → <span className="text-gold">{quote.payme} Ᵽ</span>
                  <span className="block text-xs text-muted">折合 {quote.cny} CNY · 牌价 1 Ᵽ = {quote.cnyPerPayme} CNY</span>
                </p>
              ) : (
                <p>
                  {quote.payme} Ᵽ → <span className="text-gold">{quote.fiat} {currency}</span>
                  <span className="block text-xs text-muted">金库将减少 {quote.cny} CNY 准备金</span>
                </p>
              )}
            </div>
          )}
          <Flash text={error} tone="err" />
          <Flash text={message} />
          <button disabled={busy} className="w-full rounded-2xl bg-gold py-3 text-sm font-medium text-[#1a1208]">
            {busy ? "兑换中…" : "按实时牌价兑换"}
          </button>
          <p className="text-xs text-muted">
            线下打款或大额，走客服确认。命令栏也可写{" "}
            <span className="font-mono text-gold">/exchange 200 CNY</span>
          </p>
        </form>
      </section>

      <aside className="rounded-[28px] border border-line bg-paper p-6">
        <h2 className="font-display text-2xl">找客服兑换</h2>
        <p className="mt-3 text-sm text-muted">
          管理员账户持有圈子金库。如果你要微信/支付宝转人民币再入账，或金库提示不足，直接连线客服。
        </p>
        <button
          onClick={openSupport}
          className="mt-6 w-full rounded-2xl border border-gold/40 py-3 text-sm text-gold"
        >
          连接管理员客服
        </button>
        <div className="mt-6 space-y-2 text-sm text-muted">
          <p>1. 告诉客服金额与币种</p>
          <p>2. 按约定完成法币转账</p>
          <p>3. 客服从金库拨付 Pay Me，或帮你兑出</p>
        </div>
      </aside>
    </div>
  );
}
