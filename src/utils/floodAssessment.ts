export type RiskLevel = "normal" | "low" | "moderate" | "high";

export type Assessment = {
  level: RiskLevel;
  label: string;
  summary: string;
  actions: string[];
  intensity: number;
  runoff_m3s: number;
};

export type AssessRequest = {
  intensity?: string | number;
  rainfall_mm?: string | number;
  duration_hrs?: string | number;
};

// ---- Locked results from Objectives 1 and 2 ----
export const CATCHMENT_AREA_KM2 = 3.92;
export const COMPOSITE_C = 0.95;

export const TRIGGERS_MM_HR: [number, RiskLevel][] = [
  [70.72, "high"],
  [68.68, "moderate"],
  [62.06, "low"],
];

export const MESSAGES: Record<
  RiskLevel,
  { label: string; summary: string; actions: string[] }
> = {
  normal: {
    label: "NORMAL",
    summary: "No flood-inducing runoff expected at this rainfall.",
    actions: [
      "No flood-risk action needed right now.",
      "Keep monitoring; check again if the rain intensifies or persists.",
      "Keep drains and drainage channels free of refuse.",
    ],
  },
  low: {
    label: "LOW RISK",
    summary: "Rainfall is approaching flood-inducing levels.",
    actions: [
      "Stay alert and keep checking the rainfall.",
      "Avoid low-lying areas and drainage channels where possible.",
      "Prepare to move valuables and vehicles to higher ground.",
    ],
  },
  moderate: {
    label: "MODERATE RISK",
    summary: "Flood-inducing surface runoff is likely.",
    actions: [
      "Be on high alert and avoid flood-prone roads and crossings.",
      "Move valuables, vehicles and livestock to higher ground now.",
      "Contact your local emergency management authority if water is rising.",
    ],
  },
  high: {
    label: "HIGH RISK",
    summary: "Critical rainfall intensity reached; flooding is highly likely.",
    actions: [
      "Contact the relevant emergency / government authority immediately.",
      "Move to higher ground or a safe building; never walk or drive through flood water.",
      "Switch off electrical appliances if water is entering buildings.",
      "Follow official instructions and help neighbours who need assistance.",
    ],
  },
};

export function classify(intensity: number): RiskLevel {
  for (const [limit, level] of TRIGGERS_MM_HR) {
    if (intensity >= limit) {
      return level;
    }
  }
  return "normal";
}

/**
 * Hydrological assessment model matching the canonical backend specification:
 * - Catchment Area: 3.92 km²
 * - Composite Runoff Coefficient (C): 0.95
 * - Rational Method: Q = (C * I * A) / 3.6  (m³/s)
 */
export function calculateFloodAssessment(input: AssessRequest): Assessment {
  let intensity: number;

  try {
    if (input.intensity !== undefined && input.intensity !== "") {
      intensity = Number(input.intensity);
      if (Number.isNaN(intensity)) {
        throw new Error();
      }
    } else {
      const mm = Number(input.rainfall_mm);
      const hrs = Number(input.duration_hrs);
      if (Number.isNaN(mm) || Number.isNaN(hrs)) {
        throw new Error();
      }
      if (hrs <= 0) {
        throw new Error("Duration must be greater than zero.");
      }
      intensity = mm / hrs;
    }
  } catch (err: any) {
    if (err?.message === "Duration must be greater than zero.") {
      throw err;
    }
    throw new Error(
      "Enter a rainfall intensity (mm/hr), or rainfall depth (mm) and duration (hours)."
    );
  }

  if (intensity < 0) {
    throw new Error("Rainfall cannot be negative.");
  }

  const level = classify(intensity);
  const q = (COMPOSITE_C * intensity * CATCHMENT_AREA_KM2) / 3.6;
  const m = MESSAGES[level];

  return {
    level,
    label: m.label,
    summary: m.summary,
    actions: m.actions,
    intensity: Math.round(intensity * 100) / 100,
    runoff_m3s: Math.round(q * 100) / 100,
  };
}
