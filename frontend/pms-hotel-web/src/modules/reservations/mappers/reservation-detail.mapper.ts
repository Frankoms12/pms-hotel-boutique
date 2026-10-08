import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { optionalText, parseAmount, parseDay, requiredNumber, requiredText } from "@/lib/mapper";

import type {
  ReservationDetailDto,
  ReservationFinanceLineDto,
  ReservationGuestSummaryDto,
  ReservationStayDetailDto,
} from "../dtos/reservation-detail.dto";
import type { ReservationDetailFinancialSummary, ReservationDetailData, ReservationFinanceLine, ReservationGuestSummary, ReservationStayDetail } from "../model/reservation-detail";

function mapStay(dto: ReservationStayDetailDto): ReservationStayDetail {
  if ((dto.room_id === null) !== (dto.room_label === null)) throw new DomainMappingError('INCONSISTENT_ROOM_ASSIGNMENT');
  return {
    id: requiredText(dto.stay_id, "INVALID_RESERVATION_STAY_ID"),
    roomId: dto.room_id === null ? null : requiredText(dto.room_id, "INVALID_RESERVATION_STAY_ROOM_ID"),
    roomLabel: dto.room_label === null ? null : requiredText(dto.room_label, "INVALID_RESERVATION_STAY_ROOM_LABEL"),
    roomType: requiredText(dto.room_type, "INVALID_RESERVATION_STAY_ROOM_TYPE"),
    checkIn: parseDay(dto.check_in, "INVALID_RESERVATION_STAY_CHECK_IN"),
    checkOut: parseDay(dto.check_out, "INVALID_RESERVATION_STAY_CHECK_OUT"),
    nights: requiredNumber(dto.nights, "INVALID_RESERVATION_STAY_NIGHTS"),
    travelState: requiredText(dto.travel_state, "INVALID_RESERVATION_STAY_TRAVEL_STATE") as ReservationStayDetail["travelState"],
  };
}

function mapGuest(dto: ReservationGuestSummaryDto): ReservationGuestSummary {
  return {
    primaryName: requiredText(dto.primary_name, "INVALID_RESERVATION_GUEST_NAME"),
    phone: optionalText(dto.phone),
    adults: requiredNumber(dto.adults, "INVALID_RESERVATION_ADULTS"),
    children: dto.children === null ? null : requiredNumber(dto.children, "INVALID_RESERVATION_CHILDREN"),
  };
}

function mapFinanceLine(dto: ReservationFinanceLineDto): ReservationFinanceLine {
  return {
    label: requiredText(dto.label, "INVALID_RESERVATION_FINANCE_LINE_LABEL"),
    amount: parseAmount(dto.amount, "INVALID_RESERVATION_FINANCE_LINE_AMOUNT"),
  };
}

function mapFinance(dto: ReservationDetailDto): ReservationDetailFinancialSummary {
  return {
    totalAmount: parseAmount(dto.total_amount, "INVALID_RESERVATION_TOTAL_AMOUNT"),
    paidAmount: dto.paid_amount === null ? null : parseAmount(dto.paid_amount, "INVALID_RESERVATION_PAID_AMOUNT"),
    financeState: requiredText(dto.finance_state, "INVALID_RESERVATION_FINANCE_STATE") as ReservationDetailFinancialSummary["financeState"],
    ratePerNight: parseAmount(dto.rate_per_night, "INVALID_RESERVATION_RATE_PER_NIGHT"),
    lines: dto.lines.map(mapFinanceLine),
  };
}

export function mapReservationDetail(dto: ReservationDetailDto): ReservationDetailData {
  if (dto.stays.length === 0) {
    throw new DomainMappingError("INVALID_RESERVATION_STAYS");
  }

  return {
    id: requiredText(dto.reservation_id, "INVALID_RESERVATION_ID"),
    propertyId: requiredText(dto.property_id, "INVALID_RESERVATION_PROPERTY_ID"),
    status: requiredText(dto.status, "INVALID_RESERVATION_STATUS") as ReservationDetailData["status"],
    createdAt: parseDay(dto.created_at, "INVALID_RESERVATION_CREATED_AT"),
    source: {
      label: requiredText(dto.source.label, "INVALID_RESERVATION_SOURCE_LABEL"),
      reference: optionalText(dto.source.reference),
    },
    policyLabel: requiredText(dto.policy_label, "INVALID_RESERVATION_POLICY_LABEL"),
    guest: mapGuest(dto.guest),
    stays: dto.stays.map(mapStay),
    notes: optionalText(dto.notes),
    currency: requiredText(dto.currency, "INVALID_RESERVATION_CURRENCY"),
    finance: mapFinance(dto),
  };
}
