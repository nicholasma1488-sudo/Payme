"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RateTicker } from "@/components/RateTicker";
import { Flash } from "@/components/Flash";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.user?.username) router.replace("/home");
      else if (data.user) router.replace("/onboard");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "失败");
        return;
      }
      router.push(data.user?.username ? "/home" : "/onboard");
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center bg-gold font-mono text-sm font-bold text-[#0b0e11]">
            Ᵽ
          </span>
          <span className="font-mono text-lg font-semibold">PAYME</span>
        </div>
        <p className="font-mono text-[11px] text-muted">内部通用币 · 非链上比特币</p>
      </header>
      <RateTicker />

      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="font-mono text-xs text-gold">PAYME / MARKET</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
            圈子通用币
            <br />
            像交易所一样用
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted">
            不是真正的比特币。PAYME 是你们自己的通用货币，用法币按实时汇率兑进兑出。命令转账、拍照上架、客服入账。
          </p>
          <div className="mt-6 border border-gold/30 bg-paper px-4 py-3 font-mono text-sm text-gold">
            /pay 20 @luna
          </div>
          <ul className="mt-5 space-y-1 font-mono text-xs text-muted">
            <li>70 人金库流动性</li>
            <li>CNY / USD / EUR 实时牌价</li>
            <li>/support 找管理员兑钱</li>
          </ul>
        </div>

        <form onSubmit={submit} className="panel p-6">
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`px-3 py-1.5 font-mono text-xs ${mode === "login" ? "tab-on" : "tab-off"}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`px-3 py-1.5 font-mono text-xs ${mode === "register" ? "tab-on" : "tab-off"}`}
            >
              注册
            </button>
          </div>
          <label className="font-mono text-[11px] text-muted">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-2 w-full px-3 py-2.5"
            placeholder="you@friends.com"
          />
          <label className="mt-4 block font-mono text-[11px] text-muted">密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mt-2 w-full px-3 py-2.5"
            placeholder="至少 6 位"
          />
          <div className="mt-4">
            <Flash text={error} tone="err" />
          </div>
          <button disabled={busy} className="btn mt-5 w-full py-2.5 text-sm">
            {busy ? "..." : mode === "login" ? "进入市场" : "创建账户"}
          </button>
          <p className="mt-4 font-mono text-[11px] text-muted">
            luna@payme.app / friends123 · admin@payme.app / PaymeAdmin70!
          </p>
        </form>
      </div>
    </div>
  );
}
