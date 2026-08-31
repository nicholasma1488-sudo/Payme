import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  availableSlots,
  canBookDate,
  isBeforeCutoff,
  isSlotPast,
  nextBookableDate,
  nextOpenSlot,
  zonedParts,
} from "./booking";

function atAdelaide(isoLocal: string): Date {
  // isoLocal like 2026-08-31T10:00 — interpret as Adelaide wall clock via offset guess
  // Use a known UTC instant by formatting reverse: pick UTC and check zonedParts.
  const [date, time] = isoLocal.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  for (let offsetMin = 480; offsetMin <= 690; offsetMin += 30) {
    const utc = Date.UTC(y, m - 1, d, 0, 0) - offsetMin * 60_000 + (hh * 60 + mm) * 60_000;
    const dt = new Date(utc);
    const p = zonedParts(dt);
    if (p.ymd === date && p.hour === hh && p.minute === mm) return dt;
  }
  throw new Error(`cannot map ${isoLocal}`);
}

describe("booking cutoff", () => {
  it("Monday 10:00 is open, bookable today", () => {
    const mon = atAdelaide("2026-08-31T10:00");
    assert.equal(zonedParts(mon).weekday, 1);
    assert.equal(isBeforeCutoff(mon), true);
    assert.equal(nextBookableDate(mon), "2026-08-31");
    assert.equal(canBookDate("2026-08-31", mon), true);
  });

  it("weekday 15:30 is closed, rolls to next weekday", () => {
    const cut = atAdelaide("2026-08-31T15:30");
    assert.equal(isBeforeCutoff(cut), false);
    assert.equal(nextBookableDate(cut), "2026-09-01");
    assert.equal(canBookDate("2026-08-31", cut), false);
  });

  it("Friday after cutoff rolls to Monday", () => {
    const fri = atAdelaide("2026-09-04T16:00");
    assert.equal(zonedParts(fri).weekday, 5);
    assert.equal(nextBookableDate(fri), "2026-09-07");
  });

  it("Saturday rolls to Monday", () => {
    const sat = atAdelaide("2026-09-05T11:00");
    assert.equal(zonedParts(sat).weekday, 6);
    assert.equal(nextBookableDate(sat), "2026-09-07");
  });
});

describe("exclusive slots", () => {
  it("hides past and taken times on the same weekday", () => {
    const mon = atAdelaide("2026-08-31T10:00");
    assert.equal(isSlotPast("2026-08-31", "09:30", mon), true);
    assert.equal(isSlotPast("2026-08-31", "10:00", mon), true);
    assert.equal(isSlotPast("2026-08-31", "10:30", mon), false);
    const open = availableSlots("2026-08-31", ["10:30", "11:00"], mon);
    assert.equal(open.includes("10:30"), false);
    assert.equal(open.includes("11:00"), false);
    assert.equal(open[0], "11:30");
  });

  it("rolls to tomorrow when the day is full", () => {
    const mon = atAdelaide("2026-08-31T10:00");
    const taken = {
      "2026-08-31": [
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
      ],
    };
    const next = nextOpenSlot(taken, mon);
    assert.deepEqual(next, { date: "2026-09-01", time: "09:00" });
  });
});
