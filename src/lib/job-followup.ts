import type { Inspection, Job } from "./types";

/**
 * Inspections change the SAME scheduled job. Never create a follow-up job.
 * Preserve the job ID, photographs (linked by ID), comments, and work history.
 * No-op on repeated clicks to avoid duplicate records and notifications.
 */
export function applyInspection(
  job: Job, inspection: Exclude<Inspection, null>,
  now: string, today: string, note = "",
): Job | null {
  if (job.deletedAt || job.archivedAt) return null;
  const text = note.trim();
  if (inspection === "patikrinta") {
    if (job.inspection === "patikrinta" && !text) return null;
    return {
      ...job, inspection,
      history: [...job.history, { at: now, text: text ? "Patikrinta: " + text : "Patikrinta" }],
    };
  }
  // A completed job must become pending again, retaining its original record.
  // Older scheduled dates roll over on the calendar; future dates move to today.
  const needsUpdate = job.inspection !== "taisyti" ||
    job.status !== "laukia" || job.priority !== "auksta" || job.date > today || !!text;
  if (!needsUpdate) return null;
  const pastCompletion = job.status === "atlikta" && job.completedAt
    ? " (ankstesnis užbaigimas: " + job.completedAt + ")" : "";
  return {
    ...job,
    status: "laukia",
    inspection: "taisyti",
    priority: "auksta",
    date: job.date > today ? today : job.date,
    completedAt: undefined,
    // Never reuse a GPS approval from a previous completion.
    gpsVerification: undefined,
    gpsOverride: undefined,
    history: [...job.history, {
      at: now, text: "Reikia taisyti – atidarytas tas pats darbas" +
        pastCompletion + (text ? ": " + text : ""),
    }],
  };
}

export function reopenWhenMadeUrgent(previous: Job, nextPriority: Job["priority"]): boolean {
  return previous.status === "atlikta" && previous.priority !== "auksta" &&
    nextPriority === "auksta" && !previous.archivedAt && !previous.deletedAt;
}
