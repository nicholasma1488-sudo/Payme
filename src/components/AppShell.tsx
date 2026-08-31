"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookPrompt } from "./BookPrompt";
import { CommandBar } from "./CommandBar";
import { RateTicker } from "./RateTicker";
import { formatPayme, SUPPORTED_FIAT } from "@/lib/money";
import type { User } from "@/lib/types";

const NAV = [
  { href: "/home", label: "资产" },
  { href: "/exchange", label: "交易" },
  { href: "/book", label: "预约" },
  { href: "/auction", label: "市场" },
  { href: "/chat", label: "聊天" },
];

export function AppShell({
  user,
  askBook = false,
  children,
}: {
  user: Pick<User, "username" | "displayName" | "role" | "balancePayme" | "displayCurrency">;
  askBook?: boolean;
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

  const items =
    user.role === "admin"
      ? [...NAV, { href: "/admin", label: "金库" }, { href: "/admin/bookings", label: "预约单" }]
      : NAV;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-[#0b0e11]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/home" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center bg-gold font-mono text-xs font-bold text-[#0b0e11]">
              Ᵽ
            </span>
            <span className="font-mono text-sm font-semibold tracking-wide text-ink">PAYME</span>
            <span className="hidden font-mono text-[10px] text-muted sm:inline">/ 通用币市场</span>
          </Link>
          <nav className="hidden items-center gap-0 md:flex">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b-2 px-3 py-2 font-mono text-xs ${
                    active ? "border-gold text-gold" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-sm text-moss">{formatPayme(balance)}</div>
              <div className="font-mono text-[11px] text-muted">
                {fiatPer != null
                  ? `≈ ${(balance * fiatPer).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${currency}`
                  : currency}
              </div>
            </div>
            <select
              value={currency}
              onChange={(e) => changeCurrency(e.target.value)}
              className="field px-2 py-1 font-mono text-[11px] text-muted"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex flex-col items-end">
              <span className="font-mono text-[11px] text-ink">@{user.username}</span>
              <button onClick={logout} className="font-mono text-[11px] text-muted hover:text-gold">
                退出
              </button>
            </div>
          </div>
        </div>
        <RateTicker />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
      <BookPrompt show={askBook} />

      <nav
        className={`grid border-t border-line bg-[#0b0e11] md:hidden ${
          items.length >= 6 ? "grid-cols-6" : items.length > 4 ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`py-3 text-center font-mono text-[11px] ${
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
