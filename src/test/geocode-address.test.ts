import { afterEach, describe, expect, it, vi } from "vitest";
import { findAddressCandidates, fullStreetName, requestedHouseNumber } from "@/lib/geocode-address";

afterEach(()=>vi.unstubAllGlobals());

describe("ŠA V2.3.15 lietuviškų adresų paieška",()=>{
  it("supranta lietuvišką gatvės santrumpą ir namo numerį",()=>{
    expect(fullStreetName("Partizanų g. 166")).toBe("Partizanų gatvė 166");
    expect(requestedHouseNumber("Partizanų g. 166")).toBe("166");
  });
  it("pirmiausia ieško Photon, o nesuradus namo numerio bando OSM",async()=>{
    const requests:string[]=[];
    vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
      const url=String(input);requests.push(url);
      if(url.includes("photon.komoot.io")){
        return new Response(JSON.stringify({features:[{
          geometry:{coordinates:[23.89,54.91]},properties:{name:"Partizanų",city:"Kaunas"}
        }]}),{status:200});
      }
      if(url.includes("nominatim.openstreetmap.org")){
        return new Response(JSON.stringify([{
          lat:"54.913",lon:"23.934",display_name:"Partizanų gatvė 166, Kaunas, Lietuva",
          address:{house_number:"166",city:"Kaunas",road:"Partizanų gatvė"}
        }]),{status:200});
      }
      throw Error("Unknown endpoint");
    }));
    const result=await findAddressCandidates("Partizanų g. 166","Kaunas");
    expect(requests).toHaveLength(2);
    expect(new URL(requests[0]!).searchParams.get("q")).toContain("Partizanų gatvė 166");
    expect(result[0]).toMatchObject({exactHouse:true,source:"OpenStreetMap",lat:54.913});
    expect(result[1]!.exactHouse).toBe(false);
    expect((await findAddressCandidates("Partizanų g. 166","Kaunas"))).toEqual(result);
    expect(requests).toHaveLength(2); // cached; respects public search provider
  });
  it("netikrina apytikslio numerio kaip tikslaus namo",async()=>{
    vi.stubGlobal("fetch",vi.fn(async(input:string)=>{
      if(String(input).includes("photon"))return new Response(JSON.stringify({features:[]}),{status:200});
      return new Response(JSON.stringify([{lat:"54.90",lon:"23.91",display_name:"Partizanų gatvė, Kaunas",
        address:{road:"Partizanų gatvė",city:"Kaunas"}}]),{status:200});
    }));
    const found=await findAddressCandidates("Partizanų g. 167","Kaunas");
    expect(found).toHaveLength(1);
    expect(found[0]!.exactHouse).toBe(false);
  });
  it("tiekėjams neveikiant nepateikia išgalvotos koordinatės",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("unavailable",{status:503})));
    await expect(findAddressCandidates("Nerastos g. 999","Kaunas")).rejects.toThrow(/nepasiekiamos/);
  });
});
