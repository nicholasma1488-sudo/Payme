"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Flash } from "@/components/Flash";

export default function OnboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "失败");
        return;
      }
      router.push("/home");
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-xs uppercase tracking-[0.24em] text-copper">第一步</p>
      <h1 className="mt-3 font-display text-4xl text-ink">给自己一个用户名</h1>
      <p className="mt-3 text-muted">朋友用这个名字给你付钱，也可以用它把你加进聊天。</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-muted">用户名</label>
          <div className="mt-2 flex items-center rounded-2xl border border-line bg-paper px-4">
            <span className="text-gold">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-transparent px-2 py-3 outline-none"
              placeholder="luna"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.18em] text-muted">显示名（可选）</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none"
            placeholder="Luna"
          />
        </div>
        <Flash text={error} tone="err" />
        <button
          disabled={busy}
          className="w-full rounded-2xl bg-gold py-3 text-sm font-medium text-[#1a1208]"
        >
          {busy ? "保存中…" : "开始用 Pay Me"}
        </button>
      </form>
    </div>
  );
}
