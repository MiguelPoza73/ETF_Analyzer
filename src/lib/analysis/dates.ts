const MS_PER_DAY = 86_400_000;

/** Days since the Unix epoch (UTC) for a date. */
export function toEpochDay(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

/** ISO date (YYYY-MM-DD) for a number of days since the Unix epoch. */
export function epochDayToISO(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** A sortable month index (year * 12 + month) for an epoch day. */
export function monthIndex(day: number): number {
  const date = new Date(day * MS_PER_DAY);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export function yearsBetween(firstDay: number, lastDay: number): number {
  return (lastDay - firstDay) / 365.25;
}
