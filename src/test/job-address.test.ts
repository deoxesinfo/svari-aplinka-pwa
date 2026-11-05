import { describe, expect, it } from "vitest";
import { isAvailableJobAddress, selectDefaultJobAddressId } from "@/lib/job-address";
import type { Address } from "@/lib/types";

const address=(id:string, extra:Partial<Address>={})=>({id,street:"Testavimo g.",city:"Kaunas",...extra} as Address);

describe("Darbų formos aktyvių adresų patikra",()=>{
  it("neleidžia pasirinkti pašalinto arba archyvuoto adreso",()=>{
    expect(isAvailableJobAddress(address("1",{deletedAt:"2026-10-19T07:00:00Z"}))).toBe(false);
    expect(isAvailableJobAddress(address("2",{archivedAt:"2026-10-19T07:00:00Z"}))).toBe(false);
    expect(isAvailableJobAddress(address("3"))).toBe(true);
    expect(isAvailableJobAddress(undefined)).toBe(false);
  });
  it("nepasirenka pirmo pašalinto adreso pagal nutylėjimą",()=>{
    const records=[address("deleted",{deletedAt:"2026-10-19T07:00:00Z"}),address("valid")];
    expect(selectDefaultJobAddressId(records)).toBe("valid");
    expect(selectDefaultJobAddressId(records,"deleted")).toBe("valid");
    expect(selectDefaultJobAddressId(records,"valid")).toBe("valid");
  });
  it("kai visi adresai pašalinti, neleidžia parinkti neteisingo adreso",()=>{
    const records=[address("deleted",{deletedAt:"2026-10-19T07:00:00Z"}),address("archived",{archivedAt:"2026-10-19T07:00:00Z"})];
    expect(selectDefaultJobAddressId(records)).toBe("");
    expect(selectDefaultJobAddressId(records,"deleted")).toBe("");
  });
});
