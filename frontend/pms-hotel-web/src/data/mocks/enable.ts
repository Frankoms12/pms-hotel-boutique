import { getPublicEnvironment } from "@/lib/env";

let mockWorkerPromise: Promise<void> | null = null;

export async function enableMocking(): Promise<void> {
  if (typeof window === "undefined" || !getPublicEnvironment().useMockApi) {
    return;
  }

  mockWorkerPromise ??= (async () => {
    const { mockWorker } = await import("./browser");
    await mockWorker.start({
      serviceWorker: { url: "/pmsMockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });
  })().catch(error => {
    // A rejected startup must not permanently block retries.
    mockWorkerPromise = null;
    throw error;
  });

  await mockWorkerPromise;
}
