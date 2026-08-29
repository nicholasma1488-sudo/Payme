import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/auth";
import { listActivity } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ activity: listActivity(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}
