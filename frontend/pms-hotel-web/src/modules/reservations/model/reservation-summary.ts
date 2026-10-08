export type ReservationStatus =
  | "CONFIRMED"
  | "PENDING"
  | "WAITLIST"
  | "NO_SHOW_PENDING"
  | "NO_SHOW"
  | "CANCELLED";

export type ReservationFinanceState = "PAID" | "BALANCE" | "DEPOSIT" | "NO_CAPTURE" | "ESTIMATED";

export interface ReservationFinancialSummary {
  totalAmount: number | null;
  /** Null cuando el contrato no proporciona evidencia de captura; no inferir desde APPROVED. */
  paidAmount: number | null;
  financeState: ReservationFinanceState | null;
}

export interface ReservationListItem {
  stayRooms?: Array<{ roomType: string; room: string | null }>;
  confirmationCode?: string;
  readOnly?: boolean;
  id: string;
  propertyId: string;
  guestName: string | null;
  sourceLabel: string | null;
  sourceReference: string | null;
  roomLabel: string | null;
  stayStart: Date | null;
  stayEnd: Date | null;
  nights: number | null;
  adults: number | null;
  roomCount: number | null;
  currency: string;
  finance: ReservationFinancialSummary;
  alertText: string | null;
  status: ReservationStatus;
  statusDetail: string | null;
}

export interface ReservationAlertItem {
  id: string;
  kind: string;
  message: string;
}

export interface ReservationCenterSummary {
  arrivalsToday: number;
  departuresToday: number;
  vipToday: number;
  multiRoomToday: number;
  lateCheckoutToday: number;
  alerts: number;
  confirmedNextDays: number;
  decisionsRequired: number;
  total: number;
}

export interface ReservationCenterData {
  readOnly?: boolean;
  summary: ReservationCenterSummary | null;
  alerts: ReservationAlertItem[];
  reservations: ReservationListItem[];
}
