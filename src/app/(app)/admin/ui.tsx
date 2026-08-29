"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExchangeRequest, Transaction, User } from "@/lib/types";
import { formatPayme } from "@/lib/money";
import { Flash } from "@/components/Flash";

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
  requests,
}: {
  treasury: Treasury;
  users: User[];
  transactions: Transaction[];
  requests: ExchangeRequest[];
}) {
  const router = useRouter();
  const [rate, setRate] = useState(String(treasury.cnyPerPayme));
  const [reserve, setReserve] = useState(String(treasury.cnyReserve));
  const [people, setPeople] = useState(String(treasury.plannedPeople));
  const [floatAmt, setFloatAmt] = useState(String(treasury.perPersonFloat));
  const [payoutUser, setPayoutUser] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutFiat, setPayoutFiat] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutDir, setPayoutDir] = useState<"credit" | "debit">("credit");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        plannedPeople: Number(people),
        perPersonFloat: Number(floatAmt),
      }),
    });
    router.refresh();
  }

  async function payout() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: payoutUser,
        amount: Number(payoutAmount),
        direction: payoutDir,
        note: payoutNote,
        fiatAmount: payoutFiat ? Number(payoutFiat) : undefined,
        fiatCurrency: payoutFiat ? "CNY" : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "入账失败");
      return;
    }
    setMessage(payoutDir === "credit" ? "已从金库拨给用户" : "已从用户收回金库");
    setPayoutAmount("");
    router.refresh();
  }

  async function resolveRequest(id: string, action: "fill" | "reject") {
    setError(null);
    const res = await fetch("/api/exchange/request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "处理失败");
      return;
    }
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
        <h2 className="font-display text-2xl">圈子规模与牌价</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">
            计划人数
            <input
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            每人日常浮存（Ᵽ）
            <input
              value={floatAmt}
              onChange={(e) => setFloatAmt(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-ink"
            />
          </label>
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
          流通中 {formatPayme(treasury.circulating)}。需求 = 人数 × 人均 × 1.15。客服谈妥后可在下面入账。
        </p>
      </section>

      <section className="rounded-[28px] border border-line bg-paper p-6">
        <h2 className="font-display text-2xl">客服入账</h2>
        <p className="mt-2 text-sm text-muted">朋友微信/支付宝打了人民币后，从金库拨 Pay Me；兑出则收回 Ᵽ。</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={payoutUser}
            onChange={(e) => setPayoutUser(e.target.value)}
            placeholder="@用户名"
            className="rounded-2xl border border-line bg-bg px-4 py-3 outline-none"
          />
          <input
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            placeholder="Pay Me 数量"
            className="rounded-2xl border border-line bg-bg px-4 py-3 font-mono outline-none"
          />
          <input
            value={payoutFiat}
            onChange={(e) => setPayoutFiat(e.target.value)}
            placeholder="对应人民币（可选）"
            className="rounded-2xl border border-line bg-bg px-4 py-3 font-mono outline-none"
          />
          <input
            value={payoutNote}
            onChange={(e) => setPayoutNote(e.target.value)}
            placeholder="备注"
            className="rounded-2xl border border-line bg-bg px-4 py-3 outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPayoutDir("credit")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              payoutDir === "credit" ? "bg-gold text-[#1a1208]" : "text-muted"
            }`}
          >
            拨给用户
          </button>
          <button
            type="button"
            onClick={() => setPayoutDir("debit")}
            className={`rounded-full px-3 py-1.5 text-sm ${
              payoutDir === "debit" ? "bg-gold text-[#1a1208]" : "text-muted"
            }`}
          >
            收回金库
          </button>
          <button onClick={payout} className="rounded-2xl bg-gold px-4 py-2 text-sm text-[#1a1208]">
            执行
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <Flash text={error} tone="err" />
          <Flash text={message} />
        </div>
        {requests.length > 0 && (
          <div className="mt-5 space-y-2">
            <h3 className="text-sm text-muted">待处理兑换申请</h3>
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line px-4 py-3 text-sm">
                <span>
                  @{r.username} · {r.side === "buy" ? "买入" : "兑出"} {r.amount}{" "}
                  {r.side === "buy" ? r.currency : "Ᵽ"}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveRequest(r.id, "fill")}
                    className="rounded-lg bg-gold px-2 py-1 text-xs text-[#1a1208]"
                  >
                    入账
                  </button>
                  <button
                    onClick={() => resolveRequest(r.id, "reject")}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-muted"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
