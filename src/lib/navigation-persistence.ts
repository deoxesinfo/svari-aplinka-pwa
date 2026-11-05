/**
 * GitHub Pages uses hash routes. On a browser refresh the hash normally survives,
 * but a few installed PWA/browser flows return to the base URL without it.
 * Restore only on an actual reload and only when there is no explicit route.
 */
export const SA_LAST_ROUTE_KEY="sa-pwa-last-route-v1";
export const SA_ACCOUNT_TAB_KEY="sa-pwa-account-tab-v1";
const NAV_PATHS = new Set([
  "kalendorius","darbai","adresai","darbuotojai","pranesimai",
  "analitika","nuotraukos","saugykla","patikrinimai",
  "pakeitimai","istorija","paskyra","nustatymai",
]);
export function saCanRestoreRoute(saved:string|null):saved is string {
  if(!saved || saved==="/")return false;
  if(saved.includes("#") || saved.includes("://") || saved.includes("\\") || saved.length>512)return false;
  const match=/^\/([a-z-]+)(?:\/[a-zA-Z0-9_-]+)*\/?(?:\?[^#]*)?$/.exec(saved);
  return !!match && NAV_PATHS.has(match[1]);
}
export function saRouteToRestore(
  currentHash:string,
  previousRoute:string|null,
  isReload:boolean,
  search:string,
):string|null {
  if(!isReload || search.includes("sa_auth="))return null;
  if(currentHash && currentHash!=="#" && currentHash!=="#/" && currentHash!=="#!/")return null;
  return saCanRestoreRoute(previousRoute)?previousRoute:null;
}
