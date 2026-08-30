"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import { Flash } from "@/components/Flash";

export function AuctionGrid({
  listings,
  myUsername,
}: {
  listings: Listing[];
  myUsername: string;
}) {
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
    <div className="mt-5 space-y-3">
      <Flash text={error} tone="err" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((item) => {
          const cover = item.imagePaths[0];
          return (
            <article key={item.id} className="panel overflow-hidden">
              <div className="aspect-[4/3] bg-paper-2">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${cover}`}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-mono text-2xl text-gold/30">
                    PAYME
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-medium">{item.title}</h2>
                  <span className="font-mono text-moss">{item.pricePayme} Ᵽ</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
                <p className="font-mono text-[11px] text-muted">
                  @{item.sellerUsername}
                  {item.status === "sold" ? ` · @${item.buyerUsername}` : ""}
                </p>
                {item.status === "sold" ? (
                  <div className="border border-line py-2 text-center font-mono text-xs text-muted">SOLD</div>
                ) : item.sellerUsername === myUsername ? (
                  <div className="border border-line py-2 text-center font-mono text-xs text-muted">YOURS</div>
                ) : (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => buy(item.id)}
                    className="btn w-full py-2 text-sm"
                  >
                    {busyId === item.id ? "..." : "PAY"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
