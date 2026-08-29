import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { createListing, listListings } from "@/lib/db";

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ listings: listListings() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      pricePayme?: number;
      imagePaths?: string[];
    };
    const title = (body.title || "").trim();
    const description = (body.description || "").trim();
    const price = Number(body.pricePayme);
    if (title.length < 2) throw new Error("给商品起个名字");
    if (!Number.isFinite(price) || price <= 0) throw new Error("价格必须大于 0");
    const listing = createListing({
      sellerId: user.id,
      title: title.slice(0, 80),
      description: description.slice(0, 800),
      pricePayme: price,
      imagePaths: Array.isArray(body.imagePaths) ? body.imagePaths.slice(0, 6) : [],
    });
    return NextResponse.json({ listing });
  } catch (error) {
    return jsonError(error);
  }
}
