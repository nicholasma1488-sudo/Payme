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
      <header className="px-6 py-5">
        <div className="font-display text-3xl text-gold">Pay Me</div>
        <p className="mt-1 text-xs uppercase tracking-[0.28em] text-muted">朋友之间的比特币</p>
      </header>
      <RateTicker />

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-copper">私人圈子账本</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] text-ink md:text-6xl">
            写一句命令，
            <br />
            把钱付给朋友。
          </h1>
          <p className="mt-5 max-w-md text-muted">
            邮箱登录，起一个用户名就能收款。Pay Me 是你们自己的货币；人民币或任意法币可以按实时汇率兑进兑出。拍卖拍照即卖，客服直连管理员。
          </p>
          <div className="mt-8 rounded-2xl border border-gold/25 bg-paper px-4 py-3 font-mono text-sm text-gold">
            /pay 20 luna 午饭
          </div>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            <li>· 金库按 70 人圈子备好流动性</li>
            <li>· 实时汇率对照你选择的货币</li>
            <li>· 聊天里加朋友，或 /support 找客服兑换</li>
          </ul>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[28px] border border-line bg-paper/90 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                mode === "login" ? "bg-gold text-[#1a1208]" : "text-muted"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-1.5 text-sm ${
                mode === "register" ? "bg-gold text-[#1a1208]" : "text-muted"
              }`}
            >
              用邮箱注册
            </button>
          </div>
          <label className="block text-xs uppercase tracking-[0.18em] text-muted">邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:border-gold/50"
            placeholder="you@friends.com"
          />
          <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-muted">密码</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-bg px-4 py-3 outline-none focus:border-gold/50"
            placeholder="至少 6 位"
          />
          <div className="mt-4">
            <Flash text={error} tone="err" />
          </div>
          <button
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-gold py-3 text-sm font-medium text-[#1a1208] disabled:opacity-60"
          >
            {busy ? "请稍等…" : mode === "login" ? "进入 Pay Me" : "创建账户"}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            演示账号：luna@payme.app / friends123　·　管理员：admin@payme.app / PaymeAdmin70!
          </p>
        </form>
      </div>
    </div>
  );
}
