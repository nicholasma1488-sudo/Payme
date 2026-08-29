import Link from "next/link";
import { listListings } from "@/lib/db";
import { AuctionGrid } from "./ui";

export default function AuctionPage() {
  const listings = listListings();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-copper">拍照即卖</p>
          <h1 className="mt-2 font-display text-4xl">拍卖场</h1>
          <p className="mt-2 text-muted">拍下手里的东西，朋友用 Pay Me 直接付款。</p>
        </div>
        <Link
          href="/auction/new"
          className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-[#1a1208]"
        >
          上架一件
        </Link>
      </div>
      <AuctionGrid listings={listings} />
    </div>
  );
}
