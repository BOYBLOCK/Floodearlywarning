// Outlook logic for Oluyole FloodWatch.
// Pure functions only (no React) so they are easy to test.
//
// Thresholds come from the project's own analysis:
//   HEAVY_MM  - extreme rainfall day (>= 50 mm/day, Chapter 3 definition)
//   FLOOD_MM  - lowest flood-risk trigger (Low risk, 62.06)
//
// HISTORY is computed from the NASA POWER IMERG daily series for Oluyole
// (7.35 N, 3.89 E), 01 Jan 2009 - 12 Jul 2024.

export const HEAVY_MM = 50;
export const FLOOD_MM = 62.06;

export type DayRain = {
  date: string; // YYYY-MM-DD (Africa/Lagos)
  rain: number; // forecast daily total, mm
  max: number;
  min: number;
};

export type Tone = "dry" | "light" | "moderate" | "substantial" | "heavy";

export type RainBand = { label: string; tone: Tone };

/** Label a day from its forecast rainfall (replaces the weather-code label). */
export function rainBand(mm: number): RainBand {
  if (mm < 1) return { label: "Dry", tone: "dry" };
  if (mm < 10) return { label: "Light rain", tone: "light" };
  if (mm < 25) return { label: "Moderate rain", tone: "moderate" };
  if (mm < HEAVY_MM) return { label: "Substantial rain", tone: "substantial" };
  return { label: "Heavy rain", tone: "heavy" };
}

export const HISTORY = {
  period: "2009–2024",
  // Days with >= 50 mm, Jan..Dec
  heavyByMonth: [0, 0, 1, 2, 2, 6, 3, 5, 8, 3, 0, 0],
  // Days with >= 62.06 mm, Jan..Dec
  floodByMonth: [0, 0, 1, 0, 1, 3, 0, 1, 3, 0, 0, 0],
  yearsWithHeavy: 13,
  yearsTotal: 15, // complete years 2009-2023
  earliestHeavy: { month: 3, day: 2 }, // 2 March (2017)
  typicalFirstHeavy: { month: 6, day: 10 }, // median first heavy day
  latestHeavy: { month: 10, day: 31 }, // 31 October (2018)
  // No day >= 50 mm was recorded in these months.
  dryMonths: [11, 12, 1, 2],
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type YMD = { y: number; m: number; d: number }; // m is 1-12

export function parseYMD(date: string): YMD {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function utc(y: number, m: number, d: number) {
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  const a = parseYMD(from);
  const b = parseYMD(to);
  return Math.round((utc(b.y, b.m, b.d) - utc(a.y, a.m, a.d)) / 86400000);
}

export type NextEvents = {
  heavy: DayRain | null; // first day >= HEAVY_MM
  flood: DayRain | null; // first day >= FLOOD_MM
};

/** Scan the whole forecast for the first heavy-rain and flood-risk days. */
export function findNextEvents(days: DayRain[]): NextEvents {
  return {
    heavy: days.find((d) => d.rain >= HEAVY_MM) ?? null,
    flood: days.find((d) => d.rain >= FLOOD_MM) ?? null,
  };
}

export type Season = {
  inDrySeason: boolean;
  monthName: string;
  heavyDaysThisMonth: number;
  floodDaysThisMonth: number;
  // Only set in the dry season (Nov-Feb):
  daysToSeasonOpening: number | null; // to 1 March
  daysToTypicalFirstHeavy: number | null; // to ~10 June
};

function daysUntilNext(today: YMD, month: number, day: number): number {
  let target = utc(today.y, month, day);
  const now = utc(today.y, today.m, today.d);
  if (target < now) target = utc(today.y + 1, month, day);
  return Math.round((target - now) / 86400000);
}

/** Seasonal expectation from the 2009-2024 record. Not a prediction. */
export function seasonalOutlook(todayStr: string): Season {
  const today = parseYMD(todayStr);
  const inDrySeason = HISTORY.dryMonths.includes(today.m);
  return {
    inDrySeason,
    monthName: MONTH_NAMES[today.m - 1],
    heavyDaysThisMonth: HISTORY.heavyByMonth[today.m - 1],
    floodDaysThisMonth: HISTORY.floodByMonth[today.m - 1],
    daysToSeasonOpening: inDrySeason ? daysUntilNext(today, 3, 1) : null,
    daysToTypicalFirstHeavy: inDrySeason
      ? daysUntilNext(
          today,
          HISTORY.typicalFirstHeavy.month,
          HISTORY.typicalFirstHeavy.day,
        )
      : null,
  };
}

export function formatDay(date: string): string {
  const { y, m, d } = parseYMD(date);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function shortWeekday(date: string): string {
  const { y, m, d } = parseYMD(date);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function daysAwayText(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  return `in ${n} days`;
}
