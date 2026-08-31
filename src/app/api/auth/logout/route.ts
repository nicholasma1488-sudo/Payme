import { clearSession } from "@/lib/auth";

export async function POST() {
  return clearSession();
}
