/** PROVISIONAL frontend mock contract. No Staff booking HTTP API is confirmed. */
export interface StaffReservationQuoteDto {
  quote_id: string; property_id: string; arrival: string; departure: string; nights: number;
  adults: number; children: number; rooms: number;
  options: {
    room_type_id: string; room_type_name: string; rate_plan_id: string; rate_plan_name: string;
    capacity: number; available_rooms: number; nightly_minor: number; total_minor: number; currency: string;
  }[];
}
