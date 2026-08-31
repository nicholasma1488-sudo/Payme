/** Weekday exchange bookings close at 15:30 (Adelaide / 南澳). */
export const BOOKING_TZ = "Australia/Adelaide";
export const CUTOFF_HOUR = 15;
export const CUTOFF_MINUTE = 30;

export const SLOT_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
] as const;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 Sun .. 6 Sat, JS style
  ymd: string;
};

export function zonedParts(at: Date, tz = BOOKING_TZ): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(at)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  return {
    year,
    month,
    day,
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    weekday: weekdayMap[bag.weekday] ?? 0,
    ymd: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function isWeekdayYmd(ymd: string, tz = BOOKING_TZ): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
  const parts = zonedParts(noonUtc, tz);
  return parts.weekday >= 1 && parts.weekday <= 5;
}

export function isBeforeCutoff(at: Date, tz = BOOKING_TZ): boolean {
  const p = zonedParts(at, tz);
  if (p.weekday === 0 || p.weekday === 6) return false;
  return p.hour < CUTOFF_HOUR || (p.hour === CUTOFF_HOUR && p.minute < CUTOFF_MINUTE);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function nextBookableDate(at: Date = new Date(), tz = BOOKING_TZ): string {
  const p = zonedParts(at, tz);
  if (p.weekday >= 1 && p.weekday <= 5 && isBeforeCutoff(at, tz)) {
    return p.ymd;
  }
  let ymd = addDaysYmd(p.ymd, 1);
  for (let i = 0; i < 8; i++) {
    if (isWeekdayYmd(ymd, tz)) return ymd;
    ymd = addDaysYmd(ymd, 1);
  }
  return ymd;
}

export function canBookDate(ymd: string, at: Date = new Date(), tz = BOOKING_TZ): boolean {
  if (!isWeekdayYmd(ymd, tz)) return false;
  const today = zonedParts(at, tz).ymd;
  if (ymd < today) return false;
  if (ymd === today) return isBeforeCutoff(at, tz);
  return true;
}

export function isValidSlot(time: string): boolean {
  return (SLOT_TIMES as readonly string[]).includes(time);
}

export function upcomingWeekdays(at: Date = new Date(), count = 10, tz = BOOKING_TZ): string[] {
  const start = nextBookableDate(at, tz);
  const out: string[] = [];
  let ymd = start;
  while (out.length < count) {
    if (isWeekdayYmd(ymd, tz) && canBookDate(ymd, at, tz)) out.push(ymd);
    ymd = addDaysYmd(ymd, 1);
  }
  return out;
}

export function isSlotPast(ymd: string, time: string, at: Date = new Date(), tz = BOOKING_TZ): boolean {
  const today = zonedParts(at, tz).ymd;
  if (ymd > today) return false;
  if (ymd < today) return true;
  const [hh, mm] = time.split(":").map(Number);
  const p = zonedParts(at, tz);
  return p.hour > hh || (p.hour === hh && p.minute >= mm);
}

export function availableSlots(
  ymd: string,
  taken: string[],
  at: Date = new Date(),
  tz = BOOKING_TZ,
): string[] {
  if (!canBookDate(ymd, at, tz)) return [];
  const busy = new Set(taken);
  return SLOT_TIMES.filter((t) => !busy.has(t) && !isSlotPast(ymd, t, at, tz));
}

export function nextOpenSlot(
  takenByDate: Record<string, string[]>,
  at: Date = new Date(),
  tz = BOOKING_TZ,
): { date: string; time: string } | null {
  for (const date of upcomingWeekdays(at, 15, tz)) {
    const open = availableSlots(date, takenByDate[date] || [], at, tz);
    if (open[0]) return { date, time: open[0] };
  }
  return null;
}
