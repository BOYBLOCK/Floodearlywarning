import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Assessment } from "./utils/floodAssessment";
import { calculateFloodAssessment } from "./utils/floodAssessment";
import type { DayRain, Tone } from "./outlookLogic";
import {
  FLOOD_MM,
  HEAVY_MM,
  HISTORY,
  daysAwayText,
  daysBetween,
  findNextEvents,
  formatDay,
  rainBand,
  seasonalOutlook,
  shortWeekday,
} from "./outlookLogic";

const FORECAST_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=7.35&longitude=3.89" +
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum" +
  "&forecast_days=16&timezone=Africa%2FLagos";

const REFRESH_MS = 3 * 60 * 60 * 1000; // refresh every 3 hours
const MIN_FOCUS_REFRESH_MS = 30 * 60 * 1000; // and when the tab is revisited

type LoadStatus = "loading" | "ready" | "error";

const toneStyles: Record<Tone, string> = {
  dry: "bg-emerald-50 text-emerald-700",
  watch: "bg-amber-100 text-amber-800",
  heavy: "bg-red-100 text-red-700",
};

const levelStyles: Record<string, string> = {
  normal: "text-emerald-700",
  low: "text-amber-700",
  moderate: "text-orange-700",
  high: "text-red-700",
};

function lagosToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

// Classify a forecast daily total with the same server / fallback model the
// form above uses, so the thresholds stay in one place.
async function classify(rain: number): Promise<Assessment | null> {
  const body = { intensity: String(rain) };
  try {
    const response = await fetch("/api/assess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const isJson = (response.headers.get("content-type") || "").includes(
      "application/json",
    );
    if (isJson) {
      const data = await response.json();
      if (response.ok && typeof data.label === "string") {
        return data as Assessment;
      }
    }
  } catch {
    // fall through to the client-side model
  }
  try {
    return calculateFloodAssessment(body);
  } catch {
    return null;
  }
}

function Icon({
  children,
  className = "size-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export default function FloodOutlook() {
  const [days, setDays] = useState<DayRain[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const lastLoad = useRef(0);

  // Fetch the 16-day forecast now, every 3 hours, and when the tab is revisited.
  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timer = window.setTimeout(() => current.abort(), 10000);
      try {
        const response = await fetch(FORECAST_URL, { signal: current.signal });
        if (!response.ok) throw new Error("Forecast unavailable");
        const data = await response.json();
        const daily = data?.daily;
        if (
          !daily ||
          !Array.isArray(daily.time) ||
          !Array.isArray(daily.precipitation_sum)
        ) {
          throw new Error("Unexpected forecast format");
        }
        const parsed: DayRain[] = daily.time.map((date: string, i: number) => ({
          date,
          rain: Number(daily.precipitation_sum[i] ?? 0),
          max: Number(daily.temperature_2m_max?.[i] ?? 0),
          min: Number(daily.temperature_2m_min?.[i] ?? 0),
        }));
        if (cancelled) return;
        lastLoad.current = Date.now();
        setDays(parsed);
        setUpdatedAt(new Date());
        setStatus("ready");
      } catch {
        // Keep showing the last good forecast if a refresh fails.
        if (!cancelled) setStatus((prev) => (prev === "ready" ? "ready" : "error"));
      } finally {
        window.clearTimeout(timer);
      }
    }

    load();
    const interval = window.setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastLoad.current > MIN_FOCUS_REFRESH_MS
      ) {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const todayStr = days.length > 0 ? days[0].date : lagosToday();
  const events = findNextEvents(days);
  const season = seasonalOutlook(todayStr);
  const week = days.slice(0, 7);
  const floodDate = events.flood?.date;
  const floodRain = events.flood?.rain;

  // Classify the first flood-risk day with the project's model.
  useEffect(() => {
    if (floodRain === undefined) {
      setAssessment(null);
      return;
    }
    let cancelled = false;
    classify(floodRain).then((result) => {
      if (!cancelled) setAssessment(result);
    });
    return () => {
      cancelled = true;
    };
  }, [floodDate, floodRain]);

  // Headline state for the "next heavy rain / flood" card.
  type Card = {
    box: string;
    dot: string;
    title: string;
    text: string;
  };
  let card: Card;
  if (status !== "ready") {
    card =
      status === "loading"
        ? {
            box: "border-slate-200 bg-slate-50",
            dot: "bg-slate-400",
            title: "Checking the forecast…",
            text: "Looking ahead 16 days for heavy or flood-level rainfall.",
          }
        : {
            box: "border-slate-200 bg-slate-50",
            dot: "bg-slate-400",
            title: "Forecast unavailable right now",
            text: "The live forecast could not be loaded. The seasonal outlook below still applies.",
          };
  } else if (events.flood) {
    const away = daysBetween(todayStr, events.flood.date);
    card = {
      box: "border-red-200 bg-red-50",
      dot: "bg-red-500",
      title: `Flood-risk rainfall forecast ${daysAwayText(away)}`,
      text: `${formatDay(events.flood.date)}: about ${events.flood.rain.toFixed(1)} mm expected, at or above the ${FLOOD_MM} mm trigger.`,
    };
  } else if (events.heavy) {
    const away = daysBetween(todayStr, events.heavy.date);
    card = {
      box: "border-amber-200 bg-amber-50",
      dot: "bg-amber-400",
      title: `Heavy rainfall forecast ${daysAwayText(away)}`,
      text: `${formatDay(events.heavy.date)}: about ${events.heavy.rain.toFixed(1)} mm expected (${HEAVY_MM} mm or more). Below the flood-risk trigger of ${FLOOD_MM} mm.`,
    };
  } else {
    card = {
      box: "border-emerald-200 bg-emerald-50",
      dot: "bg-emerald-500",
      title: "No heavy rainfall or flood sign in the next 16 days",
      text: `No day is forecast to reach ${HEAVY_MM} mm. Forecast totals are well below the ${FLOOD_MM} mm flood-risk trigger.`,
    };
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <Icon>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </Icon>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Flood outlook
            </h2>
            <p className="text-xs text-slate-500">
              When to expect the next heavy rain or flood in Oluyole
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 sm:self-auto">
          <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
          Updates automatically
        </span>
      </div>

      {/* Next heavy rain / flood */}
      <div className={`mt-6 rounded-2xl border p-5 ${card.box}`}>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Next heavy rain / flood
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className={`mt-2 size-3 shrink-0 rounded-full ${card.dot}`} />
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {card.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{card.text}</p>
          </div>
        </div>

        {status === "ready" && events.flood && assessment && (
          <div className="mt-4 rounded-xl bg-white/70 p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Model assessment for that day
            </p>
            <p
              className={`mt-1 text-base font-bold ${levelStyles[assessment.level] ?? "text-slate-800"}`}
            >
              {assessment.label}
            </p>
            <p className="mt-1 leading-6 text-slate-600">{assessment.summary}</p>
          </div>
        )}
      </div>

      {/* Seasonal expectation from the 2009-2024 record */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          Seasonal outlook
        </p>
        {season.inDrySeason ? (
          <>
            <h3 className="mt-2 font-bold text-slate-900">
              Dry season: no heavy rainfall or flood sign expected
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              Between November and February no day reached {HEAVY_MM} mm in the{" "}
              {HISTORY.period} record. The rainy season builds from March: the
              earliest heavy-rain day on record was 2 March, and the first heavy
              day usually comes around 10 June.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3">
                <p className="text-lg font-bold text-slate-900">
                  ~{season.daysToSeasonOpening} days
                </p>
                <p className="text-[11px] text-slate-400">
                  until the rainy season opens (1 March)
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-lg font-bold text-slate-900">
                  ~{season.daysToTypicalFirstHeavy} days
                </p>
                <p className="text-[11px] text-slate-400">
                  until the typical first heavy-rain day (about 10 June)
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-2 font-bold text-slate-900">
              Rainy season: heavy rain is possible
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              In {season.monthName}, {season.heavyDaysThisMonth} heavy-rain day
              {season.heavyDaysThisMonth === 1 ? "" : "s"} ({HEAVY_MM} mm or
              more) and {season.floodDaysThisMonth} flood-risk day
              {season.floodDaysThisMonth === 1 ? "" : "s"} ({FLOOD_MM} mm or
              more) were recorded across {HISTORY.period}. Heavy rain occurred
              in {HISTORY.yearsWithHeavy} of {HISTORY.yearsTotal} complete
              years, mostly from June to September.
            </p>
          </>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Seasonal figures are historical expectations from NASA POWER daily
          rainfall, not a forecast of a specific date.
        </p>
      </div>

      {/* Next 7 days */}
      <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
        Next 7 days
      </h3>
      {week.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {week.map((day, i) => {
            const band = rainBand(day.rain);
            return (
              <div
                key={day.date}
                className="rounded-2xl bg-slate-50 p-3 text-center"
              >
                <p className="text-xs font-bold text-slate-500">
                  {i === 0 ? "Today" : shortWeekday(day.date)}
                </p>
                <p
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${toneStyles[band.tone]}`}
                >
                  {band.label}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  {Math.round(day.max)}&deg; / {Math.round(day.min)}&deg;
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          {status === "error" ? "Forecast unavailable." : "Loading forecast…"}
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-400">
        The risk level above is based only on the reading you enter. Forecast
        accuracy drops after about 7 days, and models rarely forecast {HEAVY_MM}{" "}
        mm in a day, so &ldquo;none forecast&rdquo; does not guarantee no
        flooding.
        {updatedAt
          ? ` Last updated ${updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}.`
          : ""}
      </p>
    </section>
  );
}
