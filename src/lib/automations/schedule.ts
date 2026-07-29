import type { SchedulePreset } from '@/lib/types';

/** Compute next run time from a schedule preset (UTC-based for v1). */
export function computeNextRunAt(
  schedule: SchedulePreset,
  _timezone: string,
  from: Date = new Date(),
): Date {
  const d = new Date(from.getTime());
  switch (schedule) {
    case 'hourly':
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      return d;
    case 'every_night': {
      d.setUTCHours(23, 0, 0, 0);
      if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
      return d;
    }
    case 'weekly_monday_9am': {
      d.setUTCHours(9, 0, 0, 0);
      const day = d.getUTCDay();
      const daysUntil = (1 - day + 7) % 7 || 7;
      d.setUTCDate(d.getUTCDate() + daysUntil);
      if (d <= from) d.setUTCDate(d.getUTCDate() + 7);
      return d;
    }
    case 'daily':
    case 'custom':
    default: {
      d.setUTCHours(9, 0, 0, 0);
      if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
      return d;
    }
  }
}

export function scheduleLabel(schedule: SchedulePreset): string {
  const labels: Record<SchedulePreset, string> = {
    daily: 'Daily at 9:00 UTC',
    weekly_monday_9am: 'Weekly Monday 9:00 UTC',
    every_night: 'Every night 23:00 UTC',
    hourly: 'Every hour',
    custom: 'Custom',
  };
  return labels[schedule];
}
