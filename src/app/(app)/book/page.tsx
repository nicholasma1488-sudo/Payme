"use client";

import { FormEvent, useEffect, useState } from "react";
import { Flash } from "@/components/Flash";
import { SUPPORTED_FIAT } from "@/lib/money";
import type { ExchangeBooking } from "@/lib/types";

export default function BookPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("15:00");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("200");
  const [currency, setCurrency] = useState("CNY");
  const [note, setNote] = useState("");
  const [mine, setMine] = useState<ExchangeBooking[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    if (!res.ok) return;
    setDates(data.dates || []);
    setSlots(data.slots || []);
    if (!slotDate && data.nextDate) setSlotDate(data.nextDate);
    setMine(data.bookings || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDate, slotTime, side, amount: Number(amount), currency, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "预约失败");
        return;
      }
      setMessage(data.message);
      await load();
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel p-5">
        <p className="font-mono text-xs text-gold">OTC · @admin</p>
        <h1 className="mt-1 text-2xl font-semibold">兑换预约</h1>
        <p className="mt-2 text-sm text-muted">
          发给管理员 @admin。只收当面现金，不走支付宝/微信。每个工作日{" "}
          <span className="text-gold">15:30</span> 截止（南澳时间）。之后和下班/周末约下一个工作日。
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`px-3 py-1.5 font-mono text-xs ${side === "buy" ? "bg-moss text-[#0b0e11]" : "tab-off border border-line"}`}
            >
              买入 PAYME
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`px-3 py-1.5 font-mono text-xs ${side === "sell" ? "bg-rose text-white" : "tab-off border border-line"}`}
            >
              兑出
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="field px-3 py-2 font-mono">
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={slotTime} onChange={(e) => setSlotTime(e.target.value)} className="field px-3 py-2 font-mono">
              {slots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field px-3 py-2 font-mono"
              inputMode="decimal"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="field px-3 py-2 font-mono"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="见面地点（只收现金）"
            className="field w-full px-3 py-2"
          />
          <Flash text={error} tone="err" />
          <Flash text={message} />
          <button disabled={busy} className="btn w-full py-2.5 text-sm">
            {busy ? "..." : "预约并通知 admin"}
          </button>
        </form>
      </section>
      <aside className="panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-sm">我的预约</h2>
        {mine.length === 0 && <p className="px-5 py-8 text-sm text-muted">还没有预约</p>}
        {mine.map((b) => (
          <div key={b.id} className="border-t border-line px-5 py-3 font-mono text-xs">
            <div className="text-gold">
              {b.slotDate} {b.slotTime}
            </div>
            <div className="text-muted">
              {b.side === "buy" ? "买入" : "兑出"} {b.amount} {b.side === "buy" ? b.currency : "Ᵽ"} · {b.status}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
