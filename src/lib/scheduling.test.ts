import { describe, expect, it } from "vitest";
import { jobsForDay, sortJobs, summarize } from "./scheduling";
import { overdueLabel } from "./dates";
import type { Job } from "./types";

const job = (id: string, date: string, status: Job["status"] = "laukia"): Job => ({
  id, addressId: "a", type: "laiptine", worker: "x", date, priority: "vidutine", instructions: "",
  status, inspection: null, notes: "", createdAt: "", comments: [], history: [],
  completedAt: status === "atlikta" ? "2026-10-18T10:00:00Z" : undefined,
});

const today = "2026-10-18";

describe("scheduling", () => {
  it("unfinished earlier job rolls forward onto today without duplication", () => {
    const jobs = [job("old", "2026-10-16"), job("t", today)];
    const ids = jobsForDay(jobs, today, today).map((j) => j.id);
    expect(ids).toEqual(["old", "t"]);
    expect(jobsForDay(jobs, "2026-10-16", today).map((j) => j.id)).toEqual(["old"]);
  });
  it("completed earlier job does not roll forward", () => {
    expect(jobsForDay([job("old", "2026-10-16", "atlikta")], today, today)).toHaveLength(0);
  });
  it("overdue first, completed last", () => {
    const sorted = sortJobs([job("done", today, "atlikta"), job("t", today), job("old", "2026-10-15")], today);
    expect(sorted.map((j) => j.id)).toEqual(["old", "t", "done"]);
  });
  it("summary counts overdue", () => {
    expect(summarize([job("a", "2026-10-16"), job("b", today, "atlikta")], today)).toEqual({ all: 2, done: 1, pending: 1, overdue: 1 });
  });
  it("overdue label uses weekday", () => {
    expect(overdueLabel("2026-10-17", today)).toBe("Iš vakar");
    expect(overdueLabel("2026-10-12", today)).toBe("Iš pirmadienio");
  });
});