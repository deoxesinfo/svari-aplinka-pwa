import { describe, expect, it } from "vitest";
import { personGroupLabel, personPositionLabel, type Person } from "@/lib/types";

const person = (overrides: Partial<Person> = {}): Person => ({
  id: "demo-id", name: "DEMO", role: "vadybininkas", status: "aktyvus",
  position: "vadybininkas", notes: "", createdAt: "2026-10-29T00:00:00Z", ...overrides,
});

describe("ŠA V2.3.26 – neprivaloma personalo grupė ir pareigos", () => {
  it("paslepia personalo grupės žymą nepakeisdama vidinio vaidmens", () => {
    const p = person({showPersonnelGroup: false});
    expect(personGroupLabel(p)).toBe("");
    expect(p.role).toBe("vadybininkas");
    expect(personGroupLabel({...p,showPersonnelGroup: true})).toBe("Vadybininkas (-ė)");
  });

  it("paslepia tik bendras pareigas, bet palieka originalų pareigų pavadinimą", () => {
    expect(personPositionLabel(person({position:"",positionTitle:"Direktorė"}))).toBe("Direktorė");
    expect(personPositionLabel(person({position:"",positionTitle:""}))).toBe("");
  });

  it("senieji įrašai be naujo parametro rodomi kaip anksčiau", () => {
    expect(personGroupLabel(person())).toBe("Vadybininkas (-ė)");
    expect(personPositionLabel(person({position:undefined,positionTitle:undefined}))).toBe("Vadybininkas (-ė)");
  });

  it("išsaugo abi tuščias reikšmes nepakeisdamas kodo, datos ir laikotarpių", () => {
    const p=person({showPersonnelGroup:false,position:"",employeeCode:"031",startedAt:"2024-10-09",
      employmentPeriods:[{startedAt:"2024-10-09"}]});
    const restored: Person=JSON.parse(JSON.stringify(p));
    expect(restored.showPersonnelGroup).toBe(false);
    expect(restored.position).toBe("");
    expect(restored.employeeCode).toBe("031");
    expect(restored.employmentPeriods?.[0].startedAt).toBe(restored.startedAt);
  });
});
