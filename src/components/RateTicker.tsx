"use client";

import { useEffect, useState } from "react";

type Pair = { code: string; paymePerUnit: number; fiatPerPayme: number };

export function RateTicker() {
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/rates");
      if (!res.ok) return;
      const data = await res.json();
      if (alive) setPairs(data.ticker || []);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!pairs.length) return null;
  const loop = [...pairs, ...pairs];

  return (
    <div className="overflow-hidden border-y border-line bg-paper/70">
      <div className="ticker flex w-max gap-8 py-2 font-mono text-[11px] tracking-wide text-muted">
        {loop.map((p, i) => (
          <span key={`${p.code}-${i}`} className="flex items-center gap-2">
            <span className="text-gold">{p.code}</span>
            <span>1 = {p.paymePerUnit.toFixed(4)} Ᵽ</span>
            <span className="text-ink/40">·</span>
            <span>1 Ᵽ = {p.fiatPerPayme.toFixed(2)} {p.code}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
