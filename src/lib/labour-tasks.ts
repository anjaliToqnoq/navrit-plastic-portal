/** Shared labour task types for Labour Management UI + API. */
export const LABOUR_TASKS = [
  "Cap Removal",
  "Sorting",
  "Plastic grinding",
  "Other",
] as const;

export type LabourTask = (typeof LABOUR_TASKS)[number];
