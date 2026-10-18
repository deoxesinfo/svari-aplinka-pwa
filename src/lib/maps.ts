/** Official Google Maps directions; Maps chooses start location when permission is granted. */
export function mapsDirectionsUrl(street: string, city: string): string {
  const destination = [street.trim(), city.trim(), "Lietuva"].filter(Boolean).join(", ");
  const params = new URLSearchParams({ api: "1", destination, travelmode: "driving", dir_action: "navigate" });
  return "https://www.google.com/maps/dir/?" + params.toString();
}

/** The exact manually confirmed pin is preferred to approximate address search. */
export function mapsPlaceUrl(street:string,city:string,latitude?:number,longitude?:number,confirmed=false):string{
 if(confirmed&&Number.isFinite(latitude)&&Number.isFinite(longitude)){
   return "https://www.google.com/maps/search/?"+new URLSearchParams({api:"1",query:latitude+","+longitude});
 }
 return "https://www.google.com/maps/search/?"+new URLSearchParams({api:"1",query:[street.trim(),city.trim(),"Lietuva"].filter(Boolean).join(", ")});
}
export function mapsDirectionsToPoint(street:string,city:string,latitude?:number,longitude?:number,confirmed=false):string{
 if(confirmed&&Number.isFinite(latitude)&&Number.isFinite(longitude)){
   return "https://www.google.com/maps/dir/?"+new URLSearchParams({api:"1",destination:latitude+","+longitude,travelmode:"driving",dir_action:"navigate"});
 }
 return mapsDirectionsUrl(street,city);
}
