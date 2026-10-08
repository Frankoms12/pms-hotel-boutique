import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";

import { mockServer } from "@/data/mocks/server";
import {
  httpRequest,
  HttpStatusError,
  HttpUnauthorizedError,
  HttpForbiddenError,
  HttpNetworkError,
  setAuthToken,
  getAuthToken,
  onUnauthorized,
  addRequestInterceptor,
  addResponseInterceptor,
} from "./index";

describe("httpRequest client with Interceptors", () => {
  beforeEach(() => {
    setAuthToken(null);
    onUnauthorized(null);
    vi.restoreAllMocks();
  });

  it("performs standard GET request successfully", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" }),
    } as Response);

    const data = await httpRequest<{ status: string }>({ path: "/api/test" });
    expect(fetchSpy).toHaveBeenCalled();
    expect(data).toEqual({ status: "ok" });
  });

  it("automatically injects Authorization Bearer header when token is set", async () => {
    setAuthToken("jwt_mock_token_12345");
    expect(getAuthToken()).toBe("jwt_mock_token_12345");

    let capturedHeaders: Headers | undefined;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return {
        ok: true,
        status: 200,
        json: async () => ({ authenticated: true }),
      } as Response;
    });

    await httpRequest({ path: "/api/protected" });

    expect(capturedHeaders?.get("Authorization")).toBe("Bearer jwt_mock_token_12345");
  });

  it("does not inject Authorization header when withAuth is explicitly false", async () => {
    setAuthToken("jwt_mock_token_12345");

    let capturedHeaders: Headers | undefined;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return {
        ok: true,
        status: 200,
        json: async () => ({ public: true }),
      } as Response;
    });

    await httpRequest({ path: "/api/public", withAuth: false });

    expect(capturedHeaders?.get("Authorization")).toBeNull();
  });

  it("serializes json option and sets Content-Type application/json", async () => {
    let capturedBody: unknown;
    let capturedContentType: string | null = null;

    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      const headers = new Headers(init?.headers);
      capturedContentType = headers.get("Content-Type");
      capturedBody = init?.body;
      return {
        ok: true,
        status: 200,
        json: async () => ({ created: true }),
      } as Response;
    });

    await httpRequest({
      path: "/api/items",
      method: "POST",
      json: { name: "Suite Deluxe", capacity: 2 },
    });

    expect(capturedContentType).toBe("application/json");
    expect(capturedBody).toBe(JSON.stringify({ name: "Suite Deluxe", capacity: 2 }));
  });

  it("formats and appends query params to URL", async () => {
    let capturedUrl: string | undefined;

    vi.spyOn(global, "fetch").mockImplementationOnce(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        status: 200,
        json: async () => [],
      } as Response;
    });

    await httpRequest({
      path: "/api/search",
      params: { query: "hotel", page: 1, available: true, ignored: null },
    });

    expect(capturedUrl).toContain("query=hotel");
    expect(capturedUrl).toContain("page=1");
    expect(capturedUrl).toContain("available=true");
    expect(capturedUrl).not.toContain("ignored");
  });

  it("triggers onUnauthorized and throws HttpUnauthorizedError on 401", async () => {
    const unauthorizedSpy = vi.fn();
    onUnauthorized(unauthorizedSpy);

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Session expired" }),
    } as Response);

    await expect(httpRequest({ path: "/api/secret" })).rejects.toBeInstanceOf(
      HttpUnauthorizedError
    );
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves a cookie BFF 401 without broadcasting a global unauthorized event", async () => {
    const listener = vi.fn();
    const unsubscribe = onUnauthorized(listener);
    mockServer.use(http.get("http://pms.test/api/auth/guest/session", () => new HttpResponse(null, { status: 401 })));
    try {
      await expect(httpRequest({ path: "http://pms.test/api/auth/guest/session", withAuth: false })).rejects.toBeInstanceOf(HttpUnauthorizedError);
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });

  it("throws HttpForbiddenError on 403 status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ error: "Insufficient permissions" }),
    } as Response);

    await expect(httpRequest({ path: "/api/admin" })).rejects.toBeInstanceOf(
      HttpForbiddenError
    );
  });

  it("throws HttpNetworkError on fetch network rejection", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(httpRequest({ path: "/api/network-down" })).rejects.toBeInstanceOf(
      HttpNetworkError
    );
  });

  it("executes custom request and response interceptors", async () => {
    const removeReq = addRequestInterceptor((opts) => {
      const headers = new Headers(opts.headers);
      headers.set("X-Custom-Client", "FD1-PMS");
      return { ...opts, headers };
    });

    const removeRes = addResponseInterceptor(<T>(data: T) => {
      return { ...(data as object), intercepted: true } as T;
    });

    let capturedHeaders: Headers | undefined;
    vi.spyOn(global, "fetch").mockImplementationOnce(async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: "data" }),
      } as Response;
    });

    const result = await httpRequest<{ result: string; intercepted?: boolean }>({
      path: "/api/intercepted",
    });

    expect(capturedHeaders?.get("X-Custom-Client")).toBe("FD1-PMS");
    expect(result.intercepted).toBe(true);

    removeReq();
    removeRes();
  });

  it("supports an empty successful response for BFF logout", async () => {
    mockServer.use(http.delete("http://pms.test/__msw/session", () => new HttpResponse(null, { status: 204 })));
    const res = await httpRequest<void>({ path: "http://pms.test/__msw/session", method: "DELETE" });
    expect(res).toBeFalsy();
  });
});
