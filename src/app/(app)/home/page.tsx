import { currentUser } from "@/lib/auth";
import { listActivity } from "@/lib/db";
import { getRates } from "@/lib/rates";
import { formatFiat, formatPayme, paymeToFiat } from "@/lib/money";
import { HomeClient } from "./ui";

export default async function HomePage() {
  const user = await currentUser();
  if (!user) return null;
  const [activity, rates] = await Promise.all([Promise.resolve(listActivity(user.id)), getRates()]);
  const fiat = paymeToFiat(user.balancePayme, user.displayCurrency, rates.usd, rates.cnyPerPayme);
  return (
    <HomeClient
      username={user.username || ""}
      balanceLabel={formatPayme(user.balancePayme)}
      fiatLabel={formatFiat(fiat, user.displayCurrency)}
      activity={activity}
    />
  );
}
