import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SA_LAST_ROUTE_KEY, saRouteToRestore } from "./lib/navigation-persistence";

// Only on browser reload, restore a previously opened hash route if it was lost.
if (typeof window !== "undefined") {
  try {
    const navigation=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
    const previous=sessionStorage.getItem(SA_LAST_ROUTE_KEY);
    const target=saRouteToRestore(window.location.hash,previous,navigation?.type==="reload",window.location.search);
    if(target)window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search+"#"+target);
  } catch {/* Private browsing or disabled session storage: leave the current URL unchanged. */}
}

export const router = createRouter({ routeTree, history: createHashHistory(), defaultPreload: "intent", scrollRestoration: true });
declare module "@tanstack/react-router" { interface Register { router: typeof router } }
