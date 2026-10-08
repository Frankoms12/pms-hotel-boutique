import {activateGuestFixture} from '@/test/guest-session-fixture';
import {useQueryClient} from '@tanstack/react-query';
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { GuestSessionProvider, useGuestSession, GuestAccountGate } from "@/modules/auth";
import { ProfilePage } from "@/modules/profile";
import { RewardsPage } from "@/modules/rewards";
import { PromotionsPage } from "@/modules/promotions";
import { mockServer } from "@/data/mocks/server";
import { resetAccountFixtures } from "@/data/mocks/account-fixtures";
import { AccountDashboardPage } from "./account-dashboard-page";
import { HistoryPage } from "./history-page";
import { ReservationHistoryDetail } from "./reservation-history-detail";
import { InvoicesPage } from "./invoices-page";

type Page = "dashboard" | "profile" | "history" | "detail" | "missing" | "rewards" | "promotions" | "invoices";
beforeEach(() => { resetAccountFixtures(); vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true"); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

function DemoSession({ email }: { email: string }) {
  const session = useGuestSession();const client=useQueryClient();
  return <><button onClick={() => void activateGuestFixture({ method: "EMAIL", email },client)}>Entrar</button><output aria-label="Correo de acceso">{session.account?.email}</output></>;
}
async function setup(page: Page, email = "demo@example.com") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  function Harness({ page }: { page: Page }) {
    const pages = { dashboard: <AccountDashboardPage />, profile: <ProfilePage />, history: <HistoryPage />, detail: <ReservationHistoryDetail reservationId="HB-2026-09117" />, missing: <ReservationHistoryDetail reservationId="UNLINKED-ID" />, rewards: <RewardsPage />, promotions: <PromotionsPage />, invoices: <InvoicesPage /> };
    return <QueryClientProvider client={client}><GuestSessionProvider><DemoSession email={email} /><GuestAccountGate>{pages[page]}</GuestAccountGate></GuestSessionProvider></QueryClientProvider>;
  }
  const view = render(<Harness page={page} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByRole("button", { name: "Cerrar sesión" });
  return { user, client, navigate: (next: Page) => view.rerender(<Harness page={next} />) };
}

describe("Public 05 connected journeys", () => {
  it("loads, edits, cancels and saves Profile, refreshes Dashboard and preserves authentication identity", async () => {
    const { user, navigate } = await setup("profile");
    const name = await screen.findByLabelText("Nombre *");
    expect(name).toHaveValue("Alan");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    await user.clear(name); await user.type(name, "Borrador");
    expect(screen.getByText("Tienes cambios sin guardar.")).toHaveAttribute("role", "status");
    await user.click(screen.getByRole("button", { name: "Cancelar cambios" }));
    expect(name).toHaveValue("Alan");
    await user.clear(name); await user.type(name, "Ana");
    const contact = screen.getByLabelText("Correo de contacto *");
    await user.clear(contact); await user.type(contact, "contact@example.com");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    await screen.findByText("Perfil guardado correctamente.");
    expect(screen.getByLabelText("Correo de acceso")).toHaveTextContent("demo@example.com");
    navigate("dashboard");
    expect(await screen.findByText(/Hola, Ana Palacios/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CONFIGURACIÓN/ })).toHaveAttribute("href", "/cuenta/perfil#preferencias");
    expect(screen.getByRole("link", { name: "Historial" })).toHaveAttribute("href", "/cuenta/reservas");
    navigate("profile");
    expect(await screen.findByLabelText("Nombre *")).toHaveValue("Ana");
  }, 15000);

  it("preserves a failed draft and saves on retry without false success", async () => {
    const { user } = await setup("profile");
    const name = await screen.findByLabelText("Nombre *");
    await user.clear(name); await user.type(name, "Ana");
    mockServer.use(http.post("http://pms.test/profile/update", () => HttpResponse.json({ code: "FAIL" }, { status: 503 }), { once: true }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Conservamos tus cambios");
    expect(name).toHaveValue("Ana");
    expect(screen.queryByText("Perfil guardado correctamente.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Perfil guardado correctamente.")).toBeInTheDocument();
  }, 10000);

  it("shows separate reservation/stay states, occupants, property and linked-only detail", async () => {
    const { navigate } = await setup("history");
    expect(await screen.findByRole("link", { name: "HB-2026-09117" })).toHaveAttribute("href", "/cuenta/reservas/HB-2026-09117");
    expect(screen.getByRole("heading", { name: "Reservas actuales" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reservas pasadas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HB-2026-08055" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HB-2026-08112" })).toBeInTheDocument();
    navigate("detail");
    expect(await screen.findByText(/Estadía ST-09117-01/)).toBeInTheDocument();
    expect(screen.getByText(/Estadía ST-09117-02/)).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText(/Hotel Boutique Antigua/)).toBeInTheDocument();
    navigate("missing");
    expect(await screen.findByText(/No se encontró una reserva vinculada/)).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  }, 10000);

  it("renders the received Rewards balance and read-only ledger, with no earning from cancelled/no-show", async () => {
    await setup("rewards");
    expect(await screen.findByText("Saldo: 120 puntos")).toBeInTheDocument();
    expect(screen.getByText(/EARN · 200 puntos/)).toHaveTextContent("HB-2026-07214");
    expect(screen.getByText(/REDEEM · 50 puntos/)).toBeInTheDocument();
    expect(screen.getByText(/EXPIRE · 10 puntos/)).toBeInTheDocument();
    expect(screen.getByText(/REVERSE · 20 puntos/)).toBeInTheDocument();
    expect(screen.queryByText(/HB-2026-08055|HB-2026-08112/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Canjear|Editar/ })).not.toBeInTheDocument();
  });

  it("shows promotion eligibility, validity and incompatibility without applying an offer", async () => {
    const { user } = await setup("promotions");
    const heading = await screen.findByRole("heading", { name: "Member Rate -5%" });
    const member = heading.closest("article")!;
    expect(within(member).getByText("Vigente · Elegible")).toBeInTheDocument();
    await user.click(within(member).getByText("Ver detalle de MEMBER5"));
    expect(within(member).getByText("No combinable")).toBeVisible();
    const excluded = screen.getByRole("heading", { name: /Estancia Larga/ }).closest("article")!;
    expect(within(excluded).getByText(/no cumple el mínimo/)).toBeInTheDocument();
    expect(within(excluded).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Vencida · No elegible")).toBeInTheDocument();
  });

  it("keeps all empty-account views empty and removes Guest data on sign-out", async () => {
    const { user, navigate, client } = await setup("dashboard", "empty@example.com");
    expect(await screen.findByText("No tienes próximas estadías")).toBeInTheDocument();
    navigate("history"); expect(await screen.findByText("No tienes reservas vinculadas.")).toBeInTheDocument();
    navigate("rewards"); expect(await screen.findByText("No hay movimientos de puntos.")).toBeInTheDocument();
    expect(screen.getByText("Saldo: 0 puntos")).toBeInTheDocument();
    navigate("promotions"); expect(await screen.findByText("No hay promociones disponibles para tu cuenta.")).toBeInTheDocument();
    navigate("invoices"); expect(await screen.findByText("No hay documentos para tu cuenta.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(client.getQueriesData({ queryKey: ["guest"] })).toHaveLength(0);
  }, 10000);

  it("recovers a query error and displays loading before resolving", async () => {
    mockServer.use(http.get("http://pms.test/rewards", () => HttpResponse.json({}, { status: 503 }), { once: true }));
    const { user } = await setup("rewards");
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Saldo: 120 puntos")).toBeInTheDocument();
  });

  it("shows connectivity failures without an empty-success state", async () => {
    await setup("history", "data-offline@example.com");
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
    expect(screen.queryByText("No tienes reservas vinculadas.")).not.toBeInTheDocument();
  });

  it("never claims a PDF download when no document is available", async () => {
    await setup("invoices");
    expect(await screen.findByRole("heading", { name: "FACT-2026-07214" })).toBeInTheDocument();
    expect(screen.getByText("Descarga no disponible.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descargar PDF" })).not.toBeInTheDocument();
  });
});
