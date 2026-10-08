import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrivateLayout from "./layout";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { http, HttpResponse } from "msw";
import { mockServer } from "@/data/mocks/server";
const navigation = {replace:vi.fn(),push:vi.fn(),back:vi.fn(),forward:vi.fn(),refresh:vi.fn(),prefetch:vi.fn(),bfcacheId:"staff-layout"};
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
const clients: QueryClient[] = [];
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); mockServer.use(http.get("*/api/auth/staff/session", () => HttpResponse.json({staffUserId:"staff",sessionId:"session",username:"gerencia.real",roleCode:"GERENCIA",permissions:["MULTI_PROPERTY_READ"],memberships:[]}))); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.unstubAllEnvs(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  render(<AppRouterContext.Provider value={navigation}><QueryClientProvider client={client}><PrivateLayout><p>Contenido Staff</p></PrivateLayout></QueryClientProvider></AppRouterContext.Provider>);
}
describe("PrivateLayout", () => {
  it("composes one Staff shell with role-aware navigation and identity", async () => {
    mount();
    const nav = await screen.findByRole("navigation", { name: "Módulos Staff" });
    expect(within(nav).getByRole("link", { name: "Panel" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Reservas" })).toHaveAttribute("href", "/reservas");
    expect(within(nav).getByRole("link", { name: "Calendario" })).toHaveAttribute("href", "/calendario");
    expect(within(nav).getByRole("link", { name: "Habitaciones" })).toHaveAttribute("href", "/staff/habitaciones");
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Contenido Staff")).toBeInTheDocument();
    expect(screen.getByText("Gerencia · Sesión Staff")).toBeInTheDocument();
  });
  it("exposes no links to unmounted Staff routes", async () => {
    mount();
    const nav = await screen.findByRole("navigation", { name: "Módulos Staff" });
    expect(within(nav).queryByRole("link", { name: "Folios" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Pagos" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Revenue" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Multi-property" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Roles / Permisos" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Auditoría" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Grupos / Eventos" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Housekeeping" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Mi sesión Staff" })).not.toBeInTheDocument();
  });
});
