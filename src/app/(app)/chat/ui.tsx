"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flash } from "@/components/Flash";
import { SUPPORTED_FIAT } from "@/lib/money";
import type { ChatMessage, Conversation, ExchangeRequest } from "@/lib/types";

export function ChatClient() {
  const params = useSearchParams();
  const router = useRouter();
  const selected = params.get("c");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addName, setAddName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [exSide, setExSide] = useState<"buy" | "sell">("buy");
  const [exAmount, setExAmount] = useState("200");
  const [exCurrency, setExCurrency] = useState("CNY");
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [role, setRole] = useState<string>("user");

  async function refreshConvos() {
    const res = await fetch("/api/chat/conversations");
    const data = await res.json();
    if (res.ok) setConversations(data.conversations || []);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user?.id || null);
        setRole(d.user?.role || "user");
      });
    refreshConvos();
  }, []);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/chat/conversations/${selected}/messages`);
      const data = await res.json();
      if (alive && res.ok) setMessages(data.messages || []);
    };
    load();
    const loadReq = async () => {
      const res = await fetch(`/api/exchange/request?conversationId=${selected}&status=pending`);
      const data = await res.json();
      if (alive && res.ok) setRequests(data.requests || []);
    };
    loadReq();
    const id = setInterval(() => {
      load();
      loadReq();
    }, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [selected]);

  const current = useMemo(
    () => conversations.find((c) => c.id === selected) || null,
    [conversations, selected],
  );

  async function addPerson(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: addName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "找不到这个人");
      return;
    }
    setAddName("");
    await refreshConvos();
    router.push(`/chat?c=${data.conversationId}`);
  }

  async function openSupport() {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ support: true }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/chat?c=${data.conversationId}`);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    const body = draft;
    setDraft("");
    const res = await fetch(`/api/chat/conversations/${selected}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "发送失败");
      setDraft(body);
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    refreshConvos();
  }

  async function payFriend(e: FormEvent) {
    e.preventDefault();
    if (!current?.otherUsername) return;
    setError(null);
    const res = await fetch("/api/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: current.otherUsername,
        amount: Number(payAmount),
        note: payNote,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "付款失败");
      return;
    }
    if (selected) {
      await fetch(`/api/chat/conversations/${selected}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: `已付给你 ${payAmount} Ᵽ${payNote ? ` · ${payNote}` : ""}` }),
      });
    }
    setPayAmount("");
    setPayNote("");
    if (selected) {
      const msgs = await fetch(`/api/chat/conversations/${selected}/messages`).then((r) => r.json());
      if (msgs.messages) setMessages(msgs.messages);
    }
    refreshConvos();
    router.refresh();
  }

  async function requestExchange(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/exchange/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side: exSide,
        amount: Number(exAmount),
        currency: exCurrency,
        conversationId: selected || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "申请失败");
      return;
    }
    if (data.conversationId) router.push(`/chat?c=${data.conversationId}`);
    refreshConvos();
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
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="panel grid min-h-[70vh] overflow-hidden lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line lg:border-b-0 lg:border-r">
        <div className="p-4">
          <h1 className="font-mono text-sm">聊天</h1>
          <form onSubmit={addPerson} className="mt-3 flex gap-2">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="@用户名"
              className="field min-w-0 flex-1 px-3 py-2 text-sm"
            />
            <button className="btn px-3 text-xs">添加</button>
          </form>
          <button onClick={openSupport} className="btn-ghost mt-2 w-full py-2 text-xs">
            客服
          </button>
          <div className="mt-2">
            <Flash text={error} tone="err" />
          </div>
        </div>
        <div className="max-h-[40vh] overflow-y-auto lg:max-h-[58vh]">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/chat?c=${c.id}`)}
              className={`block w-full border-t border-line px-4 py-3 text-left ${
                selected === c.id ? "bg-gold/10" : ""
              }`}
            >
              <div className="text-sm">{c.title}</div>
              <div className="truncate text-xs text-muted">{c.lastMessage || "还没有消息"}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[50vh] flex-col">
        <div className="border-b border-line px-5 py-4">
          <div className="font-mono text-sm">{current?.title || "选择对话"}</div>
          <p className="text-xs text-muted">
            {current?.type === "support" ? "管理员 / 兑钱" : "/pay 金额 @用户名"}
          </p>
        </div>
        {current?.type === "dm" && current.otherUsername && (
          <form onSubmit={payFriend} className="grid gap-2 border-b border-line px-5 py-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="付给 TA 的 Ᵽ"
              inputMode="decimal"
              className="field px-3 py-2 font-mono text-sm"
            />
            <input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="备注"
              className="field px-3 py-2 text-sm"
            />
            <button className="btn px-3 text-xs">PAY @{current.otherUsername}</button>
          </form>
        )}
        {current?.type === "support" && role !== "admin" && (
          <form
            onSubmit={requestExchange}
            className="grid gap-2 border-b border-line px-5 py-3 sm:grid-cols-[auto_1fr_120px_auto]"
          >
            <select
              value={exSide}
              onChange={(e) => setExSide(e.target.value as "buy" | "sell")}
              className="field px-3 py-2 text-sm"
            >
              <option value="buy">买入 Ᵽ</option>
              <option value="sell">兑出 Ᵽ</option>
            </select>
            <input
              value={exAmount}
              onChange={(e) => setExAmount(e.target.value)}
              placeholder={exSide === "buy" ? "法币金额" : "PAYME"}
              className="field px-3 py-2 font-mono text-sm"
            />
            <select
              value={exCurrency}
              onChange={(e) => setExCurrency(e.target.value)}
              className="field px-2 py-2 text-sm"
            >
              {SUPPORTED_FIAT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="btn-ghost px-3 text-xs">兑钱</button>
          </form>
        )}
        {role === "admin" && requests.length > 0 && (
          <div className="space-y-2 border-b border-line px-5 py-3">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  @{r.username} {r.side === "buy" ? "买入" : "兑出"} {r.amount}{" "}
                  {r.side === "buy" ? r.currency : "Ᵽ"}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveRequest(r.id, "fill")}
                    className="btn px-2 py-1 text-xs"
                  >
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
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => {
            const mine = m.senderId === me;
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto text-right" : ""}`}>
                <div className="text-[11px] text-muted">@{m.senderUsername}</div>
                <div
                  className={`mt-1 inline-block px-3 py-2 text-sm ${
                    mine ? "bg-gold text-[#0b0e11]" : "bg-paper-2"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
        {selected && (
          <form onSubmit={send} className="flex gap-2 border-t border-line p-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="消息"
              className="field min-w-0 flex-1 px-3 py-2"
            />
            <button className="btn px-4 text-sm">发送</button>
          </form>
        )}
      </section>
    </div>
  );
}
