import type { Json } from "@/integrations/supabase/types";

/**
 * Stored in `appointments.notification_settings`.
 * A future worker (cron / Edge Function) can read this JSON and schedule push/email/Google Calendar actions.
 */
export type ReminderOffsetUnit = "minutes" | "hours" | "days" | "weeks";

export type AppointmentReminderRule = {
  id: string;
  offsetValue: number;
  offsetUnit: ReminderOffsetUnit;
  channels: { push: boolean; email: boolean };
};

export type AppointmentNotificationSettingsV1 = {
  version: 1;
  notifyAssignedReps: boolean;
  additionalUserIds: string[];
  additionalEmails: string[];
  reminders: AppointmentReminderRule[];
  integrations: { googleCalendar: "off" | "desired" };
};

const DEFAULT_SETTINGS: AppointmentNotificationSettingsV1 = {
  version: 1,
  notifyAssignedReps: true,
  additionalUserIds: [],
  additionalEmails: [],
  reminders: [],
  integrations: { googleCalendar: "off" },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseAppointmentNotificationSettings(raw: Json | null | undefined): AppointmentNotificationSettingsV1 {
  if (!isRecord(raw) || raw.version !== 1) {
    return { ...DEFAULT_SETTINGS };
  }
  const notifyAssignedReps = raw.notifyAssignedReps === false ? false : true;
  const additionalUserIds = Array.isArray(raw.additionalUserIds)
    ? raw.additionalUserIds.filter((x): x is string => typeof x === "string")
    : [];
  const additionalEmails = Array.isArray(raw.additionalEmails)
    ? raw.additionalEmails.filter((x): x is string => typeof x === "string")
    : [];
  const units: ReminderOffsetUnit[] = ["minutes", "hours", "days", "weeks"];
  const reminders: AppointmentReminderRule[] = Array.isArray(raw.reminders)
    ? raw.reminders
        .map((r): AppointmentReminderRule | null => {
          if (!isRecord(r)) return null;
          const id = typeof r.id === "string" ? r.id : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const offsetValue = typeof r.offsetValue === "number" && Number.isFinite(r.offsetValue) ? r.offsetValue : 0;
          const offsetUnit = units.includes(r.offsetUnit as ReminderOffsetUnit)
            ? (r.offsetUnit as ReminderOffsetUnit)
            : "hours";
          const ch = isRecord(r.channels) ? r.channels : {};
          return {
            id,
            offsetValue,
            offsetUnit,
            channels: { push: ch.push === true, email: ch.email === true },
          };
        })
        .filter((x): x is AppointmentReminderRule => x !== null)
    : [];
  const integ = isRecord(raw.integrations) ? raw.integrations : {};
  const googleCalendar = integ.googleCalendar === "desired" ? "desired" : "off";
  return {
    version: 1,
    notifyAssignedReps,
    additionalUserIds,
    additionalEmails,
    reminders,
    integrations: { googleCalendar },
  };
}

export function toNotificationSettingsJson(settings: AppointmentNotificationSettingsV1): Json {
  return settings as unknown as Json;
}

export function defaultNotificationSettings(): AppointmentNotificationSettingsV1 {
  return {
    ...DEFAULT_SETTINGS,
    reminders: [],
    additionalUserIds: [],
    additionalEmails: [],
  };
}

export function newReminderRow(): AppointmentReminderRule {
  return {
    id: crypto.randomUUID(),
    offsetValue: 1,
    offsetUnit: "hours",
    channels: { push: true, email: false },
  };
}
