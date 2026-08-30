import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { bookingCountsByDate, listBookings, treasuryStats } from "@/lib/db";
import { nextBookableDate, SLOT_TIMES, upcomingWeekdays } from "@/lib/booking";
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
  return (
    <BookingsAdmin
      date={date}
      dates={upcomingWeekdays(new Date(), 15)}
      slots={[...SLOT_TIMES]}
      bookings={listBookings(date)}
      counts={bookingCountsByDate()}
      treasury={treasuryStats()}
    />
  );
}
