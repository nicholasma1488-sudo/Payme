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
  plannedCnyReserve: number;
  plannedPeople: number;
  perPersonFloat: number;
  circulationReady: boolean;
  adminEmail: string;
  adminUsername: string | null;
  adminName: string | null;
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
      method: "POST",
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
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs text-gold">TREASURY · READY</p>
        <h1 className="mt-1 text-2xl font-semibold">金库</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {treasury.plannedPeople} 人 × {treasury.perPersonFloat} Ᵽ × 1.15 ={" "}
          {treasury.plannedTreasury.toLocaleString("zh-CN")} Ᵽ 待流通。对应现金准备金{" "}
          {treasury.plannedCnyReserve.toLocaleString("zh-CN")} CNY。覆盖 {coverage}%。
          {treasury.circulationReady ? " 流动性已预备。" : ""}
        </p>
      </div>

      <section className="panel p-5">
        <h2 className="font-mono text-sm">Admin 账户</h2>
        <p className="mt-2 text-sm text-muted">
          当面收现金后从金库拨出 Ᵽ。登录邮箱与密码已对齐。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="font-mono text-[11px] text-muted">真名</div>
            <div className="mt-1 text-ink">{treasury.adminName || "—"}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] text-muted">用户名</div>
            <div className="mt-1 font-mono text-gold">@{treasury.adminUsername || "admin"}</div>
          </div>
          <div>
            <div className="font-mono text-[11px] text-muted">邮箱</div>
            <div className="mt-1 font-mono text-sm text-ink">{treasury.adminEmail}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="待流通 Ᵽ" value={formatPayme(treasury.treasuryPayme)} />
        <Stat label="已流通" value={formatPayme(treasury.circulating)} />
        <Stat label="CNY 准备金" value={`${treasury.cnyReserve.toLocaleString("zh-CN")} CNY`} />
        <Stat label="已注册朋友" value={`${treasury.userCount} / ${treasury.plannedPeople}`} />
      </div>

      <section className="panel p-5">
        <h2 className="font-mono text-sm">规模 / 牌价</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted">
            计划人数
            <input
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              className="field mt-2 w-full px-3 py-2 font-mono text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            人均浮存 Ᵽ
            <input
              value={floatAmt}
              onChange={(e) => setFloatAmt(e.target.value)}
              className="field mt-2 w-full px-3 py-2 font-mono text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            1 Ᵽ = ? CNY
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="field mt-2 w-full px-3 py-2 font-mono text-ink"
            />
          </label>
          <label className="text-sm text-muted">
            CNY 准备金
            <input
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
              className="field mt-2 w-full px-3 py-2 font-mono text-ink"
            />
          </label>
        </div>
        <button onClick={save} className="btn mt-4 px-4 py-2 text-sm">
          保存
        </button>
        <p className="mt-3 text-xs text-muted">
          待流通 {formatPayme(treasury.treasuryPayme)} · 已流通 {formatPayme(treasury.circulating)}
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="font-mono text-sm">客服入账</h2>
        <p className="mt-2 text-sm text-muted">当面收到现金后再从金库拨 Ᵽ；兑出则收回现金并扣回 Ᵽ。</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            value={payoutUser}
            onChange={(e) => setPayoutUser(e.target.value)}
            placeholder="@用户名"
            className="field px-3 py-2"
          />
          <input
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            placeholder="PAYME 数量"
            className="field px-3 py-2 font-mono"
          />
          <input
            value={payoutFiat}
            onChange={(e) => setPayoutFiat(e.target.value)}
            placeholder="对应 CNY（可选）"
            className="field px-3 py-2 font-mono"
          />
          <input
            value={payoutNote}
            onChange={(e) => setPayoutNote(e.target.value)}
            placeholder="备注"
            className="field px-3 py-2"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPayoutDir("credit")}
            className={`px-3 py-1.5 font-mono text-xs ${
              payoutDir === "credit" ? "tab-on" : "tab-off border border-line"
            }`}
          >
            拨出
          </button>
          <button
            type="button"
            onClick={() => setPayoutDir("debit")}
            className={`px-3 py-1.5 font-mono text-xs ${
              payoutDir === "debit" ? "tab-on" : "tab-off border border-line"
            }`}
          >
            收回
          </button>
          <button onClick={payout} className="btn px-4 py-1.5 text-sm">
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
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border border-line px-3 py-2 text-sm">
                <span>
                  @{r.username} · {r.side === "buy" ? "买入" : "兑出"} {r.amount}{" "}
                  {r.side === "buy" ? r.currency : "Ᵽ"}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => resolveRequest(r.id, "fill")} className="btn px-2 py-1 text-xs">
                    入账
                  </button>
                  <button
                    onClick={() => resolveRequest(r.id, "reject")}
                    className="border border-line px-2 py-1 text-xs text-muted"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-sm">成员</h2>
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

      <section className="panel">
        <h2 className="border-b border-line px-5 py-3 font-mono text-sm">流水</h2>
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
    <div className="panel p-4">
      <div className="font-mono text-[11px] text-muted">{label}</div>
      <div className="mt-2 font-mono text-xl text-moss">{value}</div>
    </div>
  );
}
