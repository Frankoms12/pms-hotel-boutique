import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import PrivateLayout from "../app/(private)/layout";
import { MultiPropertyDashboard, AvailabilitySearch, AvailabilityResults } from "@/modules/multi-property";
import { mockServer } from "@/data/mocks/server";
import { private09Keys, initialStaffIdentity } from "@/data/mocks/private-09";
import type { StaffSessionDTO } from "@/modules/auth/dtos/staff-session.dto";
import { SessionsPage } from "@/modules/security";
const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), bfcacheId: 'private-09-test', pathname: "/multi-property" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation }));
const clients: QueryClient[] = [];
let authenticated: boolean;
let staffDTO: StaffSessionDTO;
function initialBffSession(): StaffSessionDTO {
  return { staffUserId:"staff-real", sessionId:"staff-current", username:"gerencia.real", roleCode:"GERENCIA",
    permissions:["MULTI_PROPERTY_READ"], memberships:initialStaffIdentity().memberships.map(m => ({
      propertyId:m.property_id, propertyCode:m.property_id, name:m.name, timezone:m.timezone, currency:m.currency,
    })) };
}
function mount(page: ReactNode = <MultiPropertyDashboard />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  clients.push(client);
  return render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><PrivateLayout>{page}</PrivateLayout></QueryClientProvider></AppRouterContext.Provider>);
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); navigation.push.mockClear(); navigation.replace.mockClear(); navigation.pathname = "/multi-property";
  authenticated = true; staffDTO = initialBffSession();
  mockServer.use(
    http.get("*/api/auth/staff/session", () => authenticated ? HttpResponse.json(staffDTO) : new HttpResponse(null,{status:401})),
    http.post("*/api/auth/staff/refresh", () => new HttpResponse(null,{status:401})),
    http.delete("*/api/auth/staff/session", () => { authenticated=false;return new HttpResponse(null,{status:204}); }),
  );
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); vi.unstubAllEnvs(); onlineManager.setOnline(true); });
describe("Private 09 frontend journeys", () => {
  it("switches property, preserves role, scopes queries and persists reload", async () => {
    const user = userEvent.setup(); mount();
    const region = await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(within(region).getByText(/Hotel Boutique Huehue/)).toBeInTheDocument();
    expect(within(region).queryByText(/Hotel Boutique Antigua/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Propiedad"), "GT-HB-03");
    await waitFor(() => expect(screen.getByRole("region", { name: "Métricas por propiedad" })).toHaveTextContent("Hotel Boutique Antigua"));
    expect(screen.getByText("Gerencia · Sesión Staff")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Métricas por propiedad" })).not.toHaveTextContent("Hotel Boutique Huehue");
    cleanup(); mount();
    await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(screen.getByLabelText("Propiedad")).toHaveValue("GT-HB-03");
  });
  it("shows consolidated authorized metrics when global is explicitly selected", async () => {
    const user = userEvent.setup(); mount();
    await user.selectOptions(await screen.findByLabelText("Propiedad"), "ALL_PROPERTIES");
    await waitFor(() => expect(screen.getByRole("region", { name: "Métricas por propiedad" })).toHaveTextContent("Hotel Boutique Antigua"));
    expect(screen.getByText("158 / 200 room-nights")).toBeInTheDocument();
    expect(screen.getByText("79.0%")).toBeInTheDocument();
  });
  it("does not query metrics with a stale unauthorized saved scope", async () => {
    let requests = 0;
    mockServer.use(http.get("*/__mock/private-09/metrics", () => { requests++; return HttpResponse.json({ metrics: [] }); }));
    sessionStorage.setItem("pms:private-09:scope:staff-current", "NOT-AUTHORIZED");
    mount(); await screen.findByText("Selecciona una propiedad autorizada en el encabezado para continuar.");
    expect(requests).toBe(0);
    expect(screen.queryByRole("region", { name: "Métricas por propiedad" })).not.toBeInTheDocument();
  });
  it("hides inactive properties and global comparison for Reception", async () => {
    const identity = initialStaffIdentity(); identity.role_id = "recepcion"; identity.memberships[1].status = "INACTIVE";
    localStorage.setItem(private09Keys.identity, JSON.stringify(identity));
    staffDTO.roleCode="RECEPCION";staffDTO.permissions=["RESERVATION_MANAGE"];staffDTO.memberships=staffDTO.memberships.slice(0,1);
    mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    expect(screen.queryByRole("option", { name: /Antigua/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Todas mis propiedades/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Comparar disponibilidad" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles / Permisos" })).not.toBeInTheDocument();
  });
  it("renders empty memberships without a global fallback", async () => {
    const identity = initialStaffIdentity(); identity.memberships = [];
    localStorage.setItem(private09Keys.identity, JSON.stringify(identity));
    staffDTO.memberships=[];
    mount(); await screen.findByText("No hay un contexto autorizado seleccionado.");
    expect(screen.getByLabelText("Propiedad")).toBeDisabled();
  });
  it("handles loading, errors, retry and empty results", async () => {
    const user = userEvent.setup();
    localStorage.setItem(private09Keys.scenario, "error");
    mount(); await screen.findByText("Cargando datos de las propiedades seleccionadas…");
    await screen.findByText("No se pudieron cargar los datos de este contexto.");
    localStorage.setItem(private09Keys.scenario, "empty");
    await user.click(screen.getByRole("button", { name: "Reintentar consulta" }));
    await screen.findByText("No hay datos para las propiedades y los criterios seleccionados.");
  });
  it("waits offline without presenting fabricated data", async () => {
    onlineManager.setOnline(false); mount();
    expect(screen.getByText("Sin conexión. Esperando para cargar la sesión Staff.")).toBeInTheDocument();
    act(() => onlineManager.setOnline(true));
    await screen.findByRole("region", { name: "Métricas por propiedad" });
  });
  it.each(["search", "results"])("does not grant the fixture-only comparison permission to BFF Staff (%s)", async page => {
    const requests=vi.fn(() => HttpResponse.json({options:[]}));
    mockServer.use(http.get("*/__mock/private-09/comparison",requests));
    mount(page === "search" ? <AvailabilitySearch /> : <AvailabilityResults criteria={{startDate:"2026-09-12",endDate:"2026-09-14",roomType:"King"}} />);
    await screen.findByText("Tu rol no tiene habilitada la comparación entre propiedades.");
    expect(screen.queryByRole("button", {name:"Buscar disponibilidad"})).not.toBeInTheDocument();
    expect(requests).not.toHaveBeenCalled();
  });
  it("rejects a response containing data outside the authorized scope", async () => {
    mockServer.use(http.get("*/__mock/private-09/metrics", () => HttpResponse.json({ metrics: [{ property_id: "UNAUTHORIZED", currency: "GTQ", date: "2026-09-08", sold_room_nights: 1, available_room_nights: 1, net_revenue: "10" }] })));
    mount(); await screen.findByText("No se pudieron cargar los datos de este contexto.");
    expect(screen.queryByText("UNAUTHORIZED")).not.toBeInTheDocument();
  });
  it("closes the BFF session, keeps Guest data and redirects unauthenticated reload home", async () => {
    const user = userEvent.setup(); localStorage.setItem("guest-example", "preserved"); mount();
    await user.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(authenticated).toBe(false);
    expect(localStorage.getItem("guest-example")).toBe("preserved");
    expect(screen.queryByRole("heading", { name: "Dashboard Multi-property" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar demostración Staff" })).not.toBeInTheDocument();
    cleanup(); mount();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledTimes(2));
    expect(navigation.replace).toHaveBeenLastCalledWith("/");
    expect(screen.queryByText("Sesión Staff requerida")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Métricas por propiedad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar demostración Staff" })).not.toBeInTheDocument();
    expect(authenticated).toBe(false);
    expect(localStorage.getItem("guest-example")).toBe("preserved");
  });
  it("keeps content visible when logout fails and allows retry", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    mockServer.use(http.delete("*/api/auth/staff/session", () => new HttpResponse(null,{status:503})));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await screen.findByText("No se pudo cerrar la sesión. Inténtalo nuevamente.");
    expect(screen.getByRole("heading", { name: "Dashboard Multi-property" })).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
    mockServer.use(http.delete("*/api/auth/staff/session", () => {authenticated=false;return new HttpResponse(null,{status:204});}));
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith("/"));
    expect(screen.queryByRole("heading", { name: "Dashboard Multi-property" })).not.toBeInTheDocument();
  });
  it("does not display the previous property while the new query is delayed", async () => {
    const user = userEvent.setup(); mount(); await screen.findByRole("region", { name: "Métricas por propiedad" });
    mockServer.use(http.get("*/__mock/private-09/metrics", async () => { await delay(150); return HttpResponse.json({ metrics: [] }); }));
    await user.selectOptions(screen.getByLabelText("Propiedad"), "GT-HB-03");
    expect(screen.queryByRole("region", { name: "Métricas por propiedad" })).not.toBeInTheDocument();
    await screen.findByText("No hay datos para las propiedades y los criterios seleccionados.");
  });
  it("keeps the legacy security data page separate from BFF authentication", async () => {
    navigation.pathname = "/seguridad/sesiones"; mount(<SessionsPage />);
    await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(screen.queryByLabelText("Propiedad")).not.toBeInTheDocument();
    expect(screen.getByText("Este módulo conserva su contexto de propiedad.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Security/ })).toBeInTheDocument();
  });
});
