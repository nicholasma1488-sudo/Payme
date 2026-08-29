"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandBar } from "./CommandBar";
import { RateTicker } from "./RateTicker";
import { formatPayme, SUPPORTED_FIAT } from "@/lib/money";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/home", label: "钱包" },
  { href: "/exchange", label: "兑换" },
  { href: "/auction", label: "拍卖" },
  { href: "/chat", label: "聊天" },
];

export function AppShell({
  user,
  children,
}: {
  user: Pick<User, "username" | "displayName" | "role" | "balancePayme" | "displayCurrency">;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currency, setCurrency] = useState(user.displayCurrency);
  const [fiatPer, setFiatPer] = useState<number | null>(null);
  const [balance, setBalance] = useState(user.balancePayme);

  useEffect(() => {
    setBalance(user.balancePayme);
  }, [user.balancePayme]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [me, rates] = await Promise.all([fetch("/api/auth/me"), fetch("/api/rates")]);
      if (me.ok) {
        const data = await me.json();
        if (alive && data.user) {
          setBalance(data.user.balancePayme);
          setCurrency(data.user.displayCurrency);
        }
      }
      if (rates.ok) {
        const data = await rates.json();
        if (alive) setFiatPer(data.fiatPerPayme);
      }
    };
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pathname]);

  async function changeCurrency(next: string) {
    setCurrency(next);
    await fetch("/api/me/currency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: next }),
    });
    const rates = await fetch("/api/rates").then((r) => r.json());
    setFiatPer(rates.fiatPerPayme);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const items = user.role === "admin" ? [...NAV, { href: "/admin", label: "金库" }] : NAV;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-[#100e0b]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/home" className="flex items-baseline gap-2">
            <span className="font-display text-2xl tracking-tight text-gold">Pay Me</span>
            <span className="hidden text-[11px] uppercase tracking-[0.22em] text-muted sm:inline">
              朋友圈货币
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    active ? "bg-gold/15 text-gold" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-sm text-gold">{formatPayme(balance)}</div>
              <div className="text-[11px] text-muted">
                {fiatPer != null
                  ? `≈ ${(balance * fiatPer).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${currency}`
                  : currency}
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => changeCurrency(e.target.value)}
              className="rounded-full border border-line bg-paper px-2 py-1 text-[11px] text-muted"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] text-ink">@{user.username}</span>
              <button onClick={logout} className="text-[11px] text-muted hover:text-gold">
                退出
              </button>
            </div>
          </div>
        </div>
        <RateTicker />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-4">{children}</main>

      <nav
        className={`grid border-t border-line bg-[#100e0b] md:hidden ${
          items.length > 4 ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-3 text-center text-xs ${
              pathname.startsWith(item.href) ? "text-gold" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <CommandBar onDone={() => router.refresh()} />
    </div>
  );
}
