"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flash } from "@/components/Flash";

export default function OnboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const data = await res.json();
      if (data.user?.username && data.user.firstName && data.user.lastName) {
        router.replace("/home");
      } else if (data.user?.username) {
        router.replace("/onboard/name");
      }
    });
  }, [router]);

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
      router.push("/onboard/name");
    } catch {
      setError("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs text-gold">SETUP · 1/2</p>
      <h1 className="mt-2 text-3xl font-semibold">设置用户名</h1>
      <p className="mt-2 text-sm text-muted">别人用 /pay 金额 @你的名字 付钱。</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="font-mono text-[11px] text-muted">用户名</label>
          <div className="field mt-2 flex items-center px-3">
            <span className="text-gold">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-transparent px-2 py-2.5 outline-none"
              placeholder="luna"
              required
            />
          </div>
        </div>
        <div>
          <label className="font-mono text-[11px] text-muted">显示名（可选）</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="field mt-2 w-full px-3 py-2.5"
            placeholder="Luna"
          />
        </div>
        <Flash text={error} tone="err" />
        <button disabled={busy} className="btn w-full py-2.5 text-sm">
          {busy ? "..." : "下一步：真实姓名"}
        </button>
      </form>
    </div>
  );
}
