"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flash } from "@/components/Flash";
import { CASH_ONLY_NOTE } from "@/lib/names";
import { SUPPORTED_FIAT } from "@/lib/money";
import type { ExchangeBooking } from "@/lib/types";

export function BookClient() {
  const params = useSearchParams();
  const [dates, setDates] = useState<string[]>([]);
  const [takenByDate, setTakenByDate] = useState<Record<string, string[]>>({});
  const [openByDate, setOpenByDate] = useState<Record<string, string[]>>({});
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [side, setSide] = useState<"buy" | "sell">(params.get("side") === "sell" ? "sell" : "buy");
  const [amount, setAmount] = useState(params.get("amount") || "200");
  const [currency, setCurrency] = useState(params.get("currency") || "CNY");
  const [note, setNote] = useState("");
  const [mine, setMine] = useState<ExchangeBooking[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const taken = takenByDate[slotDate] || [];
  const openSlots = openByDate[slotDate] || [];

  async function load() {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    if (!res.ok) return;
    setDates(data.dates || []);
    setTakenByDate(data.takenByDate || {});
    setOpenByDate(data.openByDate || {});
    setMine(data.bookings || []);
    const nextDate = data.nextOpen?.date || data.nextDate || "";
    const nextTime = data.nextOpen?.time || "";
    setSlotDate((prev) => prev || nextDate);
    setSlotTime((prev) => prev || nextTime);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!slotDate) return;
    const open = openByDate[slotDate] || [];
    if (open.length === 0) {
      const nextDay = dates.find((d) => d > slotDate && (openByDate[d] || []).length > 0);
      if (nextDay) {
        setSlotDate(nextDay);
        setSlotTime((openByDate[nextDay] || [])[0] || "");
        setError("这一天时段都满了，请选明天或其他日期");
      }
      return;
    }
    if (slotTime && !open.includes(slotTime)) {
      setSlotTime(open[0]);
      setError("这个时段已被预约，请选其他时间或明天");
    } else if (!slotTime) {
      setSlotTime(open[0]);
    }
  }, [slotDate, openByDate, dates, slotTime]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotDate,
          slotTime,
          side,
          amount: Number(amount),
          currency,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "预约失败");
        await load();
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
        <h1 className="mt-1 text-2xl font-semibold">现金兑换预约</h1>
        <p className="mt-2 text-sm text-muted">
          {CASH_ONLY_NOTE} 预约会发给管理员 @admin。每个时段只能一个人。已被预约的时间请改选其他时段或明天。工作日{" "}
          <span className="text-gold">15:30</span> 截止（南澳时间）。
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`px-3 py-1.5 font-mono text-xs ${side === "buy" ? "bg-moss text-[#0b0e11]" : "tab-off border border-line"}`}
            >
              现金买入 PAYME
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`px-3 py-1.5 font-mono text-xs ${side === "sell" ? "bg-rose text-white" : "tab-off border border-line"}`}
            >
              现金兑出
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="field px-3 py-2 font-mono">
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                  {(takenByDate[d] || []).length ? ` · 已约 ${(takenByDate[d] || []).length}` : ""}
                </option>
              ))}
            </select>
            <select
              value={slotTime}
              onChange={(e) => {
                setError(null);
                setSlotTime(e.target.value);
              }}
              className="field px-3 py-2 font-mono"
              required
            >
              {openSlots.length === 0 && <option value="">这一天已满，请换明天</option>}
              {openSlots.map((t) => (
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
          {taken.length > 0 && (
            <p className="font-mono text-[11px] text-rose">已占用：{taken.join("、")}。请选其他时间或明天。</p>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="见面地点（只收现金）"
            className="field w-full px-3 py-2"
          />
          <Flash text={error} tone="err" />
          <Flash text={message} />
          <button disabled={busy || !slotTime} className="btn w-full py-2.5 text-sm">
            {busy ? "..." : "预约并通知 @admin"}
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
              {b.side === "buy" ? "现金买入" : "现金兑出"} {b.amount}{" "}
              {b.side === "buy" ? b.currency : "Ᵽ"} · {b.status}
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
