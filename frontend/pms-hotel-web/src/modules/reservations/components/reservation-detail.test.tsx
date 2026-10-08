import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ReservationDetail } from "./reservation-detail";

afterEach(() => cleanup());

const { useReservationDetailMock, useCancellationPreviewMock, useApplyCancellationMock, useNoShowPreviewMock, useApplyNoShowMock, RoomMoveMock, StayExtensionMock } = vi.hoisted(() => ({
  useReservationDetailMock: vi.fn(),
  useCancellationPreviewMock: vi.fn(),
  useApplyCancellationMock: vi.fn(),
  useNoShowPreviewMock: vi.fn(),
  useApplyNoShowMock: vi.fn(),
  RoomMoveMock: vi.fn(),
  StayExtensionMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-detail", () => ({ useReservationDetail: useReservationDetailMock }));

vi.mock("../hooks/use-reservation-cancellation", () => ({
  useCancellationPreview: useCancellationPreviewMock,
  useApplyCancellation: useApplyCancellationMock,
}));

vi.mock("../hooks/use-reservation-no-show", () => ({
  useNoShowPreview: useNoShowPreviewMock,
  useApplyNoShow: useApplyNoShowMock,
}));

vi.mock("@/modules/stays", () => ({ RoomMove: RoomMoveMock, StayExtension: StayExtensionMock }));

function detailData() {
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    status: "CONFIRMED",
    createdAt: new Date(2026, 7, 24),
    source: { label: "Viajes Maya", reference: "VM-77821 · TA-MAYA-01" },
    policyLabel: "Flexible 48h · Viajes Maya",
    guest: { primaryName: "María López", phone: "+502 5555 5555", adults: 2, children: null },
    stays: [{
      id: "STAY-001",
      roomId: "RM-203",
      roomLabel: "203",
      roomType: "Deluxe King",
      checkIn: new Date(2026, 7, 28),
      checkOut: new Date(2026, 7, 31),
      nights: 3,
      travelState: "RESERVED",
    }],
    notes: "Llegada estimada 15:00. Solicita habitación tranquila.",
    currency: "GTQ",
    finance: {
      totalAmount: 3920,
      paidAmount: 2400,
      financeState: "BALANCE",
      ratePerNight: 1160,
      lines: [
        { label: "Habitación · 3 noches", amount: 3480 },
        { label: "Impuestos", amount: 240 },
        { label: "Servicio", amount: 200 },
      ],
    },
  };
}

describe("ReservationDetail", () => {
  it('shows an unassigned physical room without offering a room move', () => {
    const data = detailData();
    useReservationDetailMock.mockReturnValue({ data: { ...data, stays: [{ ...data.stays[0], roomId: null, roomLabel: null }] }, error: null, isLoading: false, refetch: vi.fn() });
    render(<ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />);
    expect(screen.getByText('Sin asignar · Deluxe King')).toBeInTheDocument();
    expect(screen.getByText('Reservada').parentElement).toHaveTextContent('Estado de la estadía: Reservada');
    expect(screen.queryByRole('button', { name: 'Cambiar habitación' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a reservas/ })).toHaveAttribute('href', '/reservas');
  });
  it("does not query until composition supplies an authorized scope", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail reservationId="HB-2026-08421" />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("waits for the approved endpoint before querying", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail propertyId="GT-HB-01" reservationId="HB-2026-08421" />);

    expect(screen.getByText(/contrato API/i)).toBeInTheDocument();
  });

  it("asks to select a reservation when the id is missing", () => {
    useReservationDetailMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" />);

    expect(screen.getByText(/selecciona una reserva/i)).toBeInTheDocument();
  });

  it("presents a dedicated offline message and offers a retry", () => {
    const refetch = vi.fn();
    useReservationDetailMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders booking guest, stays, status, source and the financial summary", () => {
    useReservationDetailMock.mockReturnValue({ data: detailData(), error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByRole("heading", { name: "Reserva HB-2026-08421" })).toBeInTheDocument();
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
    expect(screen.getByText(/Origen: Viajes Maya · VM-77821 · TA-MAYA-01/i)).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("2 adultos")).toBeInTheDocument();
    expect(screen.getByText("+502 5555 5555")).toBeInTheDocument();
    expect(screen.getByText("Q1,160 / noche")).toBeInTheDocument();
    expect(screen.getByText("Flexible 48h · Viajes Maya")).toBeInTheDocument();
    expect(screen.getByText(/Solicita habitación tranquila/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Resumen financiero" })).toBeInTheDocument();
    expect(screen.getByText("Habitación · 3 noches")).toBeInTheDocument();
    expect(screen.getByText("Q3,480")).toBeInTheDocument();
    expect(screen.getByText("Total original")).toBeInTheDocument();
    expect(screen.getByText("Q3,920")).toBeInTheDocument();
    expect(screen.getByText("Pendiente Q1,520")).toBeInTheDocument();
    expect(screen.getByText(/módulo Folio \(API pública\)/i)).toBeInTheDocument();
  });

  it("renders every stay for a multi-room reservation", () => {
    const data = detailData();
    data.stays = [
      detailData().stays[0],
      {
        id: "STAY-002",
        roomId: "RM-101",
        roomLabel: "101",
        roomType: "Deluxe King",
        checkIn: new Date(2026, 7, 28),
        checkOut: new Date(2026, 7, 31),
        nights: 3,
        travelState: "IN_HOUSE",
      },
    ];
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByText("Habitaciones")).toBeInTheDocument();
    expect(screen.getByText("203 · Deluxe King")).toBeInTheDocument();
    expect(screen.getByText("101 · Deluxe King")).toBeInTheDocument();
    expect(screen.getByText("En casa")).toBeInTheDocument();
  });

  it("opens the cancellation flow from the detail header for an active reservation", () => {
    useReservationDetailMock.mockReturnValue({ data: detailData(), error: null, isLoading: false, refetch: vi.fn() });
    useCancellationPreviewMock.mockReturnValue({
      data: {
        reservationId: "HB-2026-08421",
        policySummary: "Flexible 48h · Viajes Maya.",
        cutoffAt: new Date(2026, 7, 26, 15, 0),
        penaltyAmount: 1160,
        refundAmount: 0,
        releaseNote: null,
        canCancel: true,
        reason: null,
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useApplyCancellationMock.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    expect(screen.getByRole("heading", { name: "Cancelar reserva" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Cancelar reserva" })).getByText("Política aplicable")).toBeInTheDocument();
  });

  it("does not offer cancellation for a non-cancellable state", () => {
    const data = detailData();
    data.status = "NO_SHOW";
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.getByText("No-show")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar reserva" })).not.toBeInTheDocument();
  });

  it("opens the no-show flow from the detail header for a NO_SHOW_PENDING reservation", () => {
    const data = detailData();
    data.status = "NO_SHOW_PENDING";
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });
    useNoShowPreviewMock.mockReturnValue({
      data: {
        reservationId: "HB-2026-08112",
        policySummary: "No-show: cargo de una noche + impuestos.",
        cutoffAt: new Date(2026, 7, 27, 18, 0),
        allowedCharge: 470,
        releaseNote: "Estándar Doble 101 · 27–29 ago",
        canMarkNoShow: true,
        reason: null,
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    useApplyNoShowMock.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08112" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Marcar no-show" }));

    expect(screen.getByRole("heading", { name: "Marcar no-show" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Marcar no-show" })).getByText("Política aplicable")).toBeInTheDocument();
  });

  it("renders the room move action per active stay and opens the stays RoomMove flow", () => {
    useReservationDetailMock.mockReturnValue({ data: detailData(), error: null, isLoading: false, refetch: vi.fn() });

    RoomMoveMock.mockReset();
    RoomMoveMock.mockImplementation(() => <div data-testid="room-move" />);

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cambiar habitación" }));

    expect(screen.getByTestId("room-move")).toBeInTheDocument();
    expect(RoomMoveMock).toHaveBeenCalledTimes(1);
    expect(RoomMoveMock.mock.calls[0][0]).toMatchObject({
      propertyId: "GT-HB-01",
      endpoint: "http://pms.test/contract/reservations",
      reservationId: "HB-2026-08421",
      stayId: "STAY-001",
      onClose: expect.any(Function),
    });
  });

  it("does not offer the room move action for a non-moveable travel state", () => {
    const data = detailData();
    data.stays[0].travelState = "CHECKED_OUT";
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.queryByRole("button", { name: "Cambiar habitación" })).not.toBeInTheDocument();
  });

  it("opens the stays extension flow for an active stay and passes the stay id", () => {
    useReservationDetailMock.mockReturnValue({ data: detailData(), error: null, isLoading: false, refetch: vi.fn() });

    StayExtensionMock.mockReset();
    StayExtensionMock.mockImplementation(() => <div data-testid="stay-extension" />);

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Extender estadía" }));

    expect(screen.getByTestId("stay-extension")).toBeInTheDocument();
    expect(StayExtensionMock).toHaveBeenCalledTimes(1);
    expect(StayExtensionMock.mock.calls[0][0]).toMatchObject({
      propertyId: "GT-HB-01",
      endpoint: "http://pms.test/contract/reservations",
      reservationId: "HB-2026-08421",
      stayId: "STAY-001",
      onClose: expect.any(Function),
    });
  });

  it("does not offer the extension action for a non-extensible travel state", () => {
    const data = detailData();
    data.stays[0].travelState = "NO_SHOW";
    useReservationDetailMock.mockReturnValue({ data, error: null, isLoading: false, refetch: vi.fn() });

    render(
      <ReservationDetail propertyId="GT-HB-01" endpoint="http://pms.test/contract/reservations" reservationId="HB-2026-08421" />,
    );

    expect(screen.queryByRole("button", { name: "Extender estadía" })).not.toBeInTheDocument();
  });
});
