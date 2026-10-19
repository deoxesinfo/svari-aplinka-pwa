import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddressLocationPicker } from "@/components/app/AddressLocationPicker";
import type { AddressInput } from "@/lib/store";
import { addressReference } from "@/lib/address-gps";
import { findAddressCandidates } from "@/lib/geocode-address";

vi.mock("@/lib/geocode-address",()=>({
  findAddressCandidates:vi.fn(async()=>[{
    lat:54.917,lon:23.943,exactHouse:true,
    name:"Partizanų gatvė 166, Kaunas",source:"OpenStreetMap"
  }])
}));
vi.mock("leaflet",()=>{
  const map={
    setView:vi.fn().mockReturnThis(),on:vi.fn().mockReturnThis(),
    invalidateSize:vi.fn(),remove:vi.fn(),
  };
  return {
    map:vi.fn(()=>map),
    tileLayer:vi.fn(()=>({addTo:vi.fn()})),
    divIcon:vi.fn(()=>({})),
    marker:vi.fn(()=>({addTo:vi.fn().mockReturnThis(),on:vi.fn(),setLatLng:vi.fn(),getLatLng:()=>({lat:54.917,lng:23.943})}))
  };
});
function Harness(){
  const [value,setValue]=useState<AddressInput>({
    street:"",city:"",type:"abu",status:"aktyvus",
    entrances:1,isPriority:false,gpsProtectionEnabled:false
  } as AddressInput);
  return <>
    <button onClick={()=>setValue(v=>({...v,street:"Partizanų g. 166",city:"Kaunas"}))}>Įrašyti adresą</button>
    <AddressLocationPicker value={value} onChange={patch=>setValue(v=>({...v,...patch}))}/>
    <output data-testid="selected-gps">{JSON.stringify({
      latitude:value.latitude,longitude:value.longitude,
      confirmed:value.gpsLocationConfirmed,reference:value.gpsReference
    })}</output>
  </>;
}
describe("ŠA V2.3.16 GPS paieškos iPhone sąsajos regresija",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal("requestAnimationFrame",(cb:FrameRequestCallback)=>{cb(0);return 1;});});
  afterEach(()=>{cleanup();vi.unstubAllGlobals();});
  it("paieškos mygtukas veikia po adreso įvedimo ir nepatvirtina GPS automatiškai",async()=>{
    render(<Harness/>);
    fireEvent.click(screen.getByRole("checkbox",{name:/Apsaugoti nuotraukas ir darbus pagal GPS/}));
    fireEvent.click(screen.getByRole("button",{name:"Ieškoti pagal adresą"}));
    expect(screen.getByRole("alert")).toHaveTextContent("Pirma įrašykite");
    fireEvent.click(screen.getByRole("button",{name:"Įrašyti adresą"}));
    await waitFor(()=>expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button",{name:"Ieškoti pagal adresą"}));
    await waitFor(()=>expect(findAddressCandidates).toHaveBeenCalledWith("Partizanų g. 166","Kaunas"));
    await waitFor(()=>expect(screen.getByText("Partizanų gatvė 166, Kaunas")).toBeInTheDocument());
    expect(screen.getByTestId("selected-gps")).not.toHaveTextContent('"confirmed":true');
    fireEvent.click(screen.getByRole("button",{name:"Patvirtinti namo vietą"}));
    expect(screen.getByTestId("selected-gps")).toHaveTextContent('"confirmed":true');
    expect(screen.getByTestId("selected-gps")).toHaveTextContent(addressReference("Partizanų g. 166","Kaunas"));
  });
  it("Naudoti mano GPS vietą prašo leidimo tik paspaudus, rodo tikslumą ir prašo patvirtinimo",async()=>{
    const getCurrentPosition=vi.fn((success:PositionCallback)=>{
      success({coords:{latitude:54.91,longitude:23.92,accuracy:85}} as GeolocationPosition);
    });
    Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition},configurable:true});
    render(<Harness/>);
    fireEvent.click(screen.getByRole("button",{name:"Įrašyti adresą"}));
    fireEvent.click(screen.getByRole("checkbox",{name:/Apsaugoti nuotraukas ir darbus pagal GPS/}));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Naudoti mano GPS vietą"}));
    await waitFor(()=>expect(getCurrentPosition).toHaveBeenCalledOnce());
    expect(screen.getByText(/Telefono GPS tikslumas: apie 85 m/)).toBeInTheDocument();
    expect(screen.getByTestId("selected-gps")).toHaveTextContent('"latitude":54.91');
    expect(screen.getByTestId("selected-gps")).not.toHaveTextContent('"confirmed":true');
    fireEvent.click(screen.getByRole("button",{name:"Patvirtinti namo vietą"}));
    expect(screen.getByTestId("selected-gps")).toHaveTextContent('"confirmed":true');
  });
  it("be GPS leidimo leidžia rankinį vietos pažymėjimą",async()=>{
    const getCurrentPosition=vi.fn((_ok:PositionCallback,fail:PositionErrorCallback)=>fail({code:1} as GeolocationPositionError));
    Object.defineProperty(navigator,"geolocation",{value:{getCurrentPosition},configurable:true});
    render(<Harness/>);
    fireEvent.click(screen.getByRole("button",{name:"Įrašyti adresą"}));
    fireEvent.click(screen.getByRole("checkbox",{name:/Apsaugoti nuotraukas ir darbus pagal GPS/}));
    fireEvent.click(screen.getByRole("button",{name:"Naudoti mano GPS vietą"}));
    await waitFor(()=>expect(screen.getByText(/Vietos leidimas nesuteiktas/)).toBeInTheDocument());
    expect(screen.getByText(/Žemėlapyje bakstelėkite ant namo/)).toBeInTheDocument();
  });
});
