/** Official Google Maps directions; Maps chooses start location when permission is granted. */
export function mapsDirectionsUrl(street: string, city: string): string {
  const destination = [street.trim(), city.trim(), "Lietuva"].filter(Boolean).join(", ");
  const params = new URLSearchParams({ api: "1", destination, travelmode: "driving", dir_action: "navigate" });
  return "https://www.google.com/maps/dir/?" + params.toString();
}
