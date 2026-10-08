import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { staffSessionKey } from "../hooks/staff-session-query";
import { staffPreviewKey } from '../hooks/staff-preview-query';
import { resetStaffPreview } from '@/data/mocks/staff-preview';

import { StaffLogout, StaffSessionProvider, useStaffSession } from "./staff-session-provider";

const navigation = { replace: vi.fn(), push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'staff-session-test' };
const clients: QueryClient[] = [];

function Probe() {
  const session = useStaffSession();
  return <><p>{`${session.userName}|${session.roleId}|${session.memberships[0]?.propertyCode}`}</p><StaffLogout /></>;
}

function mount(cachedSignedOut = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  if (cachedSignedOut) client.setQueryData(staffSessionKey, null);
  return { ...render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><StaffSessionProvider><Probe /></StaffSessionProvider></QueryClientProvider></AppRouterContext.Provider>), client };
}

beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false"); navigation.replace.mockClear(); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });

describe("StaffSessionProvider with C2 BFF", () => {
  it.each([false, true])("uses the BFF response instead of a local identity (mock data=%s)", async useMock => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", String(useMock));
    mockServer.use(http.get("*/api/auth/staff/session", () => HttpResponse.json({
      staffUserId: "staff-1", sessionId: "session-1", username: "gerencia.real", roleCode: "GERENCIA",
      permissions: ["MULTI_PROPERTY_READ"],
      memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
    })));
    mount();
    expect(await screen.findByText("gerencia.real|GERENCIA|HB-GT-001")).toBeInTheDocument();
  });

  it("refreshes an expired access session through the BFF before mounting private content", async () => {
    let sessionCalls = 0;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => {
        sessionCalls += 1;
        return sessionCalls === 1
          ? HttpResponse.json({ error: "Staff session required" }, { status: 401 })
          : HttpResponse.json({
            staffUserId: "staff-1", sessionId: "session-2", username: "gerencia.real", roleCode: "GERENCIA",
            permissions: ["MULTI_PROPERTY_READ"],
            memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
          });
      }),
      http.post("*/api/auth/staff/refresh", () => HttpResponse.json({ refreshed: true })),
    );
    mount();
    expect(await screen.findByText("gerencia.real|GERENCIA|HB-GT-001")).toBeInTheDocument();
    expect(sessionCalls).toBe(2);
  });

  it("does not mount private content when the BFF has no Staff session", async () => {
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json({ error: "Staff session required" }, { status: 401 })),
      http.post("*/api/auth/staff/refresh", () => HttpResponse.json({ error: "Staff session expired" }, { status: 401 })),
    );
    mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(screen.queryByText(/\|/)).not.toBeInTheDocument();
  });
});

describe("Staff logout navigation", () => {
  const sessionDTO = {
    staffUserId: "staff-1", sessionId: "session-1", username: "gerencia.real", roleCode: "GERENCIA",
    permissions: ["MULTI_PROPERTY_READ"],
    memberships: [{ propertyId: "property-1", propertyCode: "HB-GT-001", name: "Hotel Boutique", timezone: "America/Guatemala", currency: "GTQ" }],
  };

  it("waits for BFF logout, clears Staff session and redirects home without changing Guest data", async () => {
    let finish!: () => void;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json(sessionDTO)),
      http.delete("*/api/auth/staff/session", async () => {
        await new Promise<void>(resolve => { finish = resolve; });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { client } = mount();
    await screen.findByText("gerencia.real|GERENCIA|HB-GT-001");
    client.setQueryData(["guest-session"], { account: "guest-independent" });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();
    expect(navigation.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(finish).toBeDefined());
    finish();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(client.getQueryData(staffSessionKey)).toBeNull();
    expect(client.getQueryData(["guest-session"])).toEqual({ account: "guest-independent" });
    expect(screen.queryByText("gerencia.real|GERENCIA|HB-GT-001")).not.toBeInTheDocument();
  });

  it.each([false, true])("keeps the panel on logout failure and redirects after retry (mock=%s)", async useMock => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", String(useMock));
    let attempts = 0;
    mockServer.use(
      http.get("*/api/auth/staff/session", () => HttpResponse.json(sessionDTO)),
      http.delete("*/api/auth/staff/session", () => ++attempts === 1 ? new HttpResponse(null, { status: 503 }) : new HttpResponse(null, { status: 204 })),
    );
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cerrar la sesión");
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/"));
    expect(attempts).toBe(2);
  });

  it("does not mount or restart private content with no BFF session even when data mocks are enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    mockServer.use(
      http.get("*/api/auth/staff/session", () => new HttpResponse(null, { status: 401 })),
      http.post("*/api/auth/staff/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar demostración Staff" })).not.toBeInTheDocument();
  });
});


describe("shared-cookie Staff session loss", () => {
  it("revalidates on window focus and leaves on definitive 401 without touching Guest", async () => {
    let authenticated=true;
    const get=vi.fn(()=>authenticated?HttpResponse.json({
      staffUserId:"staff-1",sessionId:"session-1",username:"staff",roleCode:"GERENCIA",
      permissions:[],memberships:[],
    }):new HttpResponse(null,{status:401}));
    const refresh=vi.fn(()=>new HttpResponse(null,{status:401}));
    mockServer.use(http.get("*/api/auth/staff/session",get),http.post("*/api/auth/staff/refresh",refresh));
    const {client}=mount();await screen.findByText("staff|GERENCIA|undefined");
    client.setQueryData(["guest-session"],{guest:true});
    client.setQueryData(["guest","summary"],{summary:true});
    for (const key of ["reservations", "staff-reservation-quotes", "staff-room-assignment", "staff-room-occupancy"]) {
      client.setQueryData([key, "staff"], { private: true });
    }
    authenticated=false; // Cookie/session removed by another window's successful logout.
    act(()=>window.dispatchEvent(new Event("focus")));
    await waitFor(()=>expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(get).toHaveBeenCalledTimes(2);expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("staff|GERENCIA|undefined")).not.toBeInTheDocument();
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    expect(client.getQueryData(staffSessionKey)).toBeNull();
    for (const key of ["reservations", "staff-reservation-quotes", "staff-room-assignment", "staff-room-occupancy"]) {
      expect(client.getQueriesData({ queryKey: [key] })).toEqual([]);
    }
    expect(client.getQueryData(["guest-session"])).toEqual({guest:true});
    expect(client.getQueryData(["guest","summary"])).toEqual({summary:true});
  });
  it("does not redirect on a window-focus 503",async()=>{
    mockServer.use(http.get("*/api/auth/staff/session",()=>HttpResponse.json({staffUserId:"staff-1",sessionId:"session-1",username:"staff",roleCode:"GERENCIA",permissions:[],memberships:[]})));
    mount();const identity=await screen.findByText("staff|GERENCIA|undefined");
    const failure=vi.fn(()=>new HttpResponse(null,{status:503}));
    mockServer.use(http.get("*/api/auth/staff/session",failure));
    act(()=>window.dispatchEvent(new Event("focus")));
    await waitFor(()=>expect(failure).toHaveBeenCalledTimes(1));
    expect(screen.getByText("staff|GERENCIA|undefined")).toBe(identity);
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});


it("revalidates cached signed-out data before redirecting after a new Staff login",async()=>{
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
  mockServer.use(http.get("*/api/auth/staff/session",async()=>{
    await pending;return HttpResponse.json({staffUserId:"staff-1",sessionId:"new-session",username:"staff",roleCode:"GERENCIA",permissions:[],memberships:[]});
  }));
  mount(true);
  expect(screen.getByText("Cargando sesión Staff…")).toBeInTheDocument();
  expect(navigation.replace).not.toHaveBeenCalled();
  release();await screen.findByText("staff|GERENCIA|undefined");
  expect(navigation.replace).not.toHaveBeenCalled();

});

describe('Staff frontend preview, independent from BFF Auth', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_STAFF_PREVIEW', 'true');
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true');
    resetStaffPreview();
  });
  it('mounts only the fictional property without querying or overwriting the real Staff cache', async () => {
    const bff = vi.fn(() => new HttpResponse(null, { status: 503 }));
    mockServer.use(http.all('*/api/auth/staff/*', bff));
    const { client } = mount();
    client.setQueryData(staffSessionKey, { staffUserId: 'real-account-preserved' });
    expect(await screen.findByText('Staff · Vista previa|SUPER_ADMIN|GT-HB-01')).toBeInTheDocument();
    expect(screen.getByText('Vista previa Staff')).toBeInTheDocument();
    expect(client.getQueryData(staffPreviewKey)).toMatchObject({ id: 'PREVIEW-STAFF-SESSION' });
    expect(client.getQueryData(staffSessionKey)).toEqual({ staffUserId: 'real-account-preserved' });
    act(() => window.dispatchEvent(new Event('focus')));
    expect(bff).not.toHaveBeenCalled();
  });
  it('closes the preview and returns home without logging out a real Staff or Guest session', async () => {
    const bff = vi.fn(() => new HttpResponse(null, { status: 503 }));
    mockServer.use(http.all('*/api/auth/staff/*', bff));
    const { client } = mount();
    await screen.findByText('Staff · Vista previa|SUPER_ADMIN|GT-HB-01');
    client.setQueryData(['guest-session'], { account: 'guest-independent' });
    client.setQueryData(staffSessionKey, { staffUserId: 'real-account-preserved' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/'));
    expect(client.getQueryData(staffPreviewKey)).toBeNull();
    expect(client.getQueryData(staffSessionKey)).toEqual({ staffUserId: 'real-account-preserved' });
    expect(client.getQueryData(['guest-session'])).toEqual({ account: 'guest-independent' });
    expect(bff).not.toHaveBeenCalled();
    cleanup(); mount();
    await screen.findByRole('heading', { name: 'Vista previa Staff cerrada' });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir vista previa Staff' }));
    expect(await screen.findByText('Staff · Vista previa|SUPER_ADMIN|GT-HB-01')).toBeInTheDocument();
  });
  it('still requires a real Staff session in production with preview flags accidentally set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mockServer.use(http.get('*/api/auth/staff/session', () => new HttpResponse(null, { status: 401 })),
      http.post('*/api/auth/staff/refresh', () => new HttpResponse(null, { status: 401 })));
    mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/'));
    expect(screen.queryByRole('heading', { name: 'Sesión Staff requerida' })).not.toBeInTheDocument();
    expect(screen.queryByText('Vista previa Staff')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Abrir vista previa Staff' })).not.toBeInTheDocument();
  });
});
