import {describe,expect,it} from "vitest";
import {applyInspection,reopenWhenMadeUrgent} from "@/lib/job-followup";
import type {Job} from "@/lib/types";

const now="2026-10-19T15:00:00.000Z";
const base:Job={
  id:"job-1",addressId:"address-1",type:"laiptine",worker:"Darbuotojas A",
  date:"2026-10-18",priority:"vidutine",instructions:"Planuotas valymas",
  status:"atlikta",inspection:"patikrinta",notes:"",
  createdAt:"2026-10-18T08:00:00.000Z",completedAt:"2026-10-18T12:00:00.000Z",
  comments:[{id:"comment-1",at:"2026-10-18T11:00:00.000Z",text:"Pradinė pastaba"}],
  history:[{at:"2026-10-18T08:00:00.000Z",text:"Darbas sukurtas"}],
  gpsOverride:{checkedAt:"2026-10-18T09:00:00.000Z",reason:"Senas GPS patvirtinimas"},
};
describe("ŠA V2.3.18: same work record on inspection",()=>{
  it("reopens an already completed job without changing ID, comments or original history",()=>{
    const updated=applyInspection(base,"taisyti",now,"2026-10-19");
    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(base.id);
    expect(updated?.status).toBe("laukia");
    expect(updated?.priority).toBe("auksta");
    expect(updated?.inspection).toBe("taisyti");
    expect(updated?.date).toBe(base.date);
    expect(updated?.completedAt).toBeUndefined();
    expect(updated?.gpsOverride).toBeUndefined();
    expect(updated?.comments).toEqual(base.comments);
    expect(updated?.history).toHaveLength(2);
    expect(updated?.history[1].text).toContain(base.completedAt);
  });
  it("does not create another change when the same button is tapped twice",()=>{
    const updated=applyInspection(base,"taisyti",now,"2026-10-19")!;
    expect(applyInspection(updated,"taisyti",now,"2026-10-19")).toBeNull();
    expect(updated.id).toBe(base.id);
  });
  it("moves a future job to today so it is visible among pending work",()=>{
    const updated=applyInspection({...base,date:"2026-10-25"},"taisyti",now,"2026-10-19");
    expect(updated?.date).toBe("2026-10-19");
  });
  it("a completed inspection does not open a new job",()=>{
    const alreadyChecked=applyInspection(base,"patikrinta",now,"2026-10-19");
    expect(alreadyChecked).toBeNull();
  });
  it("a note remains attached to the same job, not a new child",()=>{
    const updated=applyInspection(base,"taisyti",now,"2026-10-19","Nuvalyti iš naujo");
    expect(updated?.history.at(-1)?.text).toContain("Nuvalyti iš naujo");
    expect(updated?.parentJobId).toBeUndefined();
  });
  it("a previously done job reopened by newly applied urgency only",()=>{
    expect(reopenWhenMadeUrgent(base,"auksta")).toBe(true);
    expect(reopenWhenMadeUrgent({...base,priority:"auksta"},"auksta")).toBe(false);
    expect(reopenWhenMadeUrgent({...base,status:"laukia"},"auksta")).toBe(false);
  });
  it("never changes a deleted or archived job",()=>{
    expect(applyInspection({...base,deletedAt:now},"taisyti",now,"2026-10-19")).toBeNull();
    expect(applyInspection({...base,archivedAt:now},"taisyti",now,"2026-10-19")).toBeNull();
  });
});
