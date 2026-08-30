"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flash } from "@/components/Flash";

export default function LegalNamePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) {
        router.replace("/");
        return;
      }
      const data = await res.json();
      if (!data.user?.username) router.replace("/onboard");
      else if (data.user.firstName && data.user.lastName) router.replace("/home");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs text-gold">SETUP · 2/2</p>
      <h1 className="mt-2 text-3xl font-semibold">真实姓名</h1>
      <p className="mt-2 text-sm text-muted">
        预约兑换后，管理员日历会显示你的 First / Last name。兑换只收当面现金，不走支付宝/微信。
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="font-mono text-[11px] text-muted">First name（名）</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="field mt-2 w-full px-3 py-2.5"
            placeholder="Luna"
            required
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] text-muted">Last name（姓）</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="field mt-2 w-full px-3 py-2.5"
            placeholder="Chen"
            required
            autoComplete="family-name"
          />
        </div>
        <Flash text={error} tone="err" />
        <button disabled={busy} className="btn w-full py-2.5 text-sm">
          {busy ? "..." : "进入市场"}
        </button>
      </form>
    </div>
  );
}
