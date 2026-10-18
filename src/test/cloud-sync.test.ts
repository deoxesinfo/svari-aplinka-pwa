import {describe,it,expect} from "vitest";
import { cloudMutations,isCloudUUID } from "@/lib/cloud-sync";
import type {AppState} from "@/lib/store";
const ORG="ef6edcc2-1c7d-4dd1-8ef2-67c2b5a89bff";
const ADDR="00000000-0000-4000-8000-000000000002";
const JOB="00000000-0000-4000-8000-000000000003";
const empty:AppState={loaded:true,addresses:[],jobs:[],photos:[],workers:[],people:[],recruitmentLinks:[]};
describe("Supabase sinchronizavimo sluoksnis",()=>{
 it("nepriima senų DEMO ID kaip UUID",()=>{expect(isCloudUUID("building-1")).toBe(false);expect(isCloudUUID(ADDR)).toBe(true);});
 it("naujus adresus įterpia prieš jiems priklausančius darbus",()=>{
  const next={...empty,addresses:[{id:ADDR,street:"Pavyzdžių g.",city:"Kaunas"}] as never,
    jobs:[{id:JOB,addressId:ADDR,worker:"DEMO"}] as never};
  expect(cloudMutations(empty,next,ORG).map(a=>a.table)).toEqual(["sa_addresses","sa_jobs"]);
 });
 it("demo duomenys neperduodami, kai pradinis debesijos snapshotas tuščias",()=>{expect(cloudMutations(empty,empty,ORG)).toEqual([]);});
 it("pašalinant adresą pirmiau šalinamos jam priklausančios užduotys",()=>{
  const old={...empty,addresses:[{id:ADDR}] as never,jobs:[{id:JOB}] as never};
  expect(cloudMutations(old,empty,ORG).map(a=>a.table)).toEqual(["sa_jobs","sa_addresses"]);
 });
});
