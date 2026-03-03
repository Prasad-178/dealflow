import { google } from "googleapis";
import { addDays, format, setHours, setMinutes, isWeekend } from "date-fns";
import { logger } from "@/lib/logger";

const log = logger.create("integrations:calendar");

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) return null;

  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export type AvailableSlot = {
  date: string; // YYYY-MM-DD
  time: string; // "10:00 AM ET"
  available: boolean;
};

const SLOT_HOURS = [10, 14, 16]; // 10AM, 2PM, 4PM ET

export async function getAvailableSlots({
  calendarId,
  startDate,
  durationMinutes = 30,
}: {
  calendarId?: string;
  startDate?: Date;
  durationMinutes?: number;
}): Promise<AvailableSlot[]> {
  const calendar = getCalendarClient();
  const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || "primary";
  const base = startDate || addDays(new Date(), 1);

  // Generate candidate slots for next 5 weekdays
  const candidates: { date: Date; hour: number; label: string }[] = [];
  let day = base;
  let weekdaysFound = 0;

  while (weekdaysFound < 3) {
    if (!isWeekend(day)) {
      for (const hour of SLOT_HOURS) {
        const slotDate = setMinutes(setHours(day, hour), 0);
        const amPm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : hour;
        candidates.push({
          date: slotDate,
          hour,
          label: `${displayHour}:00 ${amPm} ET`,
        });
      }
      weekdaysFound++;
    }
    day = addDays(day, 1);
  }

  if (!calendar) {
    // No Google credentials — return all slots as available (dev fallback)
    return candidates.map((c) => ({
      date: format(c.date, "yyyy-MM-dd"),
      time: c.label,
      available: true,
    }));
  }

  // Query freebusy for real busy windows
  const timeMin = candidates[0].date.toISOString();
  const timeMax = new Date(
    candidates[candidates.length - 1].date.getTime() + durationMinutes * 60000
  ).toISOString();

  try {
    const freebusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: calId }],
      },
    });

    const busyPeriods =
      freebusyResponse.data.calendars?.[calId]?.busy || [];

    return candidates.map((c) => {
      const slotStart = c.date.getTime();
      const slotEnd = slotStart + durationMinutes * 60000;

      const overlaps = busyPeriods.some((busy) => {
        const busyStart = new Date(busy.start!).getTime();
        const busyEnd = new Date(busy.end!).getTime();
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      return {
        date: format(c.date, "yyyy-MM-dd"),
        time: c.label,
        available: !overlaps,
      };
    });
  } catch (error) {
    log.error("Freebusy query failed", { error: String(error) });
    // Fallback: return all as available
    return candidates.map((c) => ({
      date: format(c.date, "yyyy-MM-dd"),
      time: c.label,
      available: true,
    }));
  }
}

export async function createCalendarEvent({
  title,
  startTime,
  endTime,
  attendeeEmails,
}: {
  title: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
}): Promise<{
  eventId: string;
  meetLink?: string;
  htmlLink?: string;
} | null> {
  const calendar = getCalendarClient();
  if (!calendar) {
    log.warn("Google credentials not configured, skipping event creation");
    return null;
  }

  const calId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    const event = await calendar.events.insert({
      calendarId: calId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: title,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        attendees: attendeeEmails?.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `dealflow-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      eventId: event.data.id!,
      meetLink: event.data.hangoutLink || undefined,
      htmlLink: event.data.htmlLink || undefined,
    };
  } catch (error) {
    log.error("Event creation failed", { error: String(error) });
    return null;
  }
}
