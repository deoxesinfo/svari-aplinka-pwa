import { describe, expect, it } from "vitest";
import { personPositionLabel, type Person } from "@/lib/types";
const person = (overrides: Partial<Person>): Person => ({
  id: "p1", name: "Test Person", role: "darbuotojas", status: "aktyvus",
  notes: "", createdAt: "2026-10-29T00:00:00Z", position: "valytojas", ...overrides,
});
describe("ŠA V2.3.25 personnel import fields", () => {
  it("uses exact position titles instead of the generic category", () => {
    expect(personPositionLabel(person({position: "kita", positionTitle:"Teritorijos tvarkytojas"}))).toBe("Teritorijos tvarkytojas");
    expect(personPositionLabel(person({role: "vadybininkas",position: "kita",positionTitle: "Direktorė"}))).toBe("Direktorė");
  });
  it("keeps legacy labels where no custom title exists", () => {
    expect(personPositionLabel(person({}))).toBe("Valytojas (-a)");
  });
  it("preserves zero-padded employee codes and hire dates", () => {
    const p=person({employeeCode:"005",startedAt:"2023-09-01",employmentPeriods:[{startedAt:"2023-09-01"}]});
    expect(p.employeeCode).toBe("005");
    expect(p.startedAt).toBe("2023-09-01");
    expect(p.employmentPeriods?.[0].startedAt).toBe(p.startedAt);
  });
});
