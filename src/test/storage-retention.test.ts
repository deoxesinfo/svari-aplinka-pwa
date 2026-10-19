import { describe, expect, it } from "vitest";
import { bytesLabel, cutoffDate, olderThan } from "@/lib/storage-admin";

describe("V2.3.13 manual retention logic", () => {
  const today = new Date("2026-10-19T12:00:00.000Z");
  it("uses 30 exact UTC days for the 30-day filter", () => {
    expect(cutoffDate("30d", today).toISOString()).toBe("2026-09-19T12:00:00.000Z");
    expect(olderThan("2026-09-19T11:59:59.000Z", "30d", today)).toBe(true);
    expect(olderThan("2026-09-19T12:00:00.000Z", "30d", today)).toBe(false);
  });
  it("uses calendar months for 6, 12 and 24 months", () => {
    expect(cutoffDate("6m", today).toISOString()).toBe("2026-04-19T12:00:00.000Z");
    expect(cutoffDate("12m", today).toISOString()).toBe("2025-10-19T12:00:00.000Z");
    expect(cutoffDate("24m", today).toISOString()).toBe("2024-10-19T12:00:00.000Z");
  });
  it("clamps to month-end rather than rolling February into March", () => {
    expect(cutoffDate("12m", new Date("2024-02-29T12:00:00.000Z")).toISOString())
      .toBe("2023-02-28T12:00:00.000Z");
  });
  it("never considers absent or invalid timestamps old", () => {
    expect(olderThan("invalid-date", "24m", today)).toBe(false);
    expect(olderThan("", "30d", today)).toBe(false);
  });
  it("renders unknown bytes explicitly, without inventing a numeric value", () => {
    expect(bytesLabel(undefined)).toBe("Nežinoma");
    expect(bytesLabel(0)).toBe("0 B");
  });
});
