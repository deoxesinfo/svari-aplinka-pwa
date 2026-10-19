import { afterEach, describe, expect, it, vi } from "vitest";
const { getSession }=vi.hoisted(()=>({
  getSession:vi.fn().mockResolvedValue({data:{session:{access_token:"test-user-jwt"}},error:null})
}));
vi.mock("@/lib/supabase-client",()=>({supabase:{auth:{getSession}}}));
import { CLOUD_R2_PHOTOS_READY, R2_WORKER_URL,downloadR2Photo,uploadR2Photo } from "@/lib/r2-photos";
const ORG="d80c364b-df9c-4de4-a746-9e68f2382b20";
const ADR="9d156bd9-6968-4e64-aa70-b5b72e5a3a79";
describe("R2 private browser client (DRAFT, no deploy)",()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it("cloud photo feature stays disabled until approved activation",()=>{
  expect(CLOUD_R2_PHOTOS_READY).toBe(false);
 });
 it("uploads only authenticated compressed files and no R2 secret",async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:"abcd"})});
  vi.stubGlobal("fetch",fetchMock);
  const full=new Blob(["RIFF...WEBPdata"],{type:"image/webp"});
  await uploadR2Photo(ORG,ADR,undefined,"po",full,full,150,120);
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url,opts]=fetchMock.mock.calls[0] as [string,RequestInit];
  expect(url).toBe(R2_WORKER_URL+"/v1/photos");
  expect(opts.method).toBe("POST");
  expect((opts.headers as Record<string,string>).authorization).toBe("Bearer test-user-jwt");
  expect((opts.headers as Record<string,string>)["x-organization-id"]).toBe(ORG);
  const fd=opts.body as FormData;
  expect(fd.get("addressId")).toBe(ADR);
  expect(fd.get("jobId")).toBeNull();
  expect(fd.get("tag")).toBe("po");
 });
 it("fetches thumbnails as authenticated blobs rather than public image URLs",async()=>{
  const blob=new Blob(["sample"],{type:"image/webp"});
  const fetchMock=vi.fn().mockResolvedValue({ok:true,blob:async()=>blob});
  vi.stubGlobal("fetch",fetchMock);
  expect(await downloadR2Photo(ORG,"787b1234-8cb1-4f4c-a05a-608fdc3a2ae8","thumb")).toBe(blob);
  expect(fetchMock.mock.calls[0][1].headers.authorization).toBe("Bearer test-user-jwt");
  expect(fetchMock.mock.calls[0][1].cache).toBe("no-store");
 });
 it("fails closed without valid Supabase session",async()=>{
  getSession.mockResolvedValueOnce({data:{session:null},error:null});
  await expect(downloadR2Photo(ORG,"787b1234-8cb1-4f4c-a05a-608fdc3a2ae8","full")).rejects.toThrow("Prisijunkite");
 });
});