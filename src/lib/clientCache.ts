/*
  Tiny stale-while-revalidate cache for client-side KPI fetches. Lives for
  the browser tab's lifetime (module scope, cleared on full reload). Callers
  render the cached value immediately and refresh it in the background, so
  revisiting a module shows numbers instantly instead of skeletons.
*/
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}
