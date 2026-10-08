import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockServer } from "@/data/mocks/server";
import { GuestSessionProvider, useGuestSession } from "@/modules/auth";
import PrivateLayout from "../layout";
import Dashboard from "./page";

const navigation = vi.hoisted(() => ({ replace:vi.fn(), push:vi.fn(), refresh:vi.fn(), back:vi.fn(), forward:vi.fn(), prefetch:vi.fn(), bfcacheId:"staff-regression" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const staffDTO = {
  staffUserId: "staff-demo", sessionId: "staff-session", username: "recepcion.demo", roleCode: "RECEPCION",
  permissions: ["RESERVATION_MANAGE", "SERVICE_REQUEST_INTAKE", "FOLIO_PAYMENT_OPERATE"],
  memberships: [{ propertyId: "property-demo", propertyCode: "HB-GT-DEMO", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
};
const guestDTO = { guestAccountId: "guest-demo", sessionId: "guest-session", email: "guest@example.test", context: "GUEST" };
const staffURL = "*/api/auth/staff/session", guestURL = "*/api/auth/guest/session", refreshURL = "*/api/auth/staff/refresh";
const heading = "Panel de recepción";
const staffSessionKey = ["auth", "staff", "session"] as const;
const clients: QueryClient[] = [];
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function GuestObserver() {
  const guest = useGuestSession();
  return <output aria-label="Estado Guest">{guest.status}</output>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><GuestSessionProvider><GuestObserver />
    <PrivateLayout><Dashboard /></PrivateLayout>
  </GuestSessionProvider></QueryClientProvider></AppRouterContext.Provider>);
  return client;
}
async function refetch(client: QueryClient) {
  await act(async () => { await client.refetchQueries({ queryKey: staffSessionKey }); });
}
beforeEach(() => {
  navigation.replace.mockReset();
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false"); sessionStorage.clear();
  mockServer.use(http.get(staffURL, () => HttpResponse.json(staffDTO)),
    http.get(guestURL, () => new HttpResponse(null, { status: 401 })),
    http.post(refreshURL, () => new HttpResponse(null, { status: 401 })));
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); focusManager.setFocused(undefined); vi.unstubAllEnvs(); });

describe("Dashboard authentication with independent real BFF contexts", () => {
  it("renders Staff 200 while Guest is 401 and caches separate identities", async () => {
    const client = mount();
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Estado Guest")).toHaveTextContent("signed-out"));
    expect(client.getQueryData(staffSessionKey)).toMatchObject({ staffUserId: staffDTO.staffUserId });
    expect(client.getQueryData(["guest-session"])).toBeNull();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
  });
  it.each(["before", "after"])("Guest 401 completing %s Staff 200 cannot deny dashboard", async order => {
    const staff = deferred(), guest = deferred(), started = deferred(); let requests = 0;
    function ready() { if (++requests === 2) started.resolve(); }
    mockServer.use(http.get(staffURL, async () => { ready(); await staff.promise; return HttpResponse.json(staffDTO); }),
      http.get(guestURL, async () => { ready(); await guest.promise; return new HttpResponse(null, { status: 401 }); }));
    mount();
    expect(screen.getByText("Cargando sesión Staff…")).toBeInTheDocument();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    await started.promise;
    if (order === "before") {
      await act(async () => guest.resolve());
      await waitFor(() => expect(screen.getByLabelText("Estado Guest")).toHaveTextContent("signed-out"));
      expect(screen.getByText("Cargando sesión Staff…")).toBeInTheDocument();
      await act(async () => staff.resolve());
    } else {
      await act(async () => staff.resolve()); await screen.findByRole("heading", { name: heading });
      await act(async () => guest.resolve());
      await waitFor(() => expect(screen.getByLabelText("Estado Guest")).toHaveTextContent("signed-out"));
    }
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
  });
  it.each([200, 401])("Staff 401 blocks dashboard even if Guest returns %s", async guestStatus => {
    mockServer.use(http.get(staffURL, () => new HttpResponse(null, { status: 401 })),
      http.get(guestURL, () => guestStatus === 200 ? HttpResponse.json(guestDTO) : new HttpResponse(null, { status: 401 })));
    mount(); await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    await waitFor(() => expect(screen.getByLabelText("Estado Guest")).toHaveTextContent(guestStatus === 200 ? "signed-in" : "signed-out"));
    expect(screen.queryByRole("heading", { name: heading })).not.toBeInTheDocument();
  });
  it("keeps the mounted dashboard throughout a background 200 revalidation", async () => {
    const client = mount(); const dashboard = await screen.findByRole("heading", { name: heading });
    const release = deferred(), started = deferred();
    mockServer.use(http.get(staffURL, async () => { started.resolve(); await release.promise; return HttpResponse.json(staffDTO); }));
    let pending!: Promise<void>; act(() => { pending = client.refetchQueries({ queryKey: staffSessionKey }); });
    await started.promise;
    expect(screen.getByRole("heading", { name: heading })).toBe(dashboard);
    expect(screen.queryByText("Cargando sesión Staff…")).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    await act(async () => { release.resolve(); await pending; });
    expect(screen.getByRole("heading", { name: heading })).toBe(dashboard);
  });
  it("leaves an initially unauthenticated private route instead of waiting there for a later login", async () => {
    mockServer.use(http.get(staffURL, () => new HttpResponse(null, { status: 401 })));
    mount();await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(screen.queryByRole("heading", {name: heading})).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
  });
  it("reload with valid access renders dashboard without a refresh", async () => {
    const refresh = vi.fn(() => HttpResponse.json({ refreshed: true })); mockServer.use(http.post(refreshURL, refresh));
    mount(); await screen.findByRole("heading", { name: heading }); cleanup();
    mount(); // A new QueryClient, like a full reload.
    await screen.findByRole("heading", { name: heading }); expect(refresh).not.toHaveBeenCalled();
  });
  it("reload with expired access uses exactly one refresh and retry before rendering", async () => {
    let calls = 0; const refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    mockServer.use(http.get(staffURL, () => ++calls === 1 ? new HttpResponse(null, { status: 401 }) : HttpResponse.json(staffDTO)), http.post(refreshURL, refresh));
    mount(); expect(screen.getByText("Cargando sesión Staff…")).toBeInTheDocument();
    await screen.findByRole("heading", { name: heading }); expect(calls).toBe(2); expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
  });
  it("invalid refresh stops without retry and requires a Staff session", async () => {
    const get = vi.fn(() => new HttpResponse(null, { status: 401 })), refresh = vi.fn(() => new HttpResponse(null, { status: 401 }));
    mockServer.use(http.get(staffURL, get), http.post(refreshURL, refresh)); mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/")); expect(get).toHaveBeenCalledTimes(1); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("refresh 200 followed by session 401 stops with no refresh loop", async () => {
    const get = vi.fn(() => new HttpResponse(null, { status: 401 })), refresh = vi.fn(() => HttpResponse.json({ refreshed: true }));
    mockServer.use(http.get(staffURL, get), http.post(refreshURL, refresh)); mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/")); expect(get).toHaveBeenCalledTimes(2); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("keeps cached Staff on temporary 503, but a definitive 401 removes dashboard", async () => {
    const client = mount(); await screen.findByRole("heading", { name: heading });
    mockServer.use(http.get(staffURL, () => new HttpResponse(null, { status: 503 }))); await refetch(client);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    mockServer.use(http.get(staffURL, () => new HttpResponse(null, { status: 401 }))); await refetch(client);
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
  });
  it("labels invalid 200 authorization as a load error and recovers on valid DTO", async () => {
    mockServer.use(http.get(staffURL, () => HttpResponse.json({ ...staffDTO, permissions: ["INVALID_PERMISSION"] })));
    const client = mount(); expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la sesión Staff.");
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    mockServer.use(http.get(staffURL, () => HttpResponse.json(staffDTO))); await refetch(client);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });
  it("focus refetch preserves the same dashboard and logout blocks only Staff", async () => {
    mockServer.use(http.get(guestURL, () => HttpResponse.json(guestDTO)), http.delete(staffURL, () => new HttpResponse(null, { status: 204 })));
    const client = mount(), dashboard = await screen.findByRole("heading", { name: heading });
    await waitFor(() => expect(screen.getByLabelText("Estado Guest")).toHaveTextContent("signed-in"));
    const get = vi.fn(() => HttpResponse.json(staffDTO)); mockServer.use(http.get(staffURL, get));
    await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true); });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.isFetching({ queryKey: staffSessionKey })).toBe(0));
    expect(screen.getByRole("heading", { name: heading })).toBe(dashboard);
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Estado Guest")).toHaveTextContent("signed-in");
    expect(client.getQueryData(["guest-session"])).toMatchObject({ context: "GUEST" }); expect(client.getQueryData(staffSessionKey)).toBeNull();
  });
});
