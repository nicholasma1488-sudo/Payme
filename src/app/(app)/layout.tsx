import { redirect } from "next/navigation";
import { currentUser, publicUser } from "@/lib/auth";
import { userHasPendingBooking } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (!user.username) redirect("/onboard");
  if (!user.firstName || !user.lastName) redirect("/onboard/name");
  const askBook =
    user.role !== "admin" &&
    user.balancePayme <= 0 &&
    !userHasPendingBooking(user.id, user.username);
  return (
    <AppShell user={publicUser(user)} askBook={askBook}>
      {children}
    </AppShell>
  );
}
