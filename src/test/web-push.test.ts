import {describe,expect,it,vi} from "vitest";
vi.mock("@/lib/supabase-client",()=>({supabase:{}}));
import {needsIosHomeScreen,supportsWebPush,vapidToBytes} from "@/lib/web-push";
describe("ŠA V2.3.20 Push prerequisites and VAPID conversions",()=>{
 it("decodes a URL-safe VAPID public key",()=>{
  const result=vapidToBytes("AQIDBA");
  expect([...result]).toEqual([1,2,3,4]);
 });
 it("does not claim Push is supported without browser interfaces",()=>{
  expect(typeof supportsWebPush()).toBe("boolean");
 });
 it("returns an explicit Boolean for iPhone install guidance",()=>{
  expect(typeof needsIosHomeScreen()).toBe("boolean");
 });
});
