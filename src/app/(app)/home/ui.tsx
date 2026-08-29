"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/lib/types";
import { Flash } from "@/components/Flash";

function typeLabel(type: Transaction["type"]) {
  if (type === "pay") return "转账";
  if (type === "exchange_in") return "兑入";
  if (type === "exchange_out") return "兑出";
  if (type === "auction") return "拍卖";
  return "调整";
}

export function HomeClient({
  username,
  balanceLabel,
  fiatLabel,
  activity,
  contacts,
}: {
  username: string;
  balanceLabel: string;
  fiatLabel: string;
  activity: Transaction[];
  contacts: { username: string; displayName: string | null }[];
}) {
  const router = useRouter();
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendPay(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: payTo,
          amount: Number(payAmount),
          note: payNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "付款失败");
        return;
      }
      setMessage(data.message);
      setPayAmount("");
      setPayNote("");
      router.refresh();
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-gold/20 bg-gradient-to-br from-[#2a2118] to-[#16120e] p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">@{username} 的 Pay Me</p>
        <h1 className="mt-3 font-display text-5xl text-gold">{balanceLabel}</h1>
        <p className="mt-2 text-muted">实时约合 {fiatLabel}</p>
        <div className="mt-6 grid gap-3 text-sm text-muted md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-black/20 p-4">
            底部命令栏直接写
            <span className="block font-mono text-gold">/pay 20 luna</span>
          </div>
          <div className="rounded-2xl border border-line bg-black/20 p-4">
            任意法币兑入兑出
            <span className="block font-mono text-gold">/exchange 200 CNY</span>
          </div>
          <div className="rounded-2xl border border-line bg-black/20 p-4">
            客服就是管理员
            <span className="block font-mono text-gold">/support</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={sendPay} className="rounded-[28px] border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">付给朋友</h2>
          <p className="mt-1 text-sm text-muted">写用户名和金额，或用底部命令栏 /pay 20 to luna</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="@用户名"
              required
              className="rounded-2xl border border-line bg-bg px-4 py-3 outline-none"
            />
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="金额 Ᵽ"
              required
              inputMode="decimal"
              className="rounded-2xl border border-line bg-bg px-4 py-3 font-mono outline-none"
            />
            <input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="备注"
              className="rounded-2xl border border-line bg-bg px-4 py-3 outline-none"
            />
          </div>
          <div className="mt-3 space-y-2">
            <Flash text={error} tone="err" />
            <Flash text={message} />
          </div>
          <button
            disabled={busy}
            className="mt-3 rounded-2xl bg-gold px-4 py-2 text-sm font-medium text-[#1a1208]"
          >
            {busy ? "付款中…" : "付款"}
          </button>
        </form>
        <div className="rounded-[28px] border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">朋友</h2>
          <p className="mt-1 text-sm text-muted">用 /add 用户名 或聊天页添加。点名字就能付。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {contacts.length === 0 && <p className="text-sm text-muted">还没有好友。先 /add luna 试试。</p>}
            {contacts.map((c) => (
              <button
                key={c.username}
                type="button"
                onClick={() => setPayTo(c.username)}
                className="rounded-full border border-gold/30 px-3 py-1.5 text-sm text-gold"
              >
                @{c.username}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">最近流水</h2>
        <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-paper">
          {activity.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted">还没有记录。先向朋友转一笔，或去兑换。</p>
          )}
          {activity.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-sm">
                  {typeLabel(tx.type)}{" "}
                  <span className="text-muted">
                    {tx.fromUsername ? `@${tx.fromUsername}` : "系统"} →{" "}
                    {tx.toUsername ? `@${tx.toUsername}` : "系统"}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {tx.note || "—"} · {new Date(tx.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="font-mono text-gold">{tx.amountPayme.toFixed(2)} Ᵽ</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
