import { currentUser } from "@/lib/auth";
import { listActivity, listContacts } from "@/lib/db";
import { getRates } from "@/lib/rates";
import { formatFiat, formatPayme, paymeToFiat } from "@/lib/money";
import { HomeClient } from "./ui";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) return null;
  const [activity, rates, contacts] = await Promise.all([
    Promise.resolve(listActivity(user.id)),
    getRates(),
    Promise.resolve(listContacts(user.id)),
  ]);
  const fiat = paymeToFiat(user.balancePayme, user.displayCurrency, rates.usd, rates.cnyPerPayme);
  return (
    <HomeClient
      username={user.username || ""}
      balanceLabel={formatPayme(user.balancePayme)}
      fiatLabel={formatFiat(fiat, user.displayCurrency)}
      activity={activity}
      contacts={contacts.map((c) => ({
        username: c.username || "",
        displayName: c.displayName,
      }))}
    />
  );
}
