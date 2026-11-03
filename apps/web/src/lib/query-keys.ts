import type { PageQuery } from "@ajc/contracts";

const WORLDS_ROOT = "worlds";

// Everything cached for a world sits under its id, so data from world A can never be served for world B
// (the first promise of the product). Each feature calls this once: `const assetKeys = createWorldQueryKeys("assets")`.
export function createWorldQueryKeys<Filters extends PageQuery = PageQuery>(scope: string) {
  const all = (worldId: string) => [WORLDS_ROOT, worldId, scope] as const;
  return {
    all,
    lists: (worldId: string) => [...all(worldId), "list"] as const,
    list: (worldId: string, filters: Filters) => [...all(worldId), "list", filters] as const,
    details: (worldId: string) => [...all(worldId), "detail"] as const,
    detail: (worldId: string, id: string) => [...all(worldId), "detail", id] as const,
  };
}
