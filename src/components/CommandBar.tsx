"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { COMMAND_HELP, parseCommand } from "@/lib/commands";

export function CommandBar({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("试试 /pay 20 luna 午饭");
  const [busy, setBusy] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const parsed = parseCommand(value || "/");
    if (!value.trim()) {
      setHint("命令：/pay 金额 用户名 · /exchange 200 CNY · /chat 用户名 · /support");
      return;
    }
    if (parsed.type === "unknown") setHint(parsed.hint);
    else if (parsed.type === "pay") setHint(`付给 @${parsed.username} ${parsed.amount} Ᵽ`);
    else if (parsed.type === "exchange") {
      setHint(
        parsed.side === "buy"
          ? `用 ${parsed.amount} ${parsed.currency} 买入 Pay Me`
          : `卖出 ${parsed.amount} Ᵽ 换成 ${parsed.currency}`,
      );
    } else if (parsed.type === "chat") setHint(`打开与 @${parsed.username} 的对话`);
    else if (parsed.type === "support") setHint("连接管理员客服");
    else if (parsed.type === "sell") setHint("去拍卖上架");
    else setHint("回车执行");
  }, [value]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHint(data.error || data.message || "执行失败");
        return;
      }
      if (data.action === "help") {
        setOpenHelp(true);
        return;
      }
      if (data.href) router.push(data.href);
      setHint(data.message || "完成");
      setValue("");
      onDone?.();
      router.refresh();
    } catch {
      setHint("网络出错了");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-[#100e0b]/90 px-3 py-3 backdrop-blur-md md:px-6">
      <form onSubmit={submit} className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-paper px-4 py-3 shadow-[0_0_0_1px_rgba(224,181,106,0.08),0_18px_50px_rgba(0,0,0,0.35)]">
          <span className="font-mono text-gold">/</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="pay 20 luna 午饭"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none placeholder:text-muted/50"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setOpenHelp((v) => !v)}
            className="hidden text-[11px] uppercase tracking-[0.18em] text-muted md:inline"
          >
            帮助
          </button>
          <button
            disabled={busy}
            className="rounded-xl bg-gold px-3 py-1.5 text-xs font-medium text-[#1a1208] disabled:opacity-60"
          >
            {busy ? "…" : "执行"}
          </button>
        </div>
        <p className="mt-2 px-1 font-mono text-[11px] text-muted">{hint}</p>
        {openHelp && (
          <div className="mt-2 grid gap-1 rounded-2xl border border-line bg-paper-2 p-3 text-sm">
            {COMMAND_HELP.map((row) => (
              <button
                key={row.cmd}
                type="button"
                onClick={() => {
                  setValue(row.cmd);
                  inputRef.current?.focus();
                }}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 text-left hover:bg-white/5"
              >
                <span className="font-mono text-gold">{row.cmd}</span>
                <span className="text-muted">{row.desc}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
