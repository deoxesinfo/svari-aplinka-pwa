import {describe,it,expect} from "vitest";
import {mapsPlaceUrl,mapsDirectionsToPoint} from "@/lib/maps";
describe("Google Maps tikslus objektas",()=>{
 it("patvirtintai koordinatei perduoda pin vietą",()=>{
  const link=mapsPlaceUrl("Tunelio g. 22","Kaunas",54.902,23.92,true);
  expect(decodeURIComponent(link)).toContain("54.902,23.92");
 });
 it("nepatvirtintai vietai naudoja adresą, o ne seną pin",()=>{
  const link=mapsPlaceUrl("Tunelio g. 22","Kaunas",54.902,23.92,false);
  expect(link).not.toContain("54.902");
  expect(new URL(link).searchParams.get("query")).toContain("Tunelio g. 22");
 });
 it("navigacijai tinkama tiksli vieta",()=>{
  const link=mapsDirectionsToPoint("A","B",54.902,23.92,true);
  expect(decodeURIComponent(link)).toContain("destination=54.902,23.92");
 });
});
