import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listListings } from "@/lib/db";
import { AuctionGrid } from "./ui";

export default async function AuctionPage() {
  const user = await currentUser();
  const listings = listListings();
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-gold">MARKET</p>
          <h1 className="mt-1 text-2xl font-semibold">拍卖</h1>
          <p className="mt-1 text-sm text-muted">拍照上架，PAYME 直接付款。</p>
        </div>
        <Link href="/auction/new" className="btn px-4 py-2 text-sm">
          上架
        </Link>
      </div>
      <AuctionGrid listings={listings} myUsername={user?.username || ""} />
    </div>
  );
}
