import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { buyListing } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const listing = buyListing(id, user.id);
    return NextResponse.json({ listing, message: `已支付 ${listing.pricePayme} Ᵽ` });
  } catch (error) {
    return jsonError(error);
  }
}
