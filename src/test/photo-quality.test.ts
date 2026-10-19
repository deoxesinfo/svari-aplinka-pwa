import {describe,it,expect} from "vitest";
import { choosePhotoVariant,PHOTO_MAX_BYTES,PHOTO_TARGET_BYTES,THUMB_MAX_BYTES,type EncodedVariant } from "@/lib/photo-quality";

const example=(maxEdge:number,bytes:number):EncodedVariant=>({
 blob:new Blob([new Uint8Array(bytes)],{type:"image/webp"}),
 maxEdge,width:maxEdge,height:Math.round(maxEdge*0.69)
});
describe("V2.3.10 nuotraukų dydžio kontrolė",()=>{
 it("prefers 2000px WebP when cost is under 35% of 1600px baseline",()=>{
  const base=example(1600,308*1024),large=example(2000,327*1024),mid=example(1800,276*1024);
  expect(choosePhotoVariant(base,large,mid)).toBe(large);
 });
 it("falls back to 1800px when 2000px is disproportionately large",()=>{
  const base=example(1600,400*1024),large=example(2000,900*1024),mid=example(1800,495*1024);
  expect(choosePhotoVariant(base,large,mid)).toBe(mid);
 });
 it("keeps 1600px when no larger variant fits budget",()=>{
  const base=example(1600,700*1024),large=example(2000,1900*1024),mid=example(1800,1700*1024);
  expect(choosePhotoVariant(base,large,mid)).toBe(base);
 });
 it("does not upscale 1000px originals",()=>{
  const base=example(1000,99*1024);
  expect(choosePhotoVariant(base,example(1000,60*1024))).toBe(base);
 });
 it("never selects image larger than Worker bound",()=>{
  const base=example(1600,2100*1024),large=example(2000,3300*1024);
  expect(choosePhotoVariant(base,large)).toBe(base);
  expect(PHOTO_MAX_BYTES).toBe(3*1024*1024);
  expect(THUMB_MAX_BYTES).toBe(512*1024);
  expect(PHOTO_TARGET_BYTES).toBeGreaterThan(1500*1024);
 });
});
