import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReservationListItem } from "../model/reservation-summary";
import { ReservationList } from "./reservation-list";

afterEach(() => cleanup());

function reservation(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    guestName: "María López",
    sourceLabel: "Viajes Maya",
    sourceReference: "VM-77821 · TA-MAYA-01",
    roomLabel: "203",
    stayStart: new Date(2026, 7, 28),
    stayEnd: new Date(2026, 7, 31),
    nights: 3,
    adults: 2,
    roomCount: 1,
    currency: "GTQ",
    finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
    alertText: "Garantía vence hoy 20:00",
    status: "CONFIRMED",
    statusDetail: "Check-in 28 ago · 15:00",
    ...overrides,
  };
}

function waitlistReservation(): ReservationListItem {
  return reservation({
    id: "WAIT-0007",
    guestName: "Laura Méndez",
    sourceLabel: "Web directa",
    sourceReference: null,
    roomLabel: "Deluxe King",
    roomCount: null,
    finance: { totalAmount: 2250, paidAmount: null, financeState: "ESTIMATED" },
    alertText: "3 solicitudes en cola",
    status: "WAITLIST",
    statusDetail: "Sin inventario confirmado",
  });
}

describe("ReservationList", () => {
  it('combines accent-insensitive guest search with inclusive arrival dates and clears filters', () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'maria lopez' } });
    fireEvent.change(screen.getByLabelText('Llegada desde'), { target: { value: '2026-08-28' } });
    fireEvent.change(screen.getByLabelText('Llegada hasta'), { target: { value: '2026-08-28' } });
    expect(screen.getByRole('link', { name: 'HB-2026-08421' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'WAIT-0007' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Llegada hasta'), { target: { value: '2026-08-27' } });
    expect(screen.getByRole('alert')).toHaveTextContent('posterior');
    expect(screen.queryByRole('link', { name: 'HB-2026-08421' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByRole('link', { name: 'WAIT-0007' })).toBeInTheDocument();
    expect(screen.getByLabelText('Llegada desde')).toHaveValue('');
  });
  it("renders table headers and the reservation summary cells", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    expect(screen.getByText("Reserva / Huésped")).toBeInTheDocument();
    expect(screen.getByText("Estadía / Canal")).toBeInTheDocument();
    expect(screen.getByText("Finanzas / Alerta")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();

    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("Total Q3,920 · Pendiente Q1,520")).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText("Check-in 28 ago · 15:00")).toBeInTheDocument();
  });

  it("renders waitlist rows without a confirmed room and with estimated tariff", () => {
    render(<ReservationList reservations={[waitlistReservation()]} />);

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    expect(screen.getByText(/2 adultos · solicitud/)).toBeInTheDocument();
    expect(screen.getByText("Tarifa estimada Q2,250")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Waitlist")).toBeInTheDocument();
    expect(screen.getByText("Sin inventario confirmado")).toBeInTheDocument();
  });

  it("does not render a convert action without the composition handler", () => {
    render(<ReservationList reservations={[waitlistReservation()]} />);

    expect(screen.queryByRole("button", { name: "Convertir a reserva" })).not.toBeInTheDocument();
  });

  it("exposes a convert action on waitlist rows through the provided handler", () => {
    const onConvert = vi.fn();
    render(<ReservationList reservations={[waitlistReservation(), reservation()]} onConvert={onConvert} />);

    fireEvent.click(screen.getByRole("button", { name: "Convertir a reserva" }));

    expect(onConvert).toHaveBeenCalledWith("WAIT-0007");
    expect(screen.getAllByRole("button", { name: "Convertir a reserva" })).toHaveLength(1);
  });

  it("links each reservation reference to its detail page", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    expect(screen.getByRole("link", { name: "HB-2026-08421" })).toHaveAttribute("href", "/reservas/HB-2026-08421");
    expect(screen.getByRole("link", { name: "WAIT-0007" })).toHaveAttribute("href", "/reservas/WAIT-0007");
    expect(screen.getByRole("link", { name: "Ver detalle de HB-2026-08421" })).toHaveAttribute("href", "/reservas/HB-2026-08421");
  });

  it("filters rows by the search query", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "López" } });

    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
    expect(screen.queryByText("WAIT-0007")).not.toBeInTheDocument();
  });

  it("shows an empty result message when search matches nothing", () => {
    render(<ReservationList reservations={[reservation()]} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });

    expect(screen.getByText("Sin resultados con los filtros actuales.")).toBeInTheDocument();
  });

  it("filters rows by status", () => {
    render(<ReservationList reservations={[reservation(), waitlistReservation()]} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "WAITLIST" } });

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    expect(screen.queryByText("HB-2026-08421")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 reserva");
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByRole("status")).toHaveTextContent("2 reservas");
  });

  it("paginates a list larger than one page", () => {
    const reservations = Array.from({ length: 6 }, (_, index) => reservation({ id: `HB-2026-08${index + 1}`, guestName: `Huésped ${index + 1}` }));
    render(<ReservationList reservations={reservations} />);

    expect(screen.getByText("1–5 de 6 reservas")).toBeInTheDocument();
    expect(screen.getByText("Huésped 1")).toBeInTheDocument();
    expect(screen.queryByText("Huésped 6")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(screen.getByText("6–6 de 6 reservas")).toBeInTheDocument();
    expect(screen.getByText("Huésped 6")).toBeInTheDocument();
    expect(screen.queryByText("Huésped 1")).not.toBeInTheDocument();
  });
});
