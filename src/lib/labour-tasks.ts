/** Mode-aware labour task lists for Labour Management. */
export const PET_LABOUR_TASKS = [
  "Cap Removal",
  "Sorting",
  "Plastic grinding",
  "Other",
] as const;

export const PLASTIC_LABOUR_TASKS = [
  "Sorting",
  "Loading",
  "Plastic grinding",
  "Other",
] as const;

/** Union used by API zod enums (accept either mode's tasks). */
export const LABOUR_TASKS = Array.from(
  new Set([...PET_LABOUR_TASKS, ...PLASTIC_LABOUR_TASKS])
) as [string, ...string[]];

export const ALL_LABOUR_TASKS = LABOUR_TASKS;

export type LabourTask = (typeof LABOUR_TASKS)[number];

export function labourTasksForMode(mode: "PET" | "PLASTIC") {
  return mode === "PLASTIC" ? [...PLASTIC_LABOUR_TASKS] : [...PET_LABOUR_TASKS];
}
