// import { FormEvent, ReactNode, useEffect, useState } from "react";
// import {
//   Assessment,
//   calculateFloodAssessment,
//   RiskLevel,
// } from "./utils/floodAssessment";

// type Mode = "intensity" | "depth";

// type DailyForecast = {
//   dayName: string;
//   dateStr: string;
//   weatherCode: number;
//   description: string;
//   tempMax: number;
//   tempMin: number;
//   precipitationMm: number;
// };

// type Weather = {
//   temperature: number;
//   humidity: number;
//   wind: number;
//   rain: number;
//   description: string;
//   daily: DailyForecast[];
// };

// const riskStyles: Record<
//   RiskLevel,
//   { accent: string; soft: string; text: string }
// > = {
//   normal: {
//     accent: "bg-emerald-500",
//     soft: "bg-emerald-50",
//     text: "text-emerald-700",
//   },
//   low: {
//     accent: "bg-amber-400",
//     soft: "bg-amber-50",
//     text: "text-amber-700",
//   },
//   moderate: {
//     accent: "bg-orange-500",
//     soft: "bg-orange-50",
//     text: "text-orange-700",
//   },
//   high: {
//     accent: "bg-red-500",
//     soft: "bg-red-50",
//     text: "text-red-700",
//   },
// };

// function Icon({
//   children,
//   className = "size-5",
// }: {
//   children: ReactNode;
//   className?: string;
// }) {
//   return (
//     <svg
//       aria-hidden="true"
//       className={className}
//       fill="none"
//       viewBox="0 0 24 24"
//       stroke="currentColor"
//       strokeWidth="1.8"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       {children}
//     </svg>
//   );
// }

// function weatherDescription(code: number) {
//   if (code === 0) return "Clear skies";
//   if (code <= 3) return "Partly cloudy";
//   if (code <= 48) return "Misty";
//   if (code <= 57) return "Light drizzle";
//   if (code <= 67) return "Rainy";
//   if (code <= 77) return "Rain showers";
//   if (code <= 82) return "Heavy showers";
//   return "Thunderstorms";
// }

// function getWeatherEmoji(code: number) {
//   if (code === 0) return "☀️";
//   if (code <= 2) return "⛅";
//   if (code === 3) return "☁️";
//   if (code <= 48) return "🌫️";
//   if (code <= 57) return "🌦️";
//   if (code <= 67) return "🌧️";
//   if (code <= 82) return "🌧️";
//   return "⛈️";
// }

// function App() {
//   const [mode, setMode] = useState<Mode>("intensity");
//   const [intensity, setIntensity] = useState("");
//   const [rainfall, setRainfall] = useState("");
//   const [duration, setDuration] = useState("");
//   const [assessment, setAssessment] = useState<Assessment | null>(null);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [weather, setWeather] = useState<Weather | null>(null);

//   useEffect(() => {
//     const controller = new AbortController();
//     const url =
//       "https://api.open-meteo.com/v1/forecast?latitude=7.35&longitude=3.89&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FLagos&forecast_days=7";

//     fetch(url, { signal: controller.signal })
//       .then((response) => {
//         if (!response.ok) throw new Error("Weather unavailable");
//         return response.json();
//       })
//       .then((data) => {
//         const current = data.current;
//         const daily = data.daily;
//         const formattedDaily: DailyForecast[] = [];

//         if (daily && Array.isArray(daily.time)) {
//           daily.time.forEach((timeStr: string, idx: number) => {
//             const date = new Date(`${timeStr}T12:00:00Z`);
//             const dayName =
//               idx === 0
//                 ? "Today"
//                 : date.toLocaleDateString("en-GB", { weekday: "short" });
//             const dateStr = date.toLocaleDateString("en-GB", {
//               month: "short",
//               day: "numeric",
//             });
//             const weatherCode = daily.weather_code[idx] ?? 0;

//             formattedDaily.push({
//               dayName,
//               dateStr,
//               weatherCode,
//               description: weatherDescription(weatherCode),
//               tempMax: Math.round(daily.temperature_2m_max[idx] ?? 0),
//               tempMin: Math.round(daily.temperature_2m_min[idx] ?? 0),
//               precipitationMm:
//                 Math.round((daily.precipitation_sum[idx] ?? 0) * 10) / 10,
//             });
//           });
//         }

//         setWeather({
//           temperature: Math.round(current.temperature_2m),
//           humidity: Math.round(current.relative_humidity_2m),
//           wind: Math.round(current.wind_speed_10m),
//           rain: Number(current.rain ?? current.precipitation ?? 0),
//           description: weatherDescription(current.weather_code),
//           daily: formattedDaily,
//         });
//       })
//       .catch((weatherError) => {
//         if (weatherError.name !== "AbortError") setWeather(null);
//       });

//     return () => controller.abort();
//   }, []);

//   async function assessRisk(
//     event?: FormEvent,
//     overrideIntensity?: string,
//   ) {
//     if (event) event.preventDefault();
//     setError("");

//     const targetIntensity =
//       overrideIntensity !== undefined ? overrideIntensity : intensity;

//     // Validate inputs locally
//     if (mode === "intensity" || overrideIntensity !== undefined) {
//       if (targetIntensity.trim() === "") {
//         setError("Please enter a rainfall intensity (e.g. 50 mm/hr).");
//         return;
//       }
//       const val = Number(targetIntensity);
//       if (Number.isNaN(val) || val < 0) {
//         setError("Please enter a valid, non-negative rainfall intensity in mm/hr.");
//         return;
//       }
//     } else {
//       if (rainfall.trim() === "") {
//         setError("Please enter the rainfall depth in mm (e.g. 65 mm).");
//         return;
//       }
//       if (duration.trim() === "") {
//         setError("Please enter the rainfall duration in hours (e.g. 1.5 hrs).");
//         return;
//       }
//       const valRain = Number(rainfall);
//       const valDur = Number(duration);
//       if (Number.isNaN(valRain) || valRain < 0) {
//         setError("Please enter a valid, non-negative rainfall depth in mm.");
//         return;
//       }
//       if (Number.isNaN(valDur) || valDur <= 0) {
//         setError("Please enter a valid rainfall duration greater than 0 hours.");
//         return;
//       }
//     }

//     setLoading(true);

//     const body =
//       mode === "intensity" || overrideIntensity !== undefined
//         ? { intensity: targetIntensity }
//         : { rainfall_mm: rainfall, duration_hrs: duration };

//     try {
//       let data: Assessment;
//       try {
//         const response = await fetch("/api/assess", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(body),
//         });

//         const contentType = response.headers.get("content-type") || "";
//         if (contentType.includes("application/json")) {
//           const json = await response.json();
//           if (!response.ok) {
//             throw new Error(json.error || "We could not assess this reading.");
//           }
//           data = json;
//         } else {
//           // Response body is not JSON (e.g. 404 HTML fallback or offline)
//           data = calculateFloodAssessment(body);
//         }
//       } catch (networkOrApiError) {
//         // Fall back seamlessly to client-side hydrological assessment model
//         data = calculateFloodAssessment(body);
//       }

//       setAssessment(data);
//       window.setTimeout(() => {
//         document
//           .getElementById("assessment-result")
//           ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
//       }, 50);
//     } catch (requestError) {
//       setAssessment(null);
//       setError(
//         requestError instanceof Error
//           ? requestError.message
//           : "We could not assess this reading. Please try again.",
//       );
//     } finally {
//       setLoading(false);
//     }
//   }

//   function useLiveRainfall() {
//     if (!weather) {
//       setError("Live rainfall is not available right now.");
//       return;
//     }
//     const liveVal = String(weather.rain);
//     setMode("intensity");
//     setIntensity(liveVal);
//     setError("");
//     assessRisk(undefined, liveVal);
//   }

//   const activeRisk = assessment
//     ? riskStyles[assessment.level]
//     : riskStyles.normal;

//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-950">
//       <header className="relative overflow-hidden bg-[#071f2b] text-white">
//         <div className="hero-grid absolute inset-0 opacity-50" />
//         <div className="absolute -right-24 -top-20 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
//         <div className="absolute -bottom-36 left-1/3 size-96 rounded-full bg-blue-500/15 blur-3xl" />

//         <div className="relative mx-auto max-w-7xl px-5 pb-32 pt-6 sm:px-8 lg:px-10">
//           <nav className="flex items-center justify-between">
//             <div className="flex items-center gap-3">
//               <div className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-[#071f2b] shadow-lg shadow-cyan-400/10">
//                 <Icon className="size-6">
//                   <path d="M12 3.2S6.5 9 6.5 13.5a5.5 5.5 0 0 0 11 0C17.5 9 12 3.2 12 3.2Z" />
//                   <path d="M9.5 15.2c.5 1.2 1.4 1.8 2.7 1.9" />
//                 </Icon>
//               </div>
//               <div>
//                 <p className="text-sm font-bold tracking-tight">Oluyole FloodWatch</p>
//                 <p className="text-xs text-slate-400">Early warning & decision support</p>
//               </div>
//             </div>
//             <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 backdrop-blur sm:flex">
//               <span className="relative flex size-2">
//                 <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
//                 <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
//               </span>
//               System online
//             </div>
//           </nav>

//           <div className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
//             <div>
//               <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
//                 <Icon className="size-3.5">
//                   <path d="M12 3 3.8 6.5v5c0 4.7 3.2 7.8 8.2 9.5 5-1.7 8.2-4.8 8.2-9.5v-5L12 3Z" />
//                   <path d="m9 12 2 2 4-4" />
//                 </Icon>
//                 Community flood preparedness
//               </div>
//               <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
//                 Know the risk before the water rises.
//               </h1>
//               <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
//                 Turn a local rainfall reading into clear, immediate flood-risk
//                 guidance for Oluyole, Ibadan.
//               </p>
//             </div>

//             <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md">
//               <div className="flex items-start justify-between">
//                 <div>
//                   <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
//                     Current weather
//                   </p>
//                   <p className="mt-1 text-sm text-slate-300">Oluyole, Ibadan</p>
//                 </div>
//                 <Icon className="size-7 text-cyan-300">
//                   <path d="M6.5 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4-1.8A4 4 0 0 0 6.5 18.5Z" />
//                   <path d="M9 21h.01M13 21h.01M17 21h.01" />
//                 </Icon>
//               </div>
//               {weather ? (
//                 <>
//                   <div className="mt-5 flex items-end gap-3">
//                     <p className="text-5xl font-semibold tracking-[-0.05em]">
//                       {weather.temperature}°
//                     </p>
//                     <p className="pb-1.5 text-sm text-slate-300">
//                       {weather.description}
//                     </p>
//                   </div>
//                   <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
//                     <WeatherDatum value={`${weather.humidity}%`} label="Humidity" />
//                     <WeatherDatum value={`${weather.wind} km/h`} label="Wind" />
//                     <WeatherDatum value={`${weather.rain} mm`} label="Rain now" />
//                   </div>
//                 </>
//               ) : (
//                 <div className="mt-6 space-y-3">
//                   <div className="h-10 w-28 animate-pulse rounded-lg bg-white/10" />
//                   <div className="h-12 animate-pulse rounded-lg bg-white/5" />
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="relative mx-auto -mt-20 max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
//         <div className="grid items-start gap-6 lg:grid-cols-[1.12fr_.88fr]">
//           <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
//             <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
//               <div className="flex items-start gap-4">
//                 <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
//                   <Icon className="size-6">
//                     <path d="M4 19c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0" />
//                     <path d="M12 3.5S8 7.8 8 11a4 4 0 0 0 8 0c0-3.2-4-7.5-4-7.5Z" />
//                   </Icon>
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-bold tracking-tight text-slate-900">
//                     Check your rainfall
//                   </h2>
//                   <p className="mt-1 text-sm leading-6 text-slate-500">
//                     Enter the reading available to you. The secure server will
//                     calculate the local risk level.
//                   </p>
//                 </div>
//               </div>
//             </div>

//             <form onSubmit={assessRisk} className="px-6 py-6 sm:px-8 sm:py-8">
//               <fieldset>
//                 <legend className="text-sm font-semibold text-slate-800">
//                   How is your rainfall measured?
//                 </legend>
//                 <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
//                   <ModeButton
//                     active={mode === "intensity"}
//                     onClick={() => {
//                       setMode("intensity");
//                       setError("");
//                     }}
//                   >
//                     Intensity
//                   </ModeButton>
//                   <ModeButton
//                     active={mode === "depth"}
//                     onClick={() => {
//                       setMode("depth");
//                       setError("");
//                     }}
//                   >
//                     Depth + duration
//                   </ModeButton>
//                 </div>
//               </fieldset>

//               {mode === "intensity" ? (
//                 <div className="mt-6">
//                   <label
//                     htmlFor="intensity"
//                     className="text-sm font-semibold text-slate-800"
//                   >
//                     Rainfall intensity
//                   </label>
//                   <div className="relative mt-2">
//                     <input
//                       id="intensity"
//                       inputMode="decimal"
//                       min="0"
//                       step="any"
//                       value={intensity}
//                       onChange={(event) => setIntensity(event.target.value)}
//                       placeholder="e.g. 45"
//                       className="input-field pr-20"
//                     />
//                     <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">
//                       mm/hr
//                     </span>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={useLiveRainfall}
//                     className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
//                   >
//                     <Icon className="size-4">
//                       <path d="M20 11a8 8 0 1 1-2.3-5.7" />
//                       <path d="M20 4v7h-7" />
//                     </Icon>
//                     Use live rainfall ({weather ? `${weather.rain} mm/hr` : "loading"})
//                   </button>
//                 </div>
//               ) : (
//                 <div className="mt-6 grid gap-5 sm:grid-cols-2">
//                   <div>
//                     <label
//                       htmlFor="rainfall"
//                       className="text-sm font-semibold text-slate-800"
//                     >
//                       Rainfall depth
//                     </label>
//                     <div className="relative mt-2">
//                       <input
//                         id="rainfall"
//                         inputMode="decimal"
//                         min="0"
//                         step="any"
//                         value={rainfall}
//                         onChange={(event) => setRainfall(event.target.value)}
//                         placeholder="e.g. 80"
//                         className="input-field pr-14"
//                       />
//                       <span className="input-unit">mm</span>
//                     </div>
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="duration"
//                       className="text-sm font-semibold text-slate-800"
//                     >
//                       Duration
//                     </label>
//                     <div className="relative mt-2">
//                       <input
//                         id="duration"
//                         inputMode="decimal"
//                         min="0"
//                         step="any"
//                         value={duration}
//                         onChange={(event) => setDuration(event.target.value)}
//                         placeholder="e.g. 2"
//                         className="input-field pr-16"
//                       />
//                       <span className="input-unit">hours</span>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {error && (
//                 <div
//                   role="alert"
//                   className="mt-5 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700"
//                 >
//                   <Icon className="mt-0.5 size-4 shrink-0">
//                     <circle cx="12" cy="12" r="9" />
//                     <path d="M12 8v5M12 16.5h.01" />
//                   </Icon>
//                   {error}
//                 </div>
//               )}

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4051] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/10 transition hover:bg-[#0e5368] focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-70"
//               >
//                 {loading ? (
//                   <>
//                     <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
//                     Assessing rainfall…
//                   </>
//                 ) : (
//                   <>
//                     Assess flood risk
//                     <Icon className="size-4">
//                       <path d="M5 12h14M14 7l5 5-5 5" />
//                     </Icon>
//                   </>
//                 )}
//               </button>

//               <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-400">
//                 <Icon className="mt-0.5 size-3.5 shrink-0">
//                   <rect x="5" y="10" width="14" height="10" rx="2" />
//                   <path d="M8 10V7a4 4 0 0 1 8 0v3" />
//                 </Icon>
//                 Risk thresholds and catchment data stay securely on the server.
//               </p>
//             </form>
//           </section>

//           <div className="space-y-6">
//             {assessment ? (
//               <section
//                 id="assessment-result"
//                 className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
//               >
//                 <div className={`${activeRisk.accent} h-1.5`} />
//                 <div className="p-6 sm:p-8">
//                   <div className="flex flex-wrap items-start justify-between gap-4">
//                     <div>
//                       <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
//                         Assessment result
//                       </p>
//                       <div className="mt-2 flex items-center gap-3">
//                         <span
//                           className={`size-3 rounded-full ${activeRisk.accent} shadow-[0_0_0_5px_rgba(148,163,184,0.12)]`}
//                         />
//                         <h2
//                           className={`text-2xl font-bold tracking-tight ${activeRisk.text}`}
//                         >
//                           {assessment.label}
//                         </h2>
//                       </div>
//                     </div>
//                     <span
//                       className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeRisk.soft} ${activeRisk.text}`}
//                     >
//                       {assessment.intensity} mm/hr
//                     </span>
//                   </div>
//                   <p className="mt-4 text-sm leading-6 text-slate-600">
//                     {assessment.summary}
//                   </p>

//                   <div className="mt-6 rounded-2xl bg-slate-50 p-4">
//                     <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
//                       Recommended actions
//                     </p>
//                     <ul className="mt-4 space-y-3">
//                       {assessment.actions.map((action) => (
//                         <li
//                           key={action}
//                           className="flex gap-3 text-sm leading-6 text-slate-700"
//                         >
//                           <span
//                             className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full ${activeRisk.soft} ${activeRisk.text}`}
//                           >
//                             <Icon className="size-3">
//                               <path d="m5 12 4 4L19 6" />
//                             </Icon>
//                           </span>
//                           {action}
//                         </li>
//                       ))}
//                     </ul>
//                   </div>

//                   <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
//                     <span className="text-slate-500">Estimated peak runoff</span>
//                     <span className="font-bold text-slate-800">
//                       {assessment.runoff_m3s} m³/s
//                     </span>
//                   </div>
//                 </div>
//               </section>
//             ) : (
//               <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
//                       Awaiting assessment
//                     </p>
//                     <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
//                       Your guidance will appear here
//                     </h2>
//                   </div>
//                   <div className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
//                     <Icon className="size-5">
//                       <path d="M12 8v4l2.5 2.5" />
//                       <circle cx="12" cy="12" r="9" />
//                     </Icon>
//                   </div>
//                 </div>
//                 <p className="mt-3 text-sm leading-6 text-slate-500">
//                   Submit a rainfall reading to receive the risk level, runoff
//                   estimate and recommended safety actions.
//                 </p>
//                 <div className="mt-6 grid grid-cols-4 gap-2">
//                   {[
//                     ["Normal", "bg-emerald-500"],
//                     ["Low", "bg-amber-400"],
//                     ["Moderate", "bg-orange-500"],
//                     ["High", "bg-red-500"],
//                   ].map(([label, color]) => (
//                     <div key={label} className="text-center">
//                       <div className={`h-1.5 rounded-full ${color}`} />
//                       <p className="mt-2 text-[11px] font-medium text-slate-400">
//                         {label}
//                       </p>
//                     </div>
//                   ))}
//                 </div>
//               </section>
//             )}

//             <aside className="rounded-3xl bg-[#dff5f3] p-6 sm:p-7">
//               <div className="flex gap-4">
//                 <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70 text-teal-800">
//                   <Icon className="size-5">
//                     <path d="M12 3 3.8 6.5v5c0 4.7 3.2 7.8 8.2 9.5 5-1.7 8.2-4.8 8.2-9.5v-5L12 3Z" />
//                     <path d="M12 8v4M12 15.5h.01" />
//                   </Icon>
//                 </div>
//                 <div>
//                   <h2 className="font-bold text-teal-950">Stay prepared</h2>
//                   <p className="mt-1.5 text-sm leading-6 text-teal-900/70">
//                     Keep drains clear, watch for rising water, and never walk or
//                     drive through floodwater.
//                   </p>
//                 </div>
//               </div>
//             </aside>
//           </div>
//         </div>

//         {/* 7-Day Precipitation & Weather Outlook */}
//         <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
//           <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//             <div className="flex items-start gap-3">
//               <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
//                 <Icon className="size-5">
//                   <rect x="3" y="4" width="18" height="18" rx="2" />
//                   <path d="M16 2v4M8 2v4M3 10h18" />
//                 </Icon>
//               </div>
//               <div>
//                 <h2 className="text-xl font-bold tracking-tight text-slate-900">
//                   7-Day Precipitation & Weather Outlook
//                 </h2>
//                 <p className="text-xs text-slate-500">
//                   Forecasted rainfall depths and weather trends for Oluyole, Ibadan
//                 </p>
//               </div>
//             </div>
//             <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 sm:self-auto">
//               <span className="size-2 rounded-full bg-cyan-500 animate-pulse" />
//               Oluyole Local Station
//             </span>
//           </div>

//           <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
//             {weather?.daily && weather.daily.length > 0 ? (
//               weather.daily.map((day, idx) => {
//                 const isHeavy = day.precipitationMm >= 25;
//                 const isModerate = day.precipitationMm >= 10;
//                 const isLight = day.precipitationMm > 0;

//                 return (
//                   <div
//                     key={day.dayName + idx}
//                     className={`flex flex-col items-center rounded-2xl p-4 text-center transition ${
//                       idx === 0
//                         ? "border border-cyan-300/80 bg-gradient-to-b from-cyan-50/80 to-white shadow-sm ring-1 ring-cyan-200"
//                         : "bg-slate-50 hover:bg-slate-100/80"
//                     }`}
//                   >
//                     <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
//                       {day.dayName}
//                     </p>
//                     <p className="text-[11px] text-slate-400">{day.dateStr}</p>
//                     <div className="my-2.5 text-2xl select-none">
//                       {getWeatherEmoji(day.weatherCode)}
//                     </div>
//                     <p className="text-xs font-bold text-slate-800">
//                       {day.tempMax}°{" "}
//                       <span className="text-slate-400 font-normal">/ {day.tempMin}°</span>
//                     </p>
//                     <p className="mt-1 text-[11px] leading-tight text-slate-500 line-clamp-1">
//                       {day.description}
//                     </p>
//                     <div
//                       className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
//                         isHeavy
//                           ? "bg-red-100 text-red-700"
//                           : isModerate
//                           ? "bg-amber-100 text-amber-800"
//                           : isLight
//                           ? "bg-cyan-100 text-cyan-800"
//                           : "bg-slate-200/70 text-slate-500"
//                       }`}
//                     >
//                       <span>{day.precipitationMm} mm</span>
//                     </div>
//                   </div>
//                 );
//               })
//             ) : (
//               Array.from({ length: 7 }).map((_, i) => (
//                 <div
//                   key={i}
//                   className="h-36 animate-pulse rounded-2xl bg-slate-100"
//                 />
//               ))
//             )}
//           </div>

//           <p className="mt-4 text-xs text-slate-400">
//             Note: The flood risk assessment above is based on the specific rainfall reading you submit, while this 7-day outlook indicates general regional precipitation forecasts from Open-Meteo.
//           </p>
//         </section>

//         <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
//           <p>Oluyole FloodWatch · Rainfall-induced runoff decision support</p>
//           <p className="max-w-xl sm:text-right">
//             Weather data: Open-Meteo. This tool supports decisions and does not
//             replace official emergency warnings.
//           </p>
//         </footer>
//       </main>
//     </div>
//   );
// }

// function ModeButton({
//   active,
//   onClick,
//   children,
// }: {
//   active: boolean;
//   onClick: () => void;
//   children: ReactNode;
// }) {
//   return (
//     <button
//       type="button"
//       aria-pressed={active}
//       onClick={onClick}
//       className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
//         active
//           ? "bg-white text-slate-900 shadow-sm"
//           : "text-slate-500 hover:text-slate-800"
//       }`}
//     >
//       {children}
//     </button>
//   );
// }

// function WeatherDatum({ value, label }: { value: string; label: string }) {
//   return (
//     <div className="px-3 first:pl-0 last:pr-0">
//       <p className="text-sm font-bold text-white">{value}</p>
//       <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
//     </div>
//   );
// }

// export default App;

import { FormEvent, ReactNode, useEffect, useState } from "react";

type Mode = "intensity" | "depth";
type RiskLevel = "normal" | "low" | "moderate" | "high";

type Assessment = {
  level: RiskLevel;
  label: string;
  summary: string;
  actions: string[];
  intensity: number;
  runoff_m3s: number;
};

type Weather = {
  temperature: number;
  humidity: number;
  wind: number;
  rain: number; // total rain in the last complete hour (mm), i.e. mm/hr
  description: string;
};

type DayForecast = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number; // forecast daily total (mm)
};

type LoadStatus = "loading" | "ready" | "error";
type ServerStatus = "checking" | "online" | "offline";

const riskStyles: Record<
  RiskLevel,
  { accent: string; soft: string; text: string }
> = {
  normal: {
    accent: "bg-emerald-500",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
  },
  low: {
    accent: "bg-amber-400",
    soft: "bg-amber-50",
    text: "text-amber-700",
  },
  moderate: {
    accent: "bg-orange-500",
    soft: "bg-orange-50",
    text: "text-orange-700",
  },
  high: {
    accent: "bg-red-500",
    soft: "bg-red-50",
    text: "text-red-700",
  },
};

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

function weatherDescription(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code < 80) return "Snow";
  if (code === 80) return "Light showers";
  if (code === 81) return "Showers";
  if (code === 82) return "Violent showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

// Index of the latest hourly entry at or before "now". Open-Meteo hourly
// precipitation is the sum of the PRECEDING hour, so this entry is the rain
// that fell in the last complete hour (a true mm/hr figure).
function lastHourlyIndex(times: string[], now: string) {
  let index = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= now) index = i;
  }
  return index;
}

function App() {
  const [mode, setMode] = useState<Mode>("intensity");
  const [intensity, setIntensity] = useState("");
  const [rainfall, setRainfall] = useState("");
  const [duration, setDuration] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [weatherStatus, setWeatherStatus] = useState<LoadStatus>("loading");
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=7.35&longitude=3.89" +
      "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m" +
      "&hourly=precipitation" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum" +
      "&forecast_days=7&timezone=Africa%2FLagos";

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return response.json();
      })
      .then(({ current, hourly, daily }) => {
        const index = lastHourlyIndex(hourly.time, current.time);
        if (index < 0) throw new Error("No hourly rainfall available");
        if (cancelled) return;
        setWeather({
          temperature: Math.round(current.temperature_2m),
          humidity: Math.round(current.relative_humidity_2m),
          wind: Math.round(current.wind_speed_10m),
          rain: Number(hourly.precipitation[index] ?? 0),
          description: weatherDescription(current.weather_code),
        });
        setForecast(
          daily.time.map((date: string, i: number) => ({
            date,
            code: daily.weather_code[i],
            max: daily.temperature_2m_max[i],
            min: daily.temperature_2m_min[i],
            rain: Number(daily.precipitation_sum[i] ?? 0),
          })),
        );
        setWeatherStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setWeather(null);
        setForecast([]);
        setWeatherStatus("error");
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // Real server check: only reports "online" if /api/health answers with JSON.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => {
        const isJson = (response.headers.get("content-type") || "").includes(
          "application/json",
        );
        if (!cancelled) setServerStatus(response.ok && isJson ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setServerStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function assessRisk(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "intensity") {
      const value = Number(intensity);
      if (intensity.trim() === "" || !Number.isFinite(value) || value < 0) {
        setError("Enter a rainfall intensity of 0 or more (mm/hr).");
        return;
      }
    } else {
      const depth = Number(rainfall);
      const hours = Number(duration);
      if (rainfall.trim() === "" || !Number.isFinite(depth) || depth < 0) {
        setError("Enter a rainfall depth of 0 or more (mm).");
        return;
      }
      if (duration.trim() === "" || !Number.isFinite(hours) || hours <= 0) {
        setError("Enter a duration greater than 0 hours.");
        return;
      }
    }

    setLoading(true);

    const body =
      mode === "intensity"
        ? { intensity }
        : { rainfall_mm: rainfall, duration_hrs: duration };

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const isJson = (response.headers.get("content-type") || "").includes(
        "application/json",
      );
      if (!isJson) {
        throw new Error(
          "Cannot reach the assessment server. Start the backend (python app.py) and try again.",
        );
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "We could not assess this reading.");
      }
      if (!Array.isArray(data.actions) || typeof data.label !== "string") {
        throw new Error("The server sent an unexpected response.");
      }

      setAssessment(data);
      window.setTimeout(() => {
        document
          .getElementById("assessment-result")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    } catch (requestError) {
      setAssessment(null);
      setError(
        requestError instanceof TypeError
          ? "Cannot reach the assessment server. Check that the backend is running."
          : requestError instanceof Error
            ? requestError.message
            : "The assessment service is unavailable. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function fillLiveRainfall() {
    if (!weather) {
      setError("Live rainfall is not available right now.");
      return;
    }
    setMode("intensity");
    setIntensity(String(weather.rain));
    setError("");
  }

  const statusDot =
    serverStatus === "online"
      ? "bg-emerald-400"
      : serverStatus === "offline"
        ? "bg-red-400"
        : "bg-slate-400";
  const statusText =
    serverStatus === "online"
      ? "System online"
      : serverStatus === "offline"
        ? "Server offline"
        : "Checking system…";

  const activeRisk = assessment
    ? riskStyles[assessment.level]
    : riskStyles.normal;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="relative overflow-hidden bg-[#071f2b] text-white">
        <div className="hero-grid absolute inset-0 opacity-50" />
        <div className="absolute -right-24 -top-20 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-36 left-1/3 size-96 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 pb-32 pt-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-[#071f2b] shadow-lg shadow-cyan-400/10">
                <Icon className="size-6">
                  <path d="M12 3.2S6.5 9 6.5 13.5a5.5 5.5 0 0 0 11 0C17.5 9 12 3.2 12 3.2Z" />
                  <path d="M9.5 15.2c.5 1.2 1.4 1.8 2.7 1.9" />
                </Icon>
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">Oluyole FloodWatch</p>
                <p className="text-xs text-slate-400">Early warning & decision support</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 backdrop-blur sm:flex">
              <span className="relative flex size-2">
                <span
                  className={`absolute inline-flex size-full rounded-full opacity-70 ${statusDot} ${serverStatus === "online" ? "animate-ping" : ""}`}
                />
                <span className={`relative inline-flex size-2 rounded-full ${statusDot}`} />
              </span>
              {statusText}
            </div>
          </nav>

          <div className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-200">
                <Icon className="size-3.5">
                  <path d="M12 3 3.8 6.5v5c0 4.7 3.2 7.8 8.2 9.5 5-1.7 8.2-4.8 8.2-9.5v-5L12 3Z" />
                  <path d="m9 12 2 2 4-4" />
                </Icon>
                Community flood preparedness
              </div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Know the risk before the water rises.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Turn a local rainfall reading into clear, immediate flood-risk
                guidance for Oluyole, Ibadan.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Current weather
                  </p>
                  <p className="mt-1 text-sm text-slate-300">Oluyole, Ibadan</p>
                </div>
                <Icon className="size-7 text-cyan-300">
                  <path d="M6.5 18.5h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4-1.8A4 4 0 0 0 6.5 18.5Z" />
                  <path d="M9 21h.01M13 21h.01M17 21h.01" />
                </Icon>
              </div>
              {weather ? (
                <>
                  <div className="mt-5 flex items-end gap-3">
                    <p className="text-5xl font-semibold tracking-[-0.05em]">
                      {weather.temperature}°
                    </p>
                    <p className="pb-1.5 text-sm text-slate-300">
                      {weather.description}
                    </p>
                  </div>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4">
                    <WeatherDatum value={`${weather.humidity}%`} label="Humidity" />
                    <WeatherDatum value={`${weather.wind} km/h`} label="Wind" />
                    <WeatherDatum value={`${weather.rain} mm`} label="Rain, last hour" />
                  </div>
                </>
              ) : weatherStatus === "error" ? (
                <p className="mt-6 text-sm leading-6 text-slate-300">
                  Weather is unavailable right now. Check your internet
                  connection. You can still assess a rainfall reading below.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="h-10 w-28 animate-pulse rounded-lg bg-white/10" />
                  <div className="h-12 animate-pulse rounded-lg bg-white/5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-20 max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
        <div className="grid items-start gap-6 lg:grid-cols-[1.12fr_.88fr]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                  <Icon className="size-6">
                    <path d="M4 19c1.5-1.4 3-1.4 4.5 0s3 1.4 4.5 0 3-1.4 4.5 0 3 1.4 4.5 0" />
                    <path d="M12 3.5S8 7.8 8 11a4 4 0 0 0 8 0c0-3.2-4-7.5-4-7.5Z" />
                  </Icon>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Check your rainfall
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Enter the reading available to you. The secure server will
                    calculate the local risk level.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={assessRisk} className="px-6 py-6 sm:px-8 sm:py-8">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-800">
                  How is your rainfall measured?
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
                  <ModeButton
                    active={mode === "intensity"}
                    onClick={() => {
                      setMode("intensity");
                      setError("");
                    }}
                  >
                    Intensity
                  </ModeButton>
                  <ModeButton
                    active={mode === "depth"}
                    onClick={() => {
                      setMode("depth");
                      setError("");
                    }}
                  >
                    Depth + duration
                  </ModeButton>
                </div>
              </fieldset>

              {mode === "intensity" ? (
                <div className="mt-6">
                  <label
                    htmlFor="intensity"
                    className="text-sm font-semibold text-slate-800"
                  >
                    Rainfall intensity
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="intensity"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={intensity}
                      onChange={(event) => setIntensity(event.target.value)}
                      placeholder="e.g. 45"
                      className="input-field pr-20"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-slate-400">
                      mm/hr
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={fillLiveRainfall}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
                  >
                    <Icon className="size-4">
                      <path d="M20 11a8 8 0 1 1-2.3-5.7" />
                      <path d="M20 4v7h-7" />
                    </Icon>
                    Use last-hour rainfall (
                    {weather
                      ? `${weather.rain} mm/hr`
                      : weatherStatus === "error"
                        ? "unavailable"
                        : "loading"}
                    )
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="rainfall"
                      className="text-sm font-semibold text-slate-800"
                    >
                      Rainfall depth
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="rainfall"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={rainfall}
                        onChange={(event) => setRainfall(event.target.value)}
                        placeholder="e.g. 80"
                        className="input-field pr-14"
                      />
                      <span className="input-unit">mm</span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="duration"
                      className="text-sm font-semibold text-slate-800"
                    >
                      Duration
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="duration"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        placeholder="e.g. 2"
                        className="input-field pr-16"
                      />
                      <span className="input-unit">hours</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700"
                >
                  <Icon className="mt-0.5 size-4 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16.5h.01" />
                  </Icon>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b4051] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/10 transition hover:bg-[#0e5368] focus:outline-none focus:ring-4 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Assessing rainfall…
                  </>
                ) : (
                  <>
                    Assess flood risk
                    <Icon className="size-4">
                      <path d="M5 12h14M14 7l5 5-5 5" />
                    </Icon>
                  </>
                )}
              </button>

              <p className="mt-4 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-400">
                <Icon className="mt-0.5 size-3.5 shrink-0">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </Icon>
                Risk thresholds and catchment data stay securely on the server.
              </p>
            </form>
          </section>

          <div className="space-y-6">
            {assessment ? (
              <section
                id="assessment-result"
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
              >
                <div className={`${activeRisk.accent} h-1.5`} />
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Assessment result
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className={`size-3 rounded-full ${activeRisk.accent} shadow-[0_0_0_5px_rgba(148,163,184,0.12)]`}
                        />
                        <h2
                          className={`text-2xl font-bold tracking-tight ${activeRisk.text}`}
                        >
                          {assessment.label}
                        </h2>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeRisk.soft} ${activeRisk.text}`}
                    >
                      {assessment.intensity} mm/hr
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {assessment.summary}
                  </p>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Recommended actions
                    </p>
                    <ul className="mt-4 space-y-3">
                      {assessment.actions.map((action) => (
                        <li
                          key={action}
                          className="flex gap-3 text-sm leading-6 text-slate-700"
                        >
                          <span
                            className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full ${activeRisk.soft} ${activeRisk.text}`}
                          >
                            <Icon className="size-3">
                              <path d="m5 12 4 4L19 6" />
                            </Icon>
                          </span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5 text-sm">
                    <span className="text-slate-500">Estimated peak runoff</span>
                    <span className="font-bold text-slate-800">
                      {assessment.runoff_m3s} m³/s
                    </span>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Awaiting assessment
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">
                      Your guidance will appear here
                    </h2>
                  </div>
                  <div className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <Icon className="size-5">
                      <path d="M12 8v4l2.5 2.5" />
                      <circle cx="12" cy="12" r="9" />
                    </Icon>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Submit a rainfall reading to receive the risk level, runoff
                  estimate and recommended safety actions.
                </p>
                <div className="mt-6 grid grid-cols-4 gap-2">
                  {[
                    ["Normal", "bg-emerald-500"],
                    ["Low", "bg-amber-400"],
                    ["Moderate", "bg-orange-500"],
                    ["High", "bg-red-500"],
                  ].map(([label, color]) => (
                    <div key={label} className="text-center">
                      <div className={`h-1.5 rounded-full ${color}`} />
                      <p className="mt-2 text-[11px] font-medium text-slate-400">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <aside className="rounded-3xl bg-[#dff5f3] p-6 sm:p-7">
              <div className="flex gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70 text-teal-800">
                  <Icon className="size-5">
                    <path d="M12 3 3.8 6.5v5c0 4.7 3.2 7.8 8.2 9.5 5-1.7 8.2-4.8 8.2-9.5v-5L12 3Z" />
                    <path d="M12 8v4M12 15.5h.01" />
                  </Icon>
                </div>
                <div>
                  <h2 className="font-bold text-teal-950">Stay prepared</h2>
                  <p className="mt-1.5 text-sm leading-6 text-teal-900/70">
                    Keep drains clear, watch for rising water, and never walk or
                    drive through floodwater.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            7-day outlook
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Forecast daily rainfall totals for Oluyole. The risk level above is
            based only on the reading you enter, not on this forecast.
          </p>
          {forecast.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {forecast.map((day, i) => (
                <div
                  key={day.date}
                  className="rounded-2xl bg-slate-50 p-3 text-center"
                >
                  <p className="text-xs font-bold text-slate-500">
                    {i === 0
                      ? "Today"
                      : new Date(`${day.date}T12:00`).toLocaleDateString(
                        "en-GB",
                        { weekday: "short" },
                      )}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {weatherDescription(day.code)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {Math.round(day.max)}° / {Math.round(day.min)}°
                  </p>
                  <p className="mt-1 text-sm font-semibold text-cyan-700">
                    {day.rain.toFixed(1)} mm
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-400">
              {weatherStatus === "error"
                ? "Forecast unavailable."
                : "Loading forecast…"}
            </p>
          )}
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Oluyole FloodWatch · Rainfall-induced runoff decision support</p>
          <p className="max-w-xl sm:text-right">
            Weather data: Open-Meteo. This tool supports decisions and does not
            replace official emergency warnings.
          </p>
        </footer>
      </main>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800"
        }`}
    >
      {children}
    </button>
  );
}

function WeatherDatum({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

export default App;
