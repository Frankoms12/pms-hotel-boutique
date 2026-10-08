import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ReservationCenter } from "./reservation-center";

afterEach(() => cleanup());

const { useReservationCenterMock, useWaitlistConversionPreviewMock, useConfirmWaitlistConversionMock } = vi.hoisted(() => ({
  useReservationCenterMock: vi.fn(),
  useWaitlistConversionPreviewMock: vi.fn(),
  useConfirmWaitlistConversionMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-center", () => ({ useReservationCenter: useReservationCenterMock }));

vi.mock("../hooks/use-waitlist-conversion", () => ({
  useWaitlistConversionPreview: useWaitlistConversionPreviewMock,
  useConfirmWaitlistConversion: useConfirmWaitlistConversionMock,
}));

function centerData() {
  return {
    summary: {
      arrivalsToday: 18,
      departuresToday: 126,
      vipToday: 2,
      multiRoomToday: 2,
      lateCheckoutToday: 2,
      alerts: 4,
      confirmedNextDays: 37,
      decisionsRequired: 2,
      total: 1,
    },
    alerts: [{
      id: "AL-1",
      kind: "NO_SHOW_PENDING",
      message: "No-show pendiente · HB-2026-08458 · llegada vencida 18:00",
    }],
    reservations: [{
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
    }, {
      id: "WAIT-0007",
      propertyId: "GT-HB-01",
      guestName: "Laura Méndez",
      sourceLabel: "Web directa",
      sourceReference: null,
      roomLabel: "Deluxe King",
      stayStart: new Date(2026, 8, 10),
      stayEnd: new Date(2026, 8, 12),
      nights: 2,
      adults: 2,
      roomCount: null,
      currency: "GTQ",
      finance: { totalAmount: 2250, paidAmount: null, financeState: "ESTIMATED" },
      alertText: "3 solicitudes en cola",
      status: "WAITLIST",
      statusDetail: "Sin inventario confirmado",
    }],
  };
}

function waitlistPreviewMockReturn() {
  return {
    data: {
      id: "WAIT-0007",
      guestName: "Laura Méndez",
      sourceLabel: "Web directa",
      roomTypeLabel: "Deluxe King",
      checkIn: new Date(2026, 8, 10),
      checkOut: new Date(2026, 8, 12),
      nights: 2,
      adults: 2,
      priority: 1,
      queueLabel: "3 solicitudes en cola",
      preferences: "Habitación tranquila · piso alto si está disponible.",
      originalEstimatedAmount: 2250,
      availability: {
        roomType: "Deluxe King",
        availableFrom: new Date(2026, 8, 10),
        availableUntil: new Date(2026, 8, 12),
        ratePlan: "BAR Flexible",
        ratePerNight: 1125,
        totalEstimated: 2250,
        note: null,
      },
    },
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  };
}

describe("ReservationCenter", () => {
  it('opens the new reservation route only when creation is permitted, including an empty center', () => {
    useReservationCenterMock.mockReturnValue({ data: { ...centerData(), reservations: [] }, error: null, isLoading: false, refetch: vi.fn() });
    const view = render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" canCreate />);
    expect(screen.getByRole('link', { name: '+ Nueva reserva' })).toHaveAttribute('href', '/reservas/nueva');
    view.rerender(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" canCreate={false} />);
    expect(screen.queryByRole('link', { name: '+ Nueva reserva' })).not.toBeInTheDocument();
  });
  it("does not query until composition supplies an authorized scope", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("waits for the approved endpoint before querying", () => {
    useReservationCenterMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter propertyId="GT-HB-01" />);

    expect(screen.getByText(/contrato API/i)).toBeInTheDocument();
  });

  it("presents a dedicated offline message and offers a retry", () => {
    const refetch = vi.fn();
    useReservationCenterMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders the empty state for an explicit scope", () => {
    useReservationCenterMock.mockReturnValue({
      data: { summary: centerData().summary, alerts: [], reservations: [] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText("No hay reservas para esta propiedad.")).toBeInTheDocument();
  });

  it("renders KPIs, alerts and the reservation list", () => {
    useReservationCenterMock.mockReturnValue({ data: centerData(), error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByRole("heading", { name: "Centro de Reservas" })).toBeInTheDocument();
    expect(screen.getByText("Llegadas hoy")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Salidas hoy")).toBeInTheDocument();
    expect(screen.getByText("126")).toBeInTheDocument();
    expect(screen.getByText("Alertas")).toBeInTheDocument();
    expect(screen.getByText("Confirmadas próximas")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText(/No-show pendiente · HB-2026-08458/i)).toBeInTheDocument();
    expect(screen.getByText("HB-2026-08421")).toBeInTheDocument();
  });

  it("links to the staff calendar from the center header", () => {
    useReservationCenterMock.mockReturnValue({ data: centerData(), error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByRole("link", { name: "Ver calendario" })).toHaveAttribute("href", "/calendario");
  });

  it("opens the waitlist conversion panel from a waitlist row", () => {
    useReservationCenterMock.mockReturnValue({ data: centerData(), error: null, isLoading: false, refetch: vi.fn() });
    useWaitlistConversionPreviewMock.mockReturnValue(waitlistPreviewMockReturn());
    useConfirmWaitlistConversionMock.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Convertir a reserva" }));

    expect(screen.getByRole("heading", { name: "Convertir a reserva" })).toBeInTheDocument();
    expect(screen.getByText("Disponibilidad encontrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mantener en waitlist" })).toBeInTheDocument();
  });

  it("closes the waitlist conversion panel and keeps the center functional", () => {
    useReservationCenterMock.mockReturnValue({ data: centerData(), error: null, isLoading: false, refetch: vi.fn() });
    useWaitlistConversionPreviewMock.mockReturnValue(waitlistPreviewMockReturn());
    useConfirmWaitlistConversionMock.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });

    render(<ReservationCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    fireEvent.click(screen.getByRole("button", { name: "Convertir a reserva" }));
    expect(screen.getByRole("heading", { name: "Convertir a reserva" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mantener en waitlist" }));
    expect(screen.queryByRole("heading", { name: "Convertir a reserva" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Centro de Reservas" })).toBeInTheDocument();
  });
});
