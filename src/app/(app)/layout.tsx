import { redirect } from "next/navigation";
import { currentUser, publicUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!user.username) redirect("/onboard");
  if (!user.firstName || !user.lastName) redirect("/onboard/name");
  return <AppShell user={publicUser(user)}>{children}</AppShell>;
}
