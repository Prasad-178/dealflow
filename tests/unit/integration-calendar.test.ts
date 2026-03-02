import { describe, it, expect, vi } from "vitest";
import { getAvailableSlots } from "@/lib/integrations/calendar";

describe("Calendar Integration", () => {
  describe("getAvailableSlots", () => {
    it("generates slots for 3 weekdays with 3 time slots each", async () => {
      // Without Google credentials, should return all-available fallback slots
      const slots = await getAvailableSlots({
        startDate: new Date("2026-03-04"), // Wednesday
      });

      // 3 weekdays × 3 slots = 9
      expect(slots).toHaveLength(9);
      expect(slots.every((s) => s.available)).toBe(true);
    });

    it("generates correct time labels", async () => {
      const slots = await getAvailableSlots({
        startDate: new Date("2026-03-04"), // Wednesday
      });

      const times = slots.filter((s) => s.date === "2026-03-04").map((s) => s.time);
      expect(times).toEqual(["10:00 AM ET", "2:00 PM ET", "4:00 PM ET"]);
    });

    it("skips weekends", async () => {
      const slots = await getAvailableSlots({
        startDate: new Date("2026-03-06"), // Friday
      });

      const dates = [...new Set(slots.map((s) => s.date))];
      for (const date of dates) {
        const dayOfWeek = new Date(date).getDay();
        expect(dayOfWeek).not.toBe(0); // Sunday
        expect(dayOfWeek).not.toBe(6); // Saturday
      }
    });

    it("returns YYYY-MM-DD date format", async () => {
      const slots = await getAvailableSlots({
        startDate: new Date("2026-03-04"),
      });

      for (const slot of slots) {
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("defaults to tomorrow when no startDate given", async () => {
      const slots = await getAvailableSlots({});

      expect(slots.length).toBeGreaterThan(0);
      expect(slots.every((s) => s.available)).toBe(true);
    });

    it("handles Saturday start — first slots are on Monday", async () => {
      const slots = await getAvailableSlots({
        startDate: new Date("2026-03-07"), // Saturday
      });

      const firstDate = slots[0].date;
      const dayOfWeek = new Date(firstDate).getDay();
      expect(dayOfWeek).toBe(1); // Monday
    });
  });
});
