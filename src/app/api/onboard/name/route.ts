import { NextRequest, NextResponse } from "next/server";
import { jsonError, publicUser, requireUser } from "@/lib/auth";
import { setLegalName } from "@/lib/db";
import { cleanLegalName } from "@/lib/names";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.username) {
      throw Object.assign(new Error("先设置用户名"), { status: 400 });
    }
    const { firstName, lastName } = (await req.json()) as {
      firstName?: string;
      lastName?: string;
    };
    const first = cleanLegalName(firstName || "", "First name");
    const last = cleanLegalName(lastName || "", "Last name");
    const updated = setLegalName(user.id, first, last);
    return NextResponse.json({ user: publicUser(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
