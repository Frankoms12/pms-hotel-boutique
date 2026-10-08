/**
 * Public API for the reservations module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { ReservationCenter } from "./components/reservation-center";
export { StaffNewReservation } from './components/staff-new-reservation';
export { confirmDemoBooking } from './hooks/confirm-demo-booking';
export { confirmPublicBooking } from './hooks/confirm-public-booking';
export type { PublicBookingRequest, PublicBookingConfirmation, BookingConfirmation } from './model/public-booking';
export type { DemoBookingRequest, DemoBookingConfirmation } from './model/demo-booking';
export { ReservationDetail } from "./components/reservation-detail";
export { WaitlistBoard } from "./components/waitlist-board";
export { ReservationCancellation } from "./components/reservation-cancellation";
export { CalendarGantt } from "./calendar/calendar-gantt";
export type { GanttBooking, GanttCell, GanttGrid, GanttRow } from "./calendar/calendar-gantt-model";
export { ReservationNoShow } from "./components/reservation-no-show";
export { WaitlistConversionPanel } from "./components/waitlist-conversion-panel";
export type {
  ReservationDetailData,
  ReservationDetailFinancialSummary,
  ReservationFinanceLine,
  ReservationGuestSummary,
  ReservationSource,
  ReservationStayDetail,
  StayTravelState,
} from "./model/reservation-detail";
export type {
  ReservationAlertItem,
  ReservationCenterData,
  ReservationCenterSummary,
  ReservationFinancialSummary,
  ReservationListItem,
  ReservationStatus,
} from "./model/reservation-summary";
export type { CancellationPreview, CancellationResult } from "./model/reservation-cancellation";
export type { NoShowPreview, NoShowResult } from "./model/reservation-no-show";
export type {
  WaitlistAvailability,
  WaitlistConversionPreview,
  WaitlistConversionResult,
} from "./model/waitlist";
