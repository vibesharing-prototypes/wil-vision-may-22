export type ResolvedDataSource = "live" | "demo";

let resolved: ResolvedDataSource | null = null;
let resolvePromise: Promise<ResolvedDataSource> | null = null;
let fallbackNotified = false;

export function getResolvedDataSource(): ResolvedDataSource {
  return resolved ?? "demo";
}

export function shouldShowFallbackNotice(): boolean {
  if (fallbackNotified) return false;
  if (resolved !== "demo") return false;
  fallbackNotified = true;
  return true;
}

export async function resolveDataSource(
  checkLive: () => Promise<boolean>,
  mode: "live" | "mock" | "auto",
): Promise<ResolvedDataSource> {
  if (resolved) return resolved;
  if (!resolvePromise) {
    resolvePromise = (async () => {
      if (mode === "mock") {
        resolved = "demo";
        return resolved;
      }
      if (mode === "live") {
        resolved = (await checkLive()) ? "live" : "demo";
        return resolved;
      }
      resolved = (await checkLive()) ? "live" : "demo";
      return resolved;
    })();
  }
  return resolvePromise;
}

export function resetDataSourceForTests(): void {
  resolved = null;
  resolvePromise = null;
  fallbackNotified = false;
}
