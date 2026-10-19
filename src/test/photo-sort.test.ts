import { describe, expect, it } from "vitest";
import { newestPhotosFirst } from "@/lib/photo-sort";

describe("ŠA V2.3.15 galerijų tvarka",()=>{
  const oldest={id:"a",createdAt:"2026-10-19T12:20:00Z",tag:"pries"};
  const newest={id:"b",createdAt:"2026-10-19T12:40:00Z",tag:"po"};
  const middle={id:"c",createdAt:"2026-10-19T12:30:00Z",tag:"problema"};
  it("rikiuoja tik pagal įkėlimo laiką, ne atsitiktinį ID ar žymą",()=>{
    const original=[middle,oldest,newest];
    const sorted=newestPhotosFirst(original);
    expect(sorted.map(x=>x.id)).toEqual(["b","c","a"]);
    expect(original).toEqual([middle,oldest,newest]);
    expect(sorted.map(x=>x.tag)).toEqual(["po","problema","pries"]);
  });
  it("vienodo laiko bei nekorektiškų laikų tvarka stabili",()=>{
    expect(newestPhotosFirst([{id:"a",createdAt:"invalid"},{id:"z",createdAt:"invalid"}]).map(x=>x.id)).toEqual(["z","a"]);
  });
});
