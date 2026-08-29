"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flash } from "@/components/Flash";
import type { ChatMessage, Conversation } from "@/lib/types";

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

  async function refreshConvos() {
    const res = await fetch("/api/chat/conversations");
    const data = await res.json();
    if (res.ok) setConversations(data.conversations || []);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user?.id || null));
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
    const id = setInterval(load, 2500);
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

  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-[28px] border border-line bg-paper lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-line lg:border-b-0 lg:border-r">
        <div className="p-4">
          <h1 className="font-display text-2xl">聊天</h1>
          <form onSubmit={addPerson} className="mt-3 flex gap-2">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="@用户名"
              className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none"
            />
            <button className="rounded-xl bg-gold px-3 text-xs text-[#1a1208]">添加</button>
          </form>
          <button onClick={openSupport} className="mt-2 w-full rounded-xl border border-gold/30 py-2 text-xs text-gold">
            连接客服
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
          <div className="font-display text-xl">{current?.title || "选一个对话"}</div>
          <p className="text-xs text-muted">
            {current?.type === "support"
              ? "这里直达管理员，可以谈兑换或任何问题。"
              : "用用户名把朋友加进来。"}
          </p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m) => {
            const mine = m.senderId === me;
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto text-right" : ""}`}>
                <div className="text-[11px] text-muted">@{m.senderUsername}</div>
                <div
                  className={`mt-1 inline-block rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-gold text-[#1a1208]" : "bg-paper-2"
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
              placeholder="写消息，也可以谈兑换"
              className="min-w-0 flex-1 rounded-2xl border border-line bg-bg px-4 py-3 outline-none"
            />
            <button className="rounded-2xl bg-gold px-4 text-sm text-[#1a1208]">发送</button>
          </form>
        )}
      </section>
    </div>
  );
}
