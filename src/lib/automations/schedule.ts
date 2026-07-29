import type { SchedulePreset } from '@/lib/types';

/** Interval in minutes for each preset. */
const INTERVAL_MINUTES: Record<SchedulePreset, number> = {
  every_1m: 1,
  every_5m: 5,
  every_10m: 10,
  every_15m: 15,
  every_30m: 30,
  hourly: 60,
  every_2h: 120,
  every_6h: 360,
  every_12h: 720,
  daily: 1440,
  every_night: 1440,
  weekly_monday_9am: 10080,
  custom: 1440,
};

/** Compute next run time from a schedule preset. */
export function computeNextRunAt(
  schedule: SchedulePreset,
  _timezone: string,
  from: Date = new Date(),
): Date {
  // Special cases that anchor to a specific time of day
  if (schedule === 'every_night') {
    const d = new Date(from);
    d.setUTCHours(23, 0, 0, 0);
    if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  if (schedule === 'weekly_monday_9am') {
    const d = new Date(from);
    d.setUTCHours(9, 0, 0, 0);
    const day = d.getUTCDay();
    const daysUntil = (1 - day + 7) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + daysUntil);
    if (d <= from) d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }
  if (schedule === 'daily') {
    const d = new Date(from);
    d.setUTCHours(9, 0, 0, 0);
    if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }

  // Interval-based: simply add minutes
  const mins = INTERVAL_MINUTES[schedule] ?? 1440;
  return new Date(from.getTime() + mins * 60_000);
}

/** Human-readable label for each schedule option. */
export function scheduleLabel(schedule: SchedulePreset): string {
  const labels: Record<SchedulePreset, string> = {
    every_1m: 'Every 1 minute',
    every_5m: 'Every 5 minutes',
    every_10m: 'Every 10 minutes',
    every_15m: 'Every 15 minutes',
    every_30m: 'Every 30 minutes',
    hourly: 'Every hour',
    every_2h: 'Every 2 hours',
    every_6h: 'Every 6 hours',
    every_12h: 'Every 12 hours',
    daily: 'Daily at 9:00 UTC',
    every_night: 'Every night 23:00 UTC',
    weekly_monday_9am: 'Weekly Monday 9:00 UTC',
    custom: 'Custom',
  };
  return labels[schedule] ?? schedule;
}

/** All schedule options for the UI dropdown. */
export const SCHEDULE_OPTIONS: { value: SchedulePreset; label: string }[] = [
  { value: 'every_1m', label: 'Every 1 minute' },
  { value: 'every_5m', label: 'Every 5 minutes' },
  { value: 'every_10m', label: 'Every 10 minutes' },
  { value: 'every_15m', label: 'Every 15 minutes' },
  { value: 'every_30m', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'every_2h', label: 'Every 2 hours' },
  { value: 'every_6h', label: 'Every 6 hours' },
  { value: 'every_12h', label: 'Every 12 hours' },
  { value: 'daily', label: 'Daily (9:00 UTC)' },
  { value: 'every_night', label: 'Every night (23:00 UTC)' },
  { value: 'weekly_monday_9am', label: 'Weekly Monday (9:00 UTC)' },
];
