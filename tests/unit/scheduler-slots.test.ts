import { describe, it, expect } from "vitest";
import { generateAvailableSlots } from "@/lib/agents/scheduler";

describe("Scheduler Agent - Slot Generation", () => {
  describe("generateAvailableSlots", () => {
    it("generates slots for 3 consecutive weekdays", () => {
      // Wednesday 2026-03-04
      const baseDate = new Date("2026-03-04");
      const slots = generateAvailableSlots(baseDate);

      // Wed, Thu, Fri — 3 days × 3 slots = 9 slots
      expect(slots).toHaveLength(9);
    });

    it("generates 3 time slots per day (10 AM, 2 PM, 4 PM)", () => {
      const baseDate = new Date("2026-03-04"); // Wednesday
      const slots = generateAvailableSlots(baseDate);

      const day1Slots = slots.filter((s) => s.date === "2026-03-04");
      expect(day1Slots).toHaveLength(3);
      expect(day1Slots.map((s) => s.time)).toEqual([
        "10:00 AM ET",
        "2:00 PM ET",
        "4:00 PM ET",
      ]);
    });

    it("marks day 2 4:00 PM slot as unavailable", () => {
      const baseDate = new Date("2026-03-04"); // Wednesday
      const slots = generateAvailableSlots(baseDate);

      // Day 2 = Thursday 2026-03-05
      const day2_4pm = slots.find(
        (s) => s.date === "2026-03-05" && s.time === "4:00 PM ET"
      );
      expect(day2_4pm).toBeTruthy();
      expect(day2_4pm!.available).toBe(false);
    });

    it("marks day 1 and day 3 4:00 PM as available", () => {
      const baseDate = new Date("2026-03-04"); // Wednesday
      const slots = generateAvailableSlots(baseDate);

      const day1_4pm = slots.find(
        (s) => s.date === "2026-03-04" && s.time === "4:00 PM ET"
      );
      const day3_4pm = slots.find(
        (s) => s.date === "2026-03-06" && s.time === "4:00 PM ET"
      );
      expect(day1_4pm!.available).toBe(true);
      expect(day3_4pm!.available).toBe(true);
    });

    it("skips Saturday (day 0 = Saturday)", () => {
      // Saturday 2026-03-07
      const baseDate = new Date("2026-03-07");
      const slots = generateAvailableSlots(baseDate);

      // Sat skipped, Sun skipped, Mon included = only 1 day
      const dates = [...new Set(slots.map((s) => s.date))];
      expect(dates.every((d) => {
        const day = new Date(d).getDay();
        return day !== 0 && day !== 6;
      })).toBe(true);
    });

    it("skips Sunday (day 0 = Sunday)", () => {
      // Sunday 2026-03-08
      const baseDate = new Date("2026-03-08");
      const slots = generateAvailableSlots(baseDate);

      const dates = [...new Set(slots.map((s) => s.date))];
      expect(dates.every((d) => {
        const day = new Date(d).getDay();
        return day !== 0 && day !== 6;
      })).toBe(true);
    });

    it("handles Friday start — skips weekend, includes Monday only from 3-day window", () => {
      // Friday 2026-03-06
      const baseDate = new Date("2026-03-06");
      const slots = generateAvailableSlots(baseDate);

      // i=0: Fri (weekday), i=1: Sat (skip), i=2: Sun (skip)
      // Only Friday generates slots
      const dates = [...new Set(slots.map((s) => s.date))];
      expect(dates).toHaveLength(1);
      expect(new Date(dates[0]).getDay()).toBe(5); // Friday
    });

    it("returns correct date format (yyyy-MM-dd)", () => {
      const baseDate = new Date("2026-03-04");
      const slots = generateAvailableSlots(baseDate);

      for (const slot of slots) {
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });
});
