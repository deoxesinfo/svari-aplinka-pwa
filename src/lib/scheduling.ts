import type { Job, Priority } from "./types";

export function isOverdue(job: Job, today: string): boolean {
  return job.status === "laukia" && job.date < today;
}

/** Is this job a carryover shown on `day` (only today) though scheduled earlier? */
export function isCarryover(job: Job, day: string, today: string): boolean {
  return day === today && isOverdue(job, today);
}

/**
 * Jobs that appear on a given day. Unfinished jobs from earlier dates roll
 * forward onto today (same record, original date untouched).
 */
export function jobsForDay(jobs: Job[], day: string, today: string): Job[] {
  return jobs.filter((j) => j.date === day || isCarryover(j, day, today));
}

const PRIO: Record<Priority, number> = { auksta: 0, vidutine: 1, zema: 2 };

/** Overdue first (oldest first), then pending by priority, completed at the bottom. */
export function sortJobs(jobs: Job[], today: string): Job[] {
  return [...jobs].sort((a, b) => {
    const ra = a.status === "atlikta" ? 2 : isOverdue(a, today) ? 0 : 1;
    const rb = b.status === "atlikta" ? 2 : isOverdue(b, today) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    if (ra === 0 && a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (ra === 2) return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    return PRIO[a.priority] - PRIO[b.priority];
  });
}

export function summarize(jobs: Job[], today: string) {
  const done = jobs.filter((j) => j.status === "atlikta").length;
  const overdue = jobs.filter((j) => isOverdue(j, today)).length;
  return { all: jobs.length, done, pending: jobs.length - done, overdue };
}