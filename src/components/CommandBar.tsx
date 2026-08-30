"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { COMMAND_HELP, parseCommand } from "@/lib/commands";

export function CommandBar({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("/pay 20 @luna");
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
      setHint("/pay 20 @luna   /book   /support   /exchange 200 CNY");
      return;
    }
    if (parsed.type === "unknown") setHint(parsed.hint);
    else if (parsed.type === "pay") setHint(`PAY ${parsed.amount} Ᵽ → @${parsed.username}`);
    else if (parsed.type === "exchange") {
      setHint(
        parsed.side === "buy"
          ? `CASH BOOK 买入 ${parsed.amount} ${parsed.currency}`
          : `CASH BOOK 兑出 ${parsed.amount} Ᵽ`,
      );
    } else if (parsed.type === "chat") setHint(`CHAT @${parsed.username}`);
    else if (parsed.type === "add") setHint(`ADD @${parsed.username}`);
    else if (parsed.type === "support") setHint("SUPPORT");
    else if (parsed.type === "sell") setHint("SELL → 拍卖");
    else if (parsed.type === "book") setHint("BOOK → 兑换预约");
    else setHint("Enter");
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
        setHint(data.error || data.message || "失败");
        return;
      }
      if (data.action === "help") {
        setOpenHelp(true);
        return;
      }
      if (data.href) router.push(data.href);
      setHint(data.message || "OK");
      setValue("");
      onDone?.();
      router.refresh();
    } catch {
      setHint("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 z-30 border-t border-line bg-[#0b0e11] px-3 py-2 md:px-6">
      <form onSubmit={submit} className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 border border-gold/40 bg-paper px-3 py-2">
          <span className="font-mono text-sm text-gold">/</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="pay 20 @luna"
            className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink outline-none placeholder:text-muted/50"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setOpenHelp((v) => !v)}
            className="hidden font-mono text-[11px] text-muted md:inline"
          >
            HELP
          </button>
          <button disabled={busy} className="btn px-3 py-1.5 font-mono text-xs">
            {busy ? "..." : "RUN"}
          </button>
        </div>
        <p className="mt-1.5 px-1 font-mono text-[11px] text-muted">{hint}</p>
        {openHelp && (
          <div className="panel mt-2 grid gap-0 p-1 text-sm">
            {COMMAND_HELP.map((row) => (
              <button
                key={row.cmd}
                type="button"
                onClick={() => {
                  setValue(row.cmd);
                  inputRef.current?.focus();
                }}
                className="flex items-center justify-between px-2 py-1.5 text-left hover:bg-white/5"
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
