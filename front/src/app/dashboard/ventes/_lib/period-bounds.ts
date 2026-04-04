export type SalePeriod = "hour" | "day" | "week" | "month" | "year";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Lundi 00:00:00 (semaine calendaire locale) */
function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekMonday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const x = new Date(start);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfYear(d: Date): Date {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d: Date): Date {
  const x = new Date(d.getFullYear(), 11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

function endOfHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(59, 59, 999);
  return x;
}

/**
 * Bornes inclusives [start, end] pour le filtre affiché (référence : maintenant).
 */
export function getPeriodBounds(
  period: SalePeriod,
  reference: Date = new Date(),
): { start: Date; end: Date } {
  switch (period) {
    case "hour":
      return { start: startOfHour(reference), end: endOfHour(reference) };
    case "day":
      return { start: startOfDay(reference), end: endOfDay(reference) };
    case "week":
      return {
        start: startOfWeekMonday(reference),
        end: endOfWeekMonday(reference),
      };
    case "month":
      return { start: startOfMonth(reference), end: endOfMonth(reference) };
    case "year":
      return { start: startOfYear(reference), end: endOfYear(reference) };
  }
}
