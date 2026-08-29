"use client";

import type { Transaction } from "@/lib/types";

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
}: {
  username: string;
  balanceLabel: string;
  fiatLabel: string;
  activity: Transaction[];
}) {
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
