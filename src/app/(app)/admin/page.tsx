import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listAllTransactions, listExchangeRequests, listUsers, treasuryStats } from "@/lib/db";
import { AdminClient } from "./ui";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/home");
  return (
    <AdminClient
      treasury={treasuryStats()}
      users={listUsers()}
      transactions={listAllTransactions(40)}
      requests={listExchangeRequests({ status: "pending" })}
    />
  );
}
