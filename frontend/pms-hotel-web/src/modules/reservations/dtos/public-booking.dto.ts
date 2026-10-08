export interface PublicBookingRequestDTO {
  propertyId: string;
  arrival: string;
  departure: string;
  currency: 'GTQ';
  clientTotalMinor: number;
  stays: { roomTypeId: string; ratePlanId: string; quantity: number }[];
  bookingGuest: { firstName: string; lastName: string; email: string };
  paymentMode: 'SIMULATED_CARD';
}

export interface PublicBookingResponseDTO {
  reservationId: string;
  confirmationCode: string;
  status: 'CONFIRMED';
  currency: 'GTQ';
  totalMinor: number;
  payment: { provider: 'SIMULATED'; status: 'APPROVED'; reference: string };
  stays: { reservationStayId: string; roomTypeId: string; roomId: null; arrival: string; departure: string }[];
}
