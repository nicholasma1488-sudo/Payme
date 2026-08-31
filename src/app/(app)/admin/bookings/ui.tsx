"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExchangeBooking } from "@/lib/types";
import { Flash } from "@/components/Flash";
import { MARKET_OFFSET_NOTE } from "@/lib/cnyGuard";
import { formatPayme, SUPPORTED_FIAT } from "@/lib/money";
import { formatLegalName } from "@/lib/names";

type MarketQuote = {
  payme: number;
  cny: number;
  officialCny: number;
  offset: number;
  clamped: boolean;
  maxOffset: number;
};

export function BookingsAdmin({
  date,
  dates,
  slots,
  bookings,
  quotes,
  takenByDate,
  counts,
  treasury,
}: {
  date: string;
  dates: string[];
  slots: string[];
  bookings: ExchangeBooking[];
  quotes: Record<string, MarketQuote>;
  takenByDate: Record<string, string[]>;
  counts: { date: string; people: number; pending: number }[];
  treasury: {
    treasuryPayme: number;
    circulating: number;
    plannedTreasury: number;
    cnyReserve: number;
  };
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [slotTime, setSlotTime] = useState("15:00");
  const [slotDate, setSlotDate] = useState(date);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("CNY");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const pending = bookings.filter((b) => b.status === "pending").length;

  async function addPerson(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
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
      setError(data.error || "添加失败");
      return;
    }
    setMessage(`已加入 ${slotDate} ${slotTime} · @${username}`);
    setUsername("");
    setAmount("");
    router.refresh();
  }

  async function setStatus(id: string, status: "done" | "cancelled") {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "处理失败");
      return;
    }
    if (data.message) setMessage(data.message);
    router.refresh();
  }

  async function openChat(booking: ExchangeBooking) {
    setError(null);
    setOpening(booking.id);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: booking.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "打不开聊天");
        return;
      }
      router.push(`/chat?c=${data.conversationId}&ask=cash`);
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs text-gold">BOOKINGS · @admin</p>
        <h1 className="mt-1 text-2xl font-semibold">兑换预约</h1>
        <p className="mt-2 text-sm text-muted">
          只收当面现金。工作日 15:30 截止。点开人名即可问见面地点。{MARKET_OFFSET_NOTE} 待流通{" "}
          {formatPayme(treasury.treasuryPayme)} / 规划 {formatPayme(treasury.plannedTreasury)}
          ，准备金 {treasury.cnyReserve.toLocaleString("zh-CN")} CNY。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="panel p-4">
          <div className="font-mono text-[11px] text-muted">当日人数</div>
          <div className="mt-2 font-mono text-2xl text-moss">{bookings.length}</div>
        </div>
        <div className="panel p-4">
          <div className="font-mono text-[11px] text-muted">待处理</div>
          <div className="mt-2 font-mono text-2xl text-gold">{pending}</div>
        </div>
        <div className="panel p-4">
          <div className="font-mono text-[11px] text-muted">流通中</div>
          <div className="mt-2 font-mono text-2xl text-ink">{formatPayme(treasury.circulating)}</div>
        </div>
      </div>

      <div className="space-y-2">
        <Flash text={error} tone="err" />
        <Flash text={message} />
      </div>

      <div className="flex flex-wrap gap-2">
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => router.push(`/admin/bookings?date=${d}`)}
            className={`px-3 py-1.5 font-mono text-xs ${
              d === date ? "tab-on" : "tab-off border border-line"
            }`}
          >
            {d}
            {counts.find((c) => c.date === d) ? ` · ${counts.find((c) => c.date === d)?.people}` : ""}
          </button>
        ))}
      </div>

      <section className="panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-sm">
          {date} · {bookings.length} 人
        </h2>
        {bookings.length === 0 && <p className="px-5 py-8 text-sm text-muted">这一天还没有预约</p>}
        {bookings.map((b) => {
          const legal = formatLegalName(b);
          const q = quotes[b.id];
          return (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3"
            >
              <button type="button" onClick={() => openChat(b)} className="min-w-0 flex-1 text-left">
                <div className="text-sm text-ink">{legal || "未登记真名"}</div>
                <div className="font-mono text-sm text-gold">
                  {b.slotTime} · @{b.username}
                </div>
                <div className="text-xs text-muted">
                  {b.side === "buy" ? "买入" : "兑出"} {b.amount} {b.side === "buy" ? b.currency : "Ᵽ"} ·{" "}
                  {b.status}
                  {b.note ? ` · ${b.note}` : ""}
                </div>
                {q && b.status === "pending" && (
                  <div className="mt-1 font-mono text-[11px] text-moss">
                    完成时自动入账 {q.payme} Ᵽ · 人民币 {q.officialCny} CNY · 偏差 {q.offset}/
                    {q.maxOffset}
                    {q.clamped ? " · 已夹紧" : ""}
                  </div>
                )}
                {b.settledPayme != null && (
                  <div className="mt-1 font-mono text-[11px] text-gold">
                    已入账 {b.settledPayme} Ᵽ · {b.settledCny} CNY · 偏差 {b.settledOffset} 元
                  </div>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openChat(b)}
                  disabled={opening === b.id}
                  className="btn px-2 py-1 text-xs"
                >
                  {opening === b.id ? "..." : "问兑换地点"}
                </button>
                {b.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStatus(b.id, "done")}
                      className="border border-line px-2 py-1 text-xs text-moss"
                    >
                      完成
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(b.id, "cancelled")}
                      className="border border-line px-2 py-1 text-xs text-muted"
                    >
                      取消
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="panel p-5">
        <h2 className="font-mono text-sm">添加预约人物</h2>
        <p className="mt-1 text-xs text-muted">
          指定空闲日期和时间。已被预约的时段不能再加人，请换其他时间或明天。
        </p>
        <form onSubmit={addPerson} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@用户名"
            required
            className="field px-3 py-2"
          />
          <select value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className="field px-3 py-2 font-mono">
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={slotTime} onChange={(e) => setSlotTime(e.target.value)} className="field px-3 py-2 font-mono">
            {slots
              .filter((t) => !(takenByDate[slotDate] || []).includes(t))
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
          <select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")} className="field px-3 py-2">
            <option value="buy">买入</option>
            <option value="sell">兑出</option>
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金额"
            required
            className="field px-3 py-2 font-mono"
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
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注"
            className="field px-3 py-2 sm:col-span-2"
          />
          <div className="sm:col-span-2 space-y-2">
            <Flash text={error} tone="err" />
            <Flash text={message} />
            <button className="btn px-4 py-2 text-sm">加入名单</button>
          </div>
        </form>
      </section>
    </div>
  );
}
