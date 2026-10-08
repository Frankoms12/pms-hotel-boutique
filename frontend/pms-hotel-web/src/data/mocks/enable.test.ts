import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { startMock } = vi.hoisted(() => ({ startMock: vi.fn() }));

vi.mock("./browser", () => ({ mockWorker: { start: startMock } }));

describe("enableMocking", () => {
  beforeEach(() => {
    vi.resetModules();
    startMock.mockReset().mockResolvedValue(undefined);
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
  });

  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("starts the worker only once across concurrent calls", async () => {
    const { enableMocking } = await import("./enable");

    await Promise.all([enableMocking(), enableMocking()]);

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the mock API is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    const { enableMocking } = await import("./enable");

    await enableMocking();

    expect(startMock).not.toHaveBeenCalled();
  });

  it("allows one shared retry after startup fails", async () => {
    startMock.mockRejectedValueOnce(new Error("Worker unavailable"));
    const { enableMocking } = await import("./enable");

    const results = await Promise.allSettled([enableMocking(), enableMocking()]);
    expect(results.map(result => result.status)).toEqual(["rejected", "rejected"]);
    expect(startMock).toHaveBeenCalledTimes(1);

    await Promise.all([enableMocking(), enableMocking()]);
    expect(startMock).toHaveBeenCalledTimes(2);
    expect(startMock).toHaveBeenLastCalledWith({
      serviceWorker: { url: "/pmsMockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });
  });

  it("does not start a browser worker during server rendering", async () => {
    vi.stubGlobal("window", undefined);
    const { enableMocking } = await import("./enable");
    await enableMocking();
    expect(startMock).not.toHaveBeenCalled();
  });
});
