"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaction } from "@/lib/types";
import { Flash } from "@/components/Flash";

function typeLabel(type: Transaction["type"]) {
  if (type === "pay") return "PAY";
  if (type === "exchange_in") return "BUY";
  if (type === "exchange_out") return "SELL";
  if (type === "auction") return "MKT";
  return "ADJ";
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
    <div className="space-y-5">
      <section className="panel p-6">
        <p className="font-mono text-xs text-muted">@{username} · SPOT</p>
        <h1 className="mt-2 font-mono text-4xl text-moss">{balanceLabel}</h1>
        <p className="mt-1 font-mono text-sm text-muted">≈ {fiatLabel}</p>
        <div className="mt-5 grid gap-2 font-mono text-xs text-muted md:grid-cols-3">
          <div className="border border-line bg-bg p-3">
            转账
            <span className="mt-1 block text-gold">/pay 20 @luna</span>
          </div>
          <div className="border border-line bg-bg p-3">
            兑换
            <span className="mt-1 block text-gold">/exchange 200 CNY</span>
          </div>
          <div className="border border-line bg-bg p-3">
            预约 / 客服
            <span className="mt-1 block text-gold">/book · /support</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={sendPay} className="panel p-5">
          <h2 className="font-mono text-sm">转账</h2>
          <p className="mt-1 text-xs text-muted">或底部输入 /pay 金额 @用户名</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              value={payTo}
              onChange={(e) => setPayTo(e.target.value)}
              placeholder="@用户名"
              required
              className="field px-3 py-2"
            />
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="金额 Ᵽ"
              required
              inputMode="decimal"
              className="field px-3 py-2 font-mono"
            />
            <input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="备注"
              className="field px-3 py-2"
            />
          </div>
          <div className="mt-3 space-y-2">
            <Flash text={error} tone="err" />
            <Flash text={message} />
          </div>
          <button disabled={busy} className="btn mt-3 px-4 py-2 text-sm">
            {busy ? "..." : "PAY"}
          </button>
        </form>
        <div className="panel p-5">
          <h2 className="font-mono text-sm">联系人</h2>
          <p className="mt-1 text-xs text-muted">/add @用户名</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {contacts.length === 0 && <p className="text-sm text-muted">空</p>}
            {contacts.map((c) => (
              <button
                key={c.username}
                type="button"
                onClick={() => setPayTo(c.username)}
                className="border border-line px-2 py-1 font-mono text-xs text-gold hover:border-gold"
              >
                @{c.username}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-sm">流水</h2>
        {activity.length === 0 && <p className="px-5 py-8 text-sm text-muted">无记录</p>}
        {activity.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
            <div>
              <div className="font-mono text-xs">
                <span className="text-gold">{typeLabel(tx.type)}</span>{" "}
                <span className="text-muted">
                  {tx.fromUsername ? `@${tx.fromUsername}` : "—"} → {tx.toUsername ? `@${tx.toUsername}` : "—"}
                </span>
              </div>
              <div className="text-[11px] text-muted">
                {tx.note || "—"} · {new Date(tx.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
            <div className="font-mono text-sm text-moss">{tx.amountPayme.toFixed(2)} Ᵽ</div>
          </div>
        ))}
      </section>
    </div>
  );
}
