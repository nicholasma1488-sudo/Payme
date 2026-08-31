import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { bookingCountsByDate, listBookings, listTakenByDate, treasuryStats } from "@/lib/db";
import { nextBookableDate, SLOT_TIMES, upcomingWeekdays } from "@/lib/booking";
import { quoteExchange } from "@/lib/exchange";
import { BookingsAdmin } from "./ui";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "admin") redirect("/home");
  const q = await searchParams;
  const date = q.date || nextBookableDate();
  const bookings = listBookings(date);
  const quotes: Record<
    string,
    { payme: number; cny: number; officialCny: number; offset: number; clamped: boolean; maxOffset: number }
  > = {};
  for (const booking of bookings) {
    try {
      quotes[booking.id] = await quoteExchange({
        side: booking.side,
        amount: booking.amount,
        currency: booking.currency,
      });
    } catch {
      // 报价失败时仍显示预约本身
    }
  }
  return (
    <BookingsAdmin
      date={date}
      dates={upcomingWeekdays(new Date(), 15)}
      slots={[...SLOT_TIMES]}
      bookings={bookings}
      quotes={quotes}
      takenByDate={listTakenByDate()}
      counts={bookingCountsByDate()}
      treasury={treasuryStats()}
    />
  );
}
