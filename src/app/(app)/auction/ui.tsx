"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { Flash } from "@/components/Flash";

export function AuctionGrid({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function buy(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/listings/${id}/buy`, { method: "POST" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "付款失败");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-4">
      <Flash text={error} tone="err" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((item) => {
          const cover = item.imagePaths[0];
          return (
            <article key={item.id} className="overflow-hidden rounded-[28px] border border-line bg-paper">
              <div className="aspect-[4/3] bg-paper-2">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${cover}`}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-3xl text-gold/30">
                    Pay Me
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl">{item.title}</h2>
                  <span className="font-mono text-gold">{item.pricePayme} Ᵽ</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
                <p className="text-xs text-muted">
                  @{item.sellerUsername}
                  {item.status === "sold" ? ` · 已被 @${item.buyerUsername} 买走` : ""}
                </p>
                {item.status === "active" ? (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => buy(item.id)}
                    className="w-full rounded-2xl bg-gold py-2 text-sm font-medium text-[#1a1208]"
                  >
                    {busyId === item.id ? "付款中…" : "直接付款"}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-line py-2 text-center text-sm text-muted">已售出</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
