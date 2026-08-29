"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Transaction, User } from "@/lib/types";
import { formatPayme } from "@/lib/money";

type Treasury = {
  userCount: number;
  circulating: number;
  treasuryPayme: number;
  cnyReserve: number;
  cnyPerPayme: number;
  plannedTreasury: number;
  plannedPeople: number;
  perPersonFloat: number;
};

export function AdminClient({
  treasury,
  users,
  transactions,
}: {
  treasury: Treasury;
  users: User[];
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [rate, setRate] = useState(String(treasury.cnyPerPayme));
  const [reserve, setReserve] = useState(String(treasury.cnyReserve));
  const coverage = treasury.plannedTreasury
    ? Math.round((treasury.treasuryPayme / treasury.plannedTreasury) * 100)
    : 0;

  async function save() {
    await fetch("/api/admin/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnyPerPayme: Number(rate),
        cnyReserve: Number(reserve),
      }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-copper">管理员金库</p>
        <h1 className="mt-2 font-display text-4xl">70 人圈子的钱</h1>
        <p className="mt-3 max-w-2xl text-muted">
          按每人日常 {treasury.perPersonFloat} Ᵽ、外加 15% 缓冲计算，{treasury.plannedPeople}{" "}
          人需要 {treasury.plannedTreasury.toLocaleString("zh-CN")} Ᵽ 的金库。现在金库覆盖约 {coverage}%。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="金库 Pay Me" value={formatPayme(treasury.treasuryPayme)} />
        <Stat label="CNY 准备金" value={`${treasury.cnyReserve.toLocaleString("zh-CN")} CNY`} />
        <Stat label="已注册朋友" value={`${treasury.userCount} / ${treasury.plannedPeople}`} />
      </div>

      <section className="rounded-[28px] border border-line bg-paper p-6">
        <h2 className="font-display text-2xl">牌价与准备金</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">
            1 Pay Me = ? CNY
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            法币准备金（CNY）
            <input
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-ink"
            />
          </label>
        </div>
        <button onClick={save} className="mt-4 rounded-2xl bg-gold px-4 py-2 text-sm text-[#1a1208]">
          保存设置
        </button>
        <p className="mt-3 text-xs text-muted">
          流通中 {formatPayme(treasury.circulating)}。客服聊天里谈妥后，你可以让对方走兑换页，或在这里改准备金。
        </p>
      </section>

      <section className="rounded-[28px] border border-line bg-paper">
        <h2 className="px-6 pt-6 font-display text-2xl">成员</h2>
        <div className="mt-3 divide-y divide-line">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-6 py-3 text-sm">
              <div>
                <span className="text-gold">@{u.username || "未设置"}</span>
                <span className="ml-2 text-muted">{u.email}</span>
              </div>
              <div className="font-mono">{u.balancePayme.toFixed(2)} Ᵽ</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-paper">
        <h2 className="px-6 pt-6 font-display text-2xl">全站流水</h2>
        <div className="mt-3 divide-y divide-line">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between px-6 py-3 text-sm">
              <span className="text-muted">
                {tx.type} · @{tx.fromUsername} → @{tx.toUsername} · {tx.note}
              </span>
              <span className="font-mono text-gold">{tx.amountPayme.toFixed(2)} Ᵽ</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[28px] border border-line bg-paper p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-2 font-display text-2xl text-gold">{value}</div>
    </div>
  );
}
