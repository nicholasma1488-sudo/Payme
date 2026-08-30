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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="panel p-5">
        <p className="font-mono text-xs text-gold">SPOT · PAYME</p>
        <h1 className="mt-1 text-2xl font-semibold">交易</h1>
        <p className="mt-2 text-sm text-muted">法币 ↔ PAYME。默认 1 Ᵽ = 10 CNY，牌价实时更新。不是链上 BTC。</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`px-4 py-1.5 font-mono text-xs ${side === "buy" ? "bg-moss text-[#0b0e11]" : "tab-off border border-line"}`}
            >
              买入
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`px-4 py-1.5 font-mono text-xs ${side === "sell" ? "bg-rose text-white" : "tab-off border border-line"}`}
            >
              卖出
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field px-3 py-2.5 font-mono"
              inputMode="decimal"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="field px-3 py-2.5 font-mono"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {quote && (
            <div className="border border-line bg-bg p-3 font-mono text-sm">
              {side === "buy" ? (
                <p>
                  {quote.inputAmount} {currency} → <span className="text-moss">{quote.payme} Ᵽ</span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {quote.cny} CNY · 1 Ᵽ = {quote.cnyPerPayme} CNY
                  </span>
                </p>
              ) : (
                <p>
                  {quote.payme} Ᵽ →{" "}
                  <span className="text-rose">
                    {quote.fiat} {currency}
                  </span>
                </p>
              )}
            </div>
          )}
          <Flash text={error} tone="err" />
          <Flash text={message} />
          <button disabled={busy} className="btn w-full py-2.5 text-sm">
            {busy ? "..." : side === "buy" ? "买入 PAYME" : "卖出 PAYME"}
          </button>
          <p className="font-mono text-[11px] text-muted">命令：/exchange 200 CNY</p>
        </form>
      </section>

      <aside className="panel p-5">
        <h2 className="font-mono text-sm">OTC / @admin</h2>
        <p className="mt-2 text-sm text-muted">
          客服和兑钱都发给 @admin。工作日 15:30 前预约，金库有初始流动性。
        </p>
        <button onClick={openSupport} className="btn-ghost mt-5 w-full py-2.5 text-sm">
          发消息给 admin
        </button>
        <a href="/book" className="btn mt-2 block w-full py-2.5 text-center text-sm">
          兑换预约
        </a>
        <ol className="mt-5 list-decimal space-y-1 pl-4 text-xs text-muted">
          <li>预约工作日时段（15:30 截止）</li>
          <li>消息会发给 @admin</li>
          <li>谈妥后从金库入账</li>
        </ol>
      </aside>
    </div>
  );
}
