/** Staff read contract: backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md. */
export interface StaffReservationDto {
  reservationId: string;
  propertyId: string;
  confirmationCode: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  source: string | null;
  sourceReference: string | null;
  currency: string;
  createdAt: string;
  responsibleGuest: { profileId: string; firstName: string; lastName: string } | null;
  stays: Array<{
    stayId: string;
    arrival: string;
    departure: string;
    status: 'RESERVED' | 'IN_HOUSE' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
    roomType: { roomTypeId: string; code: string; name: string };
    room: { roomId: string; code: string } | null;
  }>;
}
