import { describe,expect,it } from "vitest";
import { CLOUD_TABLES,isUuid } from "@/lib/cloud-read";
describe("Debesijos nuskaitymo paruošimas",()=>{
 it("neišgalvoja tinkamo UUID senoms DEMO adreso žymoms",()=>{
   expect(isUuid("address-1")).toBe(false);
   expect(isUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
   expect(isUuid("../../others")).toBe(false);
 });
 it("tiksliai apibrėžia saugiai peržiūrimas lenteles",()=>{
   expect(CLOUD_TABLES).toContain("sa_addresses");
   expect(CLOUD_TABLES).toContain("sa_jobs");
   expect(CLOUD_TABLES).toContain("sa_photo_metadata");
 });
});
