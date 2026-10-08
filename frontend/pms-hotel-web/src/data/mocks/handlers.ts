import { accountHandlers } from "./account-handlers";
import { staffPreviewHandlers } from './staff-preview';
import { staffRoomCatalogHandlers } from "./staff-room-catalog";
import { reservationLinkHandlers } from './reservation-link-handlers';
import { publicCheckoutHandlers } from './public-checkout-handlers';
import { http, HttpResponse } from "msw";
import { private07Handlers } from "./private-07";
import { private09Handlers } from "./private-09";
import { buildPublicAvailabilityMock } from "./public-availability";
import { publicCatalogueFixture } from "./public-catalogue";

import type { AvailabilityMatrixResponseDto } from "@/modules/availability";
import type {
  FolioDto,
  SplitChargeRequestDto,
  SplitChargeResultDto,
  TransferChargeRequestDto,
  TransferChargeResultDto,
} from "@/modules/folio";
import type {
  AuthorizePaymentRequestDto,
  CapturePaymentRequestDto,
  PaymentDto,
  PaymentGuaranteeRequestDto,
  PaymentGuaranteeResponseDto,
  PaymentListResponseDto,
  RefundPaymentRequestDto,
  VoidPaymentRequestDto,
} from "@/modules/payments";
import type {
  RatePlanDto,
  RatePlanListResponseDto,
  RateRestrictionDto,
  BatchUpdateRateRestrictionsPayloadDto,
  RateRestrictionBatchResultDto,
} from "@/modules/rates";
import type {
  SellLimitDto,
  UpdateSellLimitRequestDto,
  SellLimitListResponseDto,
} from "@/modules/inventory";

export const mockAvailabilitySuccessDto = {
  property_id: "prop_boutique_01",
  check_in_date: "2026-10-01",
  check_out_date: "2026-10-04",
  total_nights: 3,
  available_room_types: [
    {
      room_type_id: "rt_deluxe_king",
      name: "Deluxe King Suite",
      code: "DLX-KNG",
      description: "Habitación espaciosa con cama King size, vista al jardín y terraza privada.",
      max_occupancy: 2,
      available_rooms_count: 5,
      rate_plans: [
        {
          rate_plan_id: "rp_flexible",
          rate_plan_name: "Tarifa Flexible",
          description: "Cancelación gratuita hasta 48 horas antes de la llegada.",
          base_nightly_rate: "250.00",
          total_amount: "750.00",
          currency: "USD",
          cancellation_policy: "Cancelación gratuita hasta 48h antes del check-in.",
          meals_included: "Desayuno a la carta incluido",
        },
        {
          rate_plan_id: "rp_non_refundable",
          rate_plan_name: "Tarifa No Reembolsable",
          description: "15% de descuento por pago anticipado.",
          base_nightly_rate: "212.50",
          total_amount: "637.50",
          currency: "USD",
          cancellation_policy: "No reembolsable en caso de cancelación o no-show.",
          meals_included: null,
        },
      ],
      images: ["/images/rooms/deluxe-king-1.webp", "/images/rooms/deluxe-king-2.webp"],
    },
    {
      room_type_id: "rt_master_suite",
      name: "Master Suite Presidencial",
      code: "MST-STE",
      description: "Suite de lujo con sala de estar, jacuzzi y balcón panorámico.",
      max_occupancy: 4,
      available_rooms_count: 2,
      rate_plans: [
        {
          rate_plan_id: "rp_flexible_vip",
          rate_plan_name: "Tarifa Flexible VIP",
          description: "Incluye todos los servicios boutique y traslado al aeropuerto.",
          base_nightly_rate: "480.00",
          total_amount: "1440.00",
          currency: "USD",
          cancellation_policy: "Cancelación gratuita hasta 24h antes.",
          meals_included: "Desayuno gourmet y degustación de vinos",
        },
      ],
      images: ["/images/rooms/master-suite-1.webp"],
    },
  ],
};

export const mockAvailabilityEmptyDto = {
  property_id: "prop_boutique_01",
  check_in_date: "2026-10-01",
  check_out_date: "2026-10-04",
  total_nights: 3,
  available_room_types: [],
};

export const mockGuestFolioDto: FolioDto = {
  folio_id: "fol_guest_101",
  folio_number: "FOL-2026-0089",
  reservation_id: "res_demo_101",
  stay_id: "stay_demo_101_a",
  type: "GUEST",
  status: "OPEN",
  holder_name: "Carlos Morales",
  room_number: "Suite 204",
  currency: "USD",
  total_charges: "980.00",
  total_payments: "500.00",
  balance: "480.00",
  charges: [
    {
      charge_id: "chg_01",
      category: "ROOM_NIGHT",
      description: "Noche 1 - Suite King (01/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-01T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_02",
      category: "ROOM_NIGHT",
      description: "Noche 2 - Suite King (02/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-02T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_03",
      category: "ROOM_NIGHT",
      description: "Noche 3 - Suite King (03/10/2026)",
      amount: "250.00",
      currency: "USD",
      posted_at: "2026-10-03T15:00:00.000Z",
      posted_by: "system_night_audit",
    },
    {
      charge_id: "chg_04",
      category: "RESTAURANT",
      description: "Cena Restaurante La Terraza",
      amount: "130.00",
      currency: "USD",
      posted_at: "2026-10-02T21:30:00.000Z",
      posted_by: "pos_restaurant",
    },
    {
      charge_id: "chg_05",
      category: "SPA",
      description: "Masaje Relajante Spa Boutique",
      amount: "100.00",
      currency: "USD",
      posted_at: "2026-10-03T11:00:00.000Z",
      posted_by: "staff_spa",
    },
  ],
  payments: [
    {
      payment_entry_id: "pay_entry_01",
      payment_id: "pay_online_guarantee_101",
      amount: "500.00",
      currency: "USD",
      method: "CREDIT_CARD",
      paid_at: "2026-10-01T14:30:00.000Z",
      reference: "ref_stripe_8871",
    },
  ],
  routing_rules: [
    {
      rule_id: "rule_01",
      source_folio_id: "fol_guest_101",
      target_folio_id: "fol_company_202",
      category: "ROOM_NIGHT",
      percentage: 100,
      created_at: "2026-10-01T14:00:00.000Z",
    },
  ],
  created_at: "2026-10-01T14:00:00.000Z",
};

function handleAvailabilityRequest({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");

  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const response = buildPublicAvailabilityMock(url.searchParams,
    propertyId === "empty_property" ? mockAvailabilityEmptyDto : publicCatalogueFixture);
  return response ? HttpResponse.json(response) : HttpResponse.json({ error: "Invalid search criteria" }, { status: 400 });
}

async function handlePaymentGuaranteeRequest({ request }: { request: Request }) {
  const body = (await request.json()) as PaymentGuaranteeRequestDto;

  if (body.card_token === "tok_error") {
    return HttpResponse.json({ error: "Gateway Timeout" }, { status: 500 });
  }

  if (body.card_token === "tok_declined") {
    const declinedResponse: PaymentGuaranteeResponseDto = {
      payment_id: "pay_declined_999",
      status: "DECLINED",
      amount: body.amount,
      currency: body.currency,
      provider_reference: null,
      last4: body.last4 ?? "0002",
      card_brand: body.card_brand ?? "Visa",
      created_at: new Date().toISOString(),
      failure_reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
    };
    return HttpResponse.json(declinedResponse);
  }

  const successResponse: PaymentGuaranteeResponseDto = {
    payment_id: `pay_${Date.now()}`,
    status: body.payment_method === "PAY_AT_HOTEL" ? "PENDING_GUARANTEE" : "AUTHORIZED",
    amount: body.amount,
    currency: body.currency,
    provider_reference: `ref_stripe_${Date.now()}`,
    last4: body.last4 ?? "4242",
    card_brand: body.card_brand ?? "Visa",
    created_at: new Date().toISOString(),
    failure_reason: null,
  };

  return HttpResponse.json(successResponse);
}

function handleGetFolioById({ params }: { params: Record<string, string | readonly string[] | undefined> }) {
  const folioId = params.id;
  if (folioId === "error_folio") {
    return HttpResponse.json({ error: "Folio Internal Error" }, { status: 500 });
  }
  if (folioId === "fol_unauthorized") {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (folioId === "missing_folio") {
    return HttpResponse.json({ error: "Folio Not Found" }, { status: 404 });
  }
  return HttpResponse.json({
    ...mockGuestFolioDto,
    folio_id: typeof folioId === "string" ? folioId : mockGuestFolioDto.folio_id,
  });
}

async function handleSplitChargeRequest({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const folioId = typeof params.id === "string" ? params.id : "fol_guest_101";
  const body = (await request.json()) as SplitChargeRequestDto;

  if (body.charge_id === "error_charge") {
    return HttpResponse.json({ error: "Split Failed" }, { status: 500 });
  }

  const createdCharges = body.portions.map((p, idx) => ({
    charge_id: `chg_split_${Date.now()}_${idx + 1}`,
    category: "RESTAURANT" as const,
    description: p.description || `Porción dividida ${idx + 1}`,
    amount: p.amount,
    currency: "USD",
    posted_at: new Date().toISOString(),
    posted_by: "staff_frontdesk",
    original_split_charge_id: body.charge_id,
  }));

  const remainingCharges = mockGuestFolioDto.charges.filter((c) => c.charge_id !== body.charge_id);
  const updatedCharges = [...remainingCharges, createdCharges[0]];

  const totalChargesNum = updatedCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaymentsNum = mockGuestFolioDto.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const updatedSourceFolio: FolioDto = {
    ...mockGuestFolioDto,
    folio_id: folioId,
    charges: updatedCharges,
    total_charges: totalChargesNum.toFixed(2),
    balance: (totalChargesNum - totalPaymentsNum).toFixed(2),
  };

  const response: SplitChargeResultDto = {
    original_charge_id: body.charge_id,
    source_folio_id: folioId,
    created_charges: createdCharges,
    updated_source_folio: updatedSourceFolio,
  };

  return HttpResponse.json(response);
}

async function handleTransferChargeRequest({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const folioId = typeof params.id === "string" ? params.id : "fol_guest_101";
  const body = (await request.json()) as TransferChargeRequestDto;

  if (body.charge_id === "error_charge") {
    return HttpResponse.json({ error: "Transfer Failed" }, { status: 500 });
  }

  const updatedCharges = mockGuestFolioDto.charges.map((c) => {
    if (c.charge_id === body.charge_id) {
      return {
        ...c,
        is_transferred: true,
        transferred_to_folio_id: body.target_folio_id,
        transfer_reason: body.reason,
      };
    }
    return c;
  });

  const activeCharges = updatedCharges.filter((c) => !c.is_voided && !c.is_transferred);
  const totalChargesNum = activeCharges.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPaymentsNum = mockGuestFolioDto.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const updatedSourceFolio: FolioDto = {
    ...mockGuestFolioDto,
    folio_id: folioId,
    charges: updatedCharges,
    total_charges: totalChargesNum.toFixed(2),
    balance: (totalChargesNum - totalPaymentsNum).toFixed(2),
  };

  const response: TransferChargeResultDto = {
    transferred_charge_id: body.charge_id,
    source_folio_id: folioId,
    target_folio_id: body.target_folio_id,
    reason: body.reason,
    transferred_at: new Date().toISOString(),
    updated_source_folio: updatedSourceFolio,
  };

  return HttpResponse.json(response);
}

async function handleCreateRoutingRule({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const folioId = typeof params.id === "string" ? params.id : "fol_guest_101";
  const body = (await request.json()) as any;

  if (folioId === "error_folio") {
    return HttpResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }

  const response: any = {
    rule_id: `rule_${Date.now()}`,
    source_folio_id: folioId,
    target_folio_id: body.target_folio_id,
    category: body.category || body.charge_category || "ROOM",
    charge_category: body.category || body.charge_category || "ROOM",
    percentage: body.percentage || body.split_percentage || 100,
    split_percentage: body.percentage || body.split_percentage || 100,
    created_at: new Date().toISOString(),
  };

  return HttpResponse.json(response);
}

export const mockPaymentsListDto: PaymentDto[] = [
  {
    payment_id: "pay_101",
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD",
    status: "AUTHORIZED",
    currency: "USD",
    authorized_amount: "750.00",
    captured_amount: "0.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_auth_101",
    last4: "4242",
    card_brand: "Visa",
    created_at: "2026-10-01T10:00:00.000Z",
    updated_at: "2026-10-01T10:00:00.000Z",
    failure_reason: null,
    audit_trail: [
      {
        audit_id: "aud_01",
        action: "AUTHORIZE",
        amount: "750.00",
        currency: "USD",
        performed_by: "system_gateway",
        performed_at: "2026-10-01T10:00:00.000Z",
        provider_reference: "tx_mock_auth_101",
      },
    ],
  },
  {
    payment_id: "pay_102",
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD",
    status: "CAPTURED",
    currency: "USD",
    authorized_amount: "200.00",
    captured_amount: "200.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_cap_102",
    last4: "5555",
    card_brand: "MasterCard",
    created_at: "2026-10-01T12:00:00.000Z",
    updated_at: "2026-10-01T12:05:00.000Z",
    failure_reason: null,
    audit_trail: [
      {
        audit_id: "aud_02",
        action: "AUTHORIZE",
        amount: "200.00",
        currency: "USD",
        performed_by: "system_gateway",
        performed_at: "2026-10-01T12:00:00.000Z",
      },
      {
        audit_id: "aud_03",
        action: "CAPTURE",
        amount: "200.00",
        currency: "USD",
        performed_by: "staff_frontdesk",
        performed_at: "2026-10-01T12:05:00.000Z",
        provider_reference: "tx_mock_cap_102",
      },
    ],
  },
  {
    payment_id: "pay_103",
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD",
    status: "PARTIALLY_REFUNDED",
    currency: "USD",
    authorized_amount: "300.00",
    captured_amount: "300.00",
    refunded_amount: "100.00",
    provider_reference: "tx_mock_ref_103",
    last4: "3000",
    card_brand: "American Express",
    created_at: "2026-10-01T14:00:00.000Z",
    updated_at: "2026-10-01T15:00:00.000Z",
    failure_reason: null,
    audit_trail: [
      {
        audit_id: "aud_04",
        action: "CAPTURE",
        amount: "300.00",
        currency: "USD",
        performed_by: "staff_frontdesk",
        performed_at: "2026-10-01T14:00:00.000Z",
      },
      {
        audit_id: "aud_05",
        action: "REFUND",
        amount: "100.00",
        currency: "USD",
        performed_by: "manager_finance",
        performed_at: "2026-10-01T15:00:00.000Z",
        reason: "Cortesía por retraso en check-in",
      },
    ],
  },
];

function handleGetPayments({ request }: { request: Request }) {
  const url = new URL(request.url);
  const folioId = url.searchParams.get("folio_id");
  const status = url.searchParams.get("status");

  let filtered = mockPaymentsListDto;
  if (folioId) {
    filtered = filtered.filter((p) => p.folio_id === folioId);
  }
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  const response: PaymentListResponseDto = {
    payments: filtered,
    total_count: filtered.length,
  };

  return HttpResponse.json(response);
}

function handleGetPaymentById({ params }: { params: Record<string, string | readonly string[] | undefined> }) {
  const paymentId = typeof params.id === "string" ? params.id : "";
  if (paymentId === "error_payment") {
    return HttpResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  const found = mockPaymentsListDto.find((p) => p.payment_id === paymentId);
  if (!found) {
    return HttpResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return HttpResponse.json(found);
}

function handleAuthorizePayment({ request }: { request: Request }) {
  return request.json().then((bodyRaw) => {
    const body = bodyRaw as AuthorizePaymentRequestDto;

    if (body.card_token === "tok_error" || body.amount === "9999.00") {
      return HttpResponse.json({ error: "Authorization failed by gateway" }, { status: 500 });
    }

    if (body.card_token === "tok_declined") {
      const declinedPayment: PaymentDto = {
        payment_id: `pay_auth_${Date.now()}`,
        folio_id: body.folio_id,
        reservation_id: body.reservation_id ?? null,
        stay_id: body.stay_id ?? null,
        method: body.method,
        status: "DECLINED",
        currency: body.currency,
        authorized_amount: "0.00",
        captured_amount: "0.00",
        refunded_amount: "0.00",
        provider_reference: null,
        last4: body.last4 ?? "0000",
        card_brand: body.card_brand ?? "Visa",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        failure_reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
        audit_trail: [
          {
            audit_id: `aud_${Date.now()}`,
            action: "FAIL",
            amount: body.amount,
            currency: body.currency,
            performed_by: "gateway_processor",
            performed_at: new Date().toISOString(),
            reason: "Fondos insuficientes o tarjeta rechazada por el emisor.",
          },
        ],
      };
      return HttpResponse.json(declinedPayment);
    }

    const newPayment: PaymentDto = {
      payment_id: `pay_auth_${Date.now()}`,
      folio_id: body.folio_id,
      reservation_id: body.reservation_id ?? null,
      stay_id: body.stay_id ?? null,
      method: body.method,
      status: "AUTHORIZED",
      currency: body.currency,
      authorized_amount: body.amount,
      captured_amount: "0.00",
      refunded_amount: "0.00",
      provider_reference: `tx_auth_${Date.now()}`,
      last4: body.last4 ?? "4242",
      card_brand: body.card_brand ?? "Visa",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      failure_reason: null,
      audit_trail: [
        {
          audit_id: `aud_${Date.now()}`,
          action: "AUTHORIZE",
          amount: body.amount,
          currency: body.currency,
          performed_by: "staff_frontdesk",
          performed_at: new Date().toISOString(),
          provider_reference: `tx_auth_${Date.now()}`,
        },
      ],
    };

    mockPaymentsListDto.unshift(newPayment);
    return HttpResponse.json(newPayment);
  });
}

function handleCapturePayment({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const paymentId = typeof params.id === "string" ? params.id : "";
  if (paymentId === "error_payment") {
    return HttpResponse.json({ error: "Capture failed by server" }, { status: 500 });
  }

  const existingIndex = mockPaymentsListDto.findIndex((p) => p.payment_id === paymentId);
  const existing = existingIndex !== -1 ? mockPaymentsListDto[existingIndex] : {
    payment_id: paymentId,
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD" as const,
    status: "AUTHORIZED" as const,
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "0.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_auth",
    last4: "4242",
    card_brand: "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [],
  };

  return request.json().then((bodyRaw) => {
    const body = bodyRaw as CapturePaymentRequestDto;
    const captureAmountNum = Number(body.amount);

    if (body.reason === "error_trigger" || captureAmountNum === 9999) {
      return HttpResponse.json({ error: "Capture failed by gateway" }, { status: 500 });
    }

    if (existing.status !== "AUTHORIZED" && existing.status !== "PARTIALLY_CAPTURED") {
      return HttpResponse.json(
        { error: `Payment with status ${existing.status} cannot be captured.` },
        { status: 400 },
      );
    }

    const authorizedNum = Number(existing.authorized_amount);
    const currentlyCapturedNum = Number(existing.captured_amount);
    const remainingCapturable = Math.max(0, authorizedNum - currentlyCapturedNum);

    if (captureAmountNum > remainingCapturable) {
      return HttpResponse.json(
        { error: `Cannot capture $${captureAmountNum}. Maximum capturable amount is $${remainingCapturable.toFixed(2)}.` },
        { status: 400 },
      );
    }

    const newCapturedTotal = currentlyCapturedNum + captureAmountNum;
    const newStatus = newCapturedTotal >= authorizedNum ? ("CAPTURED" as const) : ("PARTIALLY_CAPTURED" as const);

    const updatedPayment: PaymentDto = {
      ...existing,
      status: newStatus,
      captured_amount: newCapturedTotal.toFixed(2),
      updated_at: new Date().toISOString(),
      audit_trail: [
        ...(existing.audit_trail || []),
        {
          audit_id: `aud_cap_${Date.now()}`,
          action: "CAPTURE",
          amount: body.amount,
          currency: existing.currency,
          performed_by: "staff_frontdesk",
          performed_at: new Date().toISOString(),
          reason: body.reason ?? null,
          provider_reference: `tx_cap_${Date.now()}`,
        },
      ],
    };

    if (existingIndex !== -1) {
      mockPaymentsListDto[existingIndex] = updatedPayment;
    } else {
      mockPaymentsListDto.unshift(updatedPayment);
    }

    return HttpResponse.json(updatedPayment);
  });
}

function handleVoidPayment({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const paymentId = typeof params.id === "string" ? params.id : "";
  if (paymentId === "error_payment") {
    return HttpResponse.json({ error: "Void failed by server" }, { status: 500 });
  }

  const existingIndex = mockPaymentsListDto.findIndex((p) => p.payment_id === paymentId);
  const existing = existingIndex !== -1 ? mockPaymentsListDto[existingIndex] : {
    payment_id: paymentId,
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD" as const,
    status: "AUTHORIZED" as const,
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "0.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_auth",
    last4: "4242",
    card_brand: "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [],
  };

  return request.json().then((bodyRaw) => {
    const body = bodyRaw as VoidPaymentRequestDto;

    if (body.reason === "error_trigger") {
      return HttpResponse.json({ error: "Void failed by gateway" }, { status: 500 });
    }

    if (existing.status !== "AUTHORIZED" || Number(existing.captured_amount) > 0) {
      return HttpResponse.json(
        { error: `Payment with status ${existing.status} and captured amount $${existing.captured_amount} is not eligible for void.` },
        { status: 400 },
      );
    }

    const updatedPayment: PaymentDto = {
      ...existing,
      status: "VOIDED",
      updated_at: new Date().toISOString(),
      audit_trail: [
        ...(existing.audit_trail || []),
        {
          audit_id: `aud_void_${Date.now()}`,
          action: "VOID",
          amount: existing.authorized_amount,
          currency: existing.currency,
          performed_by: "staff_frontdesk",
          performed_at: new Date().toISOString(),
          reason: body.reason,
          provider_reference: `tx_void_${Date.now()}`,
        },
      ],
    };

    if (existingIndex !== -1) {
      mockPaymentsListDto[existingIndex] = updatedPayment;
    } else {
      mockPaymentsListDto.unshift(updatedPayment);
    }

    return HttpResponse.json(updatedPayment);
  });
}

function handleRefundPayment({ params, request }: { params: Record<string, string | readonly string[] | undefined>; request: Request }) {
  const paymentId = typeof params.id === "string" ? params.id : "";
  if (paymentId === "error_payment") {
    return HttpResponse.json({ error: "Refund failed by server" }, { status: 500 });
  }

  const existingIndex = mockPaymentsListDto.findIndex((p) => p.payment_id === paymentId);
  const existing = existingIndex !== -1 ? mockPaymentsListDto[existingIndex] : {
    payment_id: paymentId,
    folio_id: "fol_guest_101",
    reservation_id: "res_01",
    stay_id: "stay_01",
    method: "CREDIT_CARD" as const,
    status: "CAPTURED" as const,
    currency: "USD",
    authorized_amount: "500.00",
    captured_amount: "500.00",
    refunded_amount: "0.00",
    provider_reference: "tx_mock_cap",
    last4: "4242",
    card_brand: "Visa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    failure_reason: null,
    audit_trail: [],
  };

  return request.json().then((bodyRaw) => {
    const body = bodyRaw as RefundPaymentRequestDto;
    const refundAmountNum = Number(body.amount);

    if (body.reason === "error_trigger" || refundAmountNum === 9999) {
      return HttpResponse.json({ error: "Refund failed by gateway" }, { status: 500 });
    }

    const capturedNum = Number(existing.captured_amount);
    const currentlyRefundedNum = Number(existing.refunded_amount);
    const remainingRefundable = Math.max(0, capturedNum - currentlyRefundedNum);

    if (refundAmountNum <= 0 || refundAmountNum > remainingRefundable) {
      return HttpResponse.json(
        { error: `Cannot refund $${refundAmountNum}. Maximum refundable amount is $${remainingRefundable.toFixed(2)}.` },
        { status: 400 },
      );
    }

    const newRefundedTotal = currentlyRefundedNum + refundAmountNum;
    const newStatus = newRefundedTotal >= capturedNum ? ("REFUNDED" as const) : ("PARTIALLY_REFUNDED" as const);

    const updatedPayment: PaymentDto = {
      ...existing,
      status: newStatus,
      refunded_amount: newRefundedTotal.toFixed(2),
      updated_at: new Date().toISOString(),
      audit_trail: [
        ...(existing.audit_trail || []),
        {
          audit_id: `aud_ref_${Date.now()}`,
          action: "REFUND",
          amount: body.amount,
          currency: existing.currency,
          performed_by: "staff_frontdesk",
          performed_at: new Date().toISOString(),
          reason: body.reason,
          provider_reference: `tx_ref_${Date.now()}`,
        },
      ],
    };

    if (existingIndex !== -1) {
      mockPaymentsListDto[existingIndex] = updatedPayment;
    } else {
      mockPaymentsListDto.unshift(updatedPayment);
    }

    return HttpResponse.json(updatedPayment);
  });
}

function handleGetAvailabilityMatrix({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id") || "prop_boutique_01";
  const startDate = url.searchParams.get("start_date") || "2026-10-01";
  const endDate = url.searchParams.get("end_date") || "2026-10-07";
  const filterRoomTypeId = url.searchParams.get("room_type_id");

  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Property matrix internal error" }, { status: 500 });
  }

  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return HttpResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  const roomTypes = [
    {
      id: "rt_deluxe_king",
      name: "Deluxe King Suite",
      code: "DLX-KNG",
      physical: 10,
      baseSold: 4,
      ooo: 1,
      oos: 0,
      overbooking: 0,
    },
    {
      id: "rt_exec_double",
      name: "Executive Double Queen",
      code: "EXE-DBL",
      physical: 8,
      baseSold: 3,
      ooo: 0,
      oos: 1,
      overbooking: 0,
    },
    {
      id: "rt_master_suite",
      name: "Master Suite Presidencial",
      code: "MST-STE",
      physical: 4,
      baseSold: 2,
      ooo: 0,
      oos: 0,
      overbooking: 0,
    },
  ];

  const filteredTypes = filterRoomTypeId
    ? roomTypes.filter((rt) => rt.id === filterRoomTypeId)
    : roomTypes;

  const matrix = filteredTypes.map((rt) => {
    const daily = dates.map((d, index) => {
      const sold = Math.min(rt.physical - rt.ooo - rt.oos, rt.baseSold + (index % 3));
      const ats = rt.physical - sold - rt.ooo - rt.oos + rt.overbooking;
      const effectiveCap = Math.max(1, rt.physical - rt.ooo);
      const occupancyRate = Math.round((sold / effectiveCap) * 100);

      return {
        date: d,
        physical_rooms: rt.physical,
        sold_rooms: sold,
        ooo_rooms: rt.ooo,
        oos_rooms: rt.oos,
        overbooking_adjustment: rt.overbooking,
        ats,
        occupancy_rate: occupancyRate,
        stop_sell: ats <= 0,
        min_los: index === 5 ? 2 : 1,
      };
    });

    return {
      room_type_id: rt.id,
      room_type_name: rt.name,
      room_type_code: rt.code,
      total_physical_capacity: rt.physical,
      daily_availability: daily,
    };
  });

  const totalPhysicalRooms = filteredTypes.reduce((sum, rt) => sum + rt.physical, 0);

  const dailySummaries = dates.map((d, index) => {
    let totalPhysical = 0;
    let totalSold = 0;
    let totalOoo = 0;
    let totalOos = 0;
    let totalAts = 0;

    for (const rtMatrix of matrix) {
      const dayData = rtMatrix.daily_availability[index];
      if (dayData) {
        totalPhysical += dayData.physical_rooms;
        totalSold += dayData.sold_rooms;
        totalOoo += dayData.ooo_rooms;
        totalOos += dayData.oos_rooms;
        totalAts += dayData.ats;
      }
    }

    const effCap = Math.max(1, totalPhysical - totalOoo);
    const avgOcc = Math.round((totalSold / effCap) * 100);

    return {
      date: d,
      total_physical: totalPhysical,
      total_sold: totalSold,
      total_ooo: totalOoo,
      total_oos: totalOos,
      total_ats: totalAts,
      average_occupancy_rate: avgOcc,
    };
  });

  const response: AvailabilityMatrixResponseDto = {
    property_id: propertyId,
    start_date: startDate,
    end_date: endDate,
    dates,
    matrix,
    total_property_physical_rooms: totalPhysicalRooms,
    daily_summaries: dailySummaries,
  };

  return HttpResponse.json(response);
}

export const mockRatePlansListDto: RatePlanDto[] = [
  {
    rate_plan_id: "rp_bar_flex",
    property_id: "prop_boutique_01",
    code: "BAR-FLEX",
    name: "Tarifa Flexible (BAR)",
    description: "Tarifa estándar con cancelación gratuita hasta 48h antes del check-in.",
    status: "ACTIVE",
    pricing_model: "PER_NIGHT",
    currency: "USD",
    base_price_multiplier: 1.0,
    cancellation_policy: "Cancelación gratuita hasta 48 horas previas a la llegada.",
    meals_included: "Desayuno a la carta incluido",
    applicable_room_type_ids: ["rt_deluxe_king", "rt_exec_double", "rt_master_suite"],
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
  },
  {
    rate_plan_id: "rp_non_refundable",
    property_id: "prop_boutique_01",
    code: "NON-REF",
    name: "Tarifa No Reembolsable",
    description: "Descuento del 15% por pago inmediato por adelantado.",
    status: "ACTIVE",
    pricing_model: "PER_NIGHT",
    currency: "USD",
    base_price_multiplier: 0.85,
    cancellation_policy: "No reembolsable en caso de cancelación o no-show.",
    meals_included: null,
    applicable_room_type_ids: ["rt_deluxe_king", "rt_exec_double"],
    created_at: "2026-01-10T10:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
  },
  {
    rate_plan_id: "rp_romantic_escape",
    property_id: "prop_boutique_01",
    code: "ROM-ESC",
    name: "Paquete Escapada Romántica & Spa",
    description: "Incluye cena gourmet de 4 tiempos, botella de vino de bienvenida y circuito hidrotermal.",
    status: "ACTIVE",
    pricing_model: "PACKAGE",
    currency: "USD",
    base_price_multiplier: 1.35,
    cancellation_policy: "Cancelación gratuita hasta 7 días antes.",
    meals_included: "Desayuno gourmet y cena de 4 tiempos",
    applicable_room_type_ids: ["rt_deluxe_king", "rt_master_suite"],
    created_at: "2026-02-14T08:00:00.000Z",
    updated_at: "2026-09-01T12:00:00.000Z",
  },
  {
    rate_plan_id: "rp_corp_convenio",
    property_id: "prop_boutique_01",
    code: "CORP-CONV",
    name: "Tarifa Corporativa Preferencial",
    description: "Tarifa especial para empresas con convenio anual.",
    status: "INACTIVE",
    pricing_model: "DERIVED",
    currency: "USD",
    base_price_multiplier: 0.8,
    cancellation_policy: "Cancelación sin penalidad hasta 24h previas.",
    meals_included: "Desayuno buffet ejecutivo",
    applicable_room_type_ids: ["rt_exec_double"],
    created_at: "2026-03-01T09:00:00.000Z",
    updated_at: "2026-08-15T10:00:00.000Z",
  },
];

function handleGetRatePlans({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.toLowerCase();

  let filtered = mockRatePlansListDto;
  if (propertyId) {
    filtered = filtered.filter((rp) => rp.property_id === propertyId);
  }
  if (status) {
    filtered = filtered.filter((rp) => rp.status === status);
  }
  if (search) {
    filtered = filtered.filter(
      (rp) =>
        rp.name.toLowerCase().includes(search) ||
        rp.code.toLowerCase().includes(search) ||
        (rp.description && rp.description.toLowerCase().includes(search)),
    );
  }

  const response: RatePlanListResponseDto = {
    rate_plans: filtered,
    total_count: filtered.length,
  };

  return HttpResponse.json(response);
}

function handleGetRatePlanById({ params }: { params: Record<string, string | readonly string[] | undefined> }) {
  const id = typeof params.id === "string" ? params.id : "";
  if (id === "error_rate_plan") {
    return HttpResponse.json({ error: "RatePlan Internal Error" }, { status: 500 });
  }

  const found = mockRatePlansListDto.find((rp) => rp.rate_plan_id === id);
  if (!found) {
    return HttpResponse.json({ error: "RatePlan Not Found" }, { status: 404 });
  }

  return HttpResponse.json(found);
}

export const mockRateRestrictionsListDto: RateRestrictionDto[] = [
  {
    restriction_id: "res_001",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_flexible",
    room_type_id: "rt_deluxe_king",
    date: "2026-10-01",
    closed_to_arrival: false,
    closed_to_departure: false,
    min_length_of_stay: 1,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_002",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_flexible",
    room_type_id: "rt_deluxe_king",
    date: "2026-10-02",
    closed_to_arrival: true,
    closed_to_departure: false,
    min_length_of_stay: 2,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_003",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_flexible",
    room_type_id: "rt_deluxe_king",
    date: "2026-10-03",
    closed_to_arrival: false,
    closed_to_departure: true,
    min_length_of_stay: 2,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_004",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_non_refundable",
    room_type_id: "rt_deluxe_king",
    date: "2026-10-01",
    closed_to_arrival: false,
    closed_to_departure: false,
    min_length_of_stay: 3,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_005",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_non_refundable",
    room_type_id: "rt_deluxe_king",
    date: "2026-10-02",
    closed_to_arrival: false,
    closed_to_departure: false,
    min_length_of_stay: 3,
    stop_sell: true,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_006",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_flexible",
    room_type_id: "rt_master_suite",
    date: "2026-10-01",
    closed_to_arrival: false,
    closed_to_departure: false,
    min_length_of_stay: 2,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    restriction_id: "res_007",
    property_id: "prop_boutique_01",
    rate_plan_id: "rp_flexible",
    room_type_id: "rt_master_suite",
    date: "2026-10-02",
    closed_to_arrival: true,
    closed_to_departure: false,
    min_length_of_stay: 2,
    stop_sell: false,
    created_at: "2026-09-01T08:00:00.000Z",
    updated_at: "2026-09-01T08:00:00.000Z",
  },
];

function handleGetRateRestrictions({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const ratePlanId = url.searchParams.get("rate_plan_id");
  const roomTypeId = url.searchParams.get("room_type_id");

  let filtered = [...mockRateRestrictionsListDto];
  if (propertyId) {
    filtered = filtered.filter((r) => r.property_id === propertyId);
  }
  if (ratePlanId) {
    filtered = filtered.filter((r) => r.rate_plan_id === ratePlanId);
  }
  if (roomTypeId) {
    filtered = filtered.filter((r) => r.room_type_id === roomTypeId);
  }
  if (startDate) {
    filtered = filtered.filter((r) => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((r) => r.date <= endDate);
  }

  return HttpResponse.json({ restrictions: filtered });
}

async function handleBatchUpdateRateRestrictions({ request }: { request: Request }) {
  const body = (await request.json()) as BatchUpdateRateRestrictionsPayloadDto;
  if (!body || !body.property_id || !Array.isArray(body.restrictions)) {
    return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated: RateRestrictionDto[] = [];
  for (const item of body.restrictions) {
    const existingIndex = mockRateRestrictionsListDto.findIndex(
      (r) =>
        r.property_id === body.property_id &&
        r.rate_plan_id === item.rate_plan_id &&
        r.room_type_id === item.room_type_id &&
        r.date === item.date,
    );

    if (existingIndex >= 0) {
      const existing = mockRateRestrictionsListDto[existingIndex];
      const updatedItem: RateRestrictionDto = {
        ...existing,
        closed_to_arrival:
          item.closed_to_arrival !== undefined ? item.closed_to_arrival : existing.closed_to_arrival,
        closed_to_departure:
          item.closed_to_departure !== undefined ? item.closed_to_departure : existing.closed_to_departure,
        min_length_of_stay:
          item.min_length_of_stay !== undefined ? item.min_length_of_stay : existing.min_length_of_stay,
        stop_sell: item.stop_sell !== undefined ? item.stop_sell : existing.stop_sell,
        updated_at: new Date().toISOString(),
      };
      mockRateRestrictionsListDto[existingIndex] = updatedItem;
      updated.push(updatedItem);
    } else {
      const newItem: RateRestrictionDto = {
        restriction_id: `res_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        property_id: body.property_id,
        rate_plan_id: item.rate_plan_id,
        room_type_id: item.room_type_id,
        date: item.date,
        closed_to_arrival: item.closed_to_arrival ?? false,
        closed_to_departure: item.closed_to_departure ?? false,
        min_length_of_stay: item.min_length_of_stay ?? 1,
        stop_sell: item.stop_sell ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockRateRestrictionsListDto.push(newItem);
      updated.push(newItem);
    }
  }

  const result: RateRestrictionBatchResultDto = {
    success: true,
    updated_count: updated.length,
    restrictions: updated,
  };

  return HttpResponse.json(result);
}

export const mockSellLimitsListDto: SellLimitDto[] = [
  {
    limit_id: "lim_001",
    property_id: "prop_boutique_01",
    room_type_id: "rt_deluxe_king",
    room_type_name: "Deluxe King Suite",
    date: "2026-10-01",
    physical_rooms_count: 10,
    ooo_rooms_count: 1,
    oos_rooms_count: 0,
    sold_rooms_count: 4,
    overbooking_limit: 2,
    sell_limit: null,
    calculated_ats: 7, // 10 - 1 - 0 - 4 + 2 = 7
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    limit_id: "lim_002",
    property_id: "prop_boutique_01",
    room_type_id: "rt_deluxe_king",
    room_type_name: "Deluxe King Suite",
    date: "2026-10-02",
    physical_rooms_count: 10,
    ooo_rooms_count: 0,
    oos_rooms_count: 1,
    sold_rooms_count: 7,
    overbooking_limit: 1,
    sell_limit: 3,
    calculated_ats: 3,
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    limit_id: "lim_003",
    property_id: "prop_boutique_01",
    room_type_id: "rt_master_suite",
    room_type_name: "Master Suite Presidencial",
    date: "2026-10-01",
    physical_rooms_count: 4,
    ooo_rooms_count: 0,
    oos_rooms_count: 0,
    sold_rooms_count: 2,
    overbooking_limit: 0,
    sell_limit: null,
    calculated_ats: 2,
    updated_at: "2026-09-01T08:00:00.000Z",
  },
  {
    limit_id: "lim_004",
    property_id: "prop_boutique_01",
    room_type_id: "rt_master_suite",
    room_type_name: "Master Suite Presidencial",
    date: "2026-10-02",
    physical_rooms_count: 4,
    ooo_rooms_count: 0,
    oos_rooms_count: 0,
    sold_rooms_count: 3,
    overbooking_limit: 1,
    sell_limit: null,
    calculated_ats: 2,
    updated_at: "2026-09-01T08:00:00.000Z",
  },
];

function handleGetSellLimits({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id");
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const roomTypeId = url.searchParams.get("room_type_id");

  let filtered = [...mockSellLimitsListDto];
  if (propertyId) {
    filtered = filtered.filter((i) => i.property_id === propertyId);
  }
  if (roomTypeId) {
    filtered = filtered.filter((i) => i.room_type_id === roomTypeId);
  }
  if (startDate) {
    filtered = filtered.filter((i) => i.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((i) => i.date <= endDate);
  }

  const response: SellLimitListResponseDto = {
    items: filtered,
    total_count: filtered.length,
  };

  return HttpResponse.json(response);
}

async function handleUpdateSellLimit({ request }: { request: Request }) {
  const body = (await request.json()) as UpdateSellLimitRequestDto;
  if (!body || !body.property_id || !body.room_type_id || !body.date) {
    return HttpResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existingIndex = mockSellLimitsListDto.findIndex(
    (i) =>
      i.property_id === body.property_id &&
      i.room_type_id === body.room_type_id &&
      i.date === body.date,
  );

  let updatedItem: SellLimitDto;
  if (existingIndex >= 0) {
    const existing = mockSellLimitsListDto[existingIndex];
    const base = Math.max(0, existing.physical_rooms_count - existing.ooo_rooms_count - existing.oos_rooms_count - existing.sold_rooms_count);
    const withOverbooking = Math.max(0, base + body.overbooking_limit);
    const finalAts = body.sell_limit !== null && body.sell_limit >= 0
      ? Math.min(body.sell_limit, withOverbooking)
      : withOverbooking;

    updatedItem = {
      ...existing,
      overbooking_limit: body.overbooking_limit,
      sell_limit: body.sell_limit,
      calculated_ats: finalAts,
      updated_at: new Date().toISOString(),
    };
    mockSellLimitsListDto[existingIndex] = updatedItem;
  } else {
    const base = 5;
    const withOverbooking = Math.max(0, base + body.overbooking_limit);
    const finalAts = body.sell_limit !== null && body.sell_limit >= 0
      ? Math.min(body.sell_limit, withOverbooking)
      : withOverbooking;

    updatedItem = {
      limit_id: `lim_gen_${Date.now()}`,
      property_id: body.property_id,
      room_type_id: body.room_type_id,
      room_type_name: body.room_type_id,
      date: body.date,
      physical_rooms_count: 5,
      ooo_rooms_count: 0,
      oos_rooms_count: 0,
      sold_rooms_count: 0,
      overbooking_limit: body.overbooking_limit,
      sell_limit: body.sell_limit,
      calculated_ats: finalAts,
      updated_at: new Date().toISOString(),
    };
    mockSellLimitsListDto.push(updatedItem);
  }

  return HttpResponse.json(updatedItem);
}

function handleGetRevenueKpis({ request }: { request: Request }) {
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("property_id") || url.searchParams.get("propertyId") || "prop_boutique_01";
  const startDate = url.searchParams.get("start_date") || url.searchParams.get("startDate") || "2023-10-01";
  
  if (propertyId === "error_property") {
    return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const mockResponse = {
    property_id: propertyId,
    currency: "USD",
    summary: {
      occupancy_percent: 82.5,
      adr: 215.5,
      rev_par: 177.78,
      pickup: 12,
      pace: 5.4,
      total_rooms_sold: 240,
      total_rooms_available: 290,
      total_revenue: 51720,
    },
    daily: [
      {
        date: startDate,
        occupancy_percent: 80,
        adr: 200,
        rev_par: 160,
        pickup: 2,
        pace: 1.5,
        rooms_sold: 40,
        rooms_available: 50,
        revenue: 8000,
      },
      {
        date: "2023-10-02",
        occupancy_percent: 85,
        adr: 220,
        rev_par: 187,
        pickup: 5,
        pace: 2.1,
        rooms_sold: 42,
        rooms_available: 50,
        revenue: 9240,
      },
      {
        date: "2023-10-03",
        occupancy_percent: 90,
        adr: 250,
        rev_par: 225,
        pickup: 8,
        pace: 3.5,
        rooms_sold: 45,
        rooms_available: 50,
        revenue: 11250,
      },
    ],
  };

  return HttpResponse.json(mockResponse);
}

import { guestAccessHandlers } from "./guest-access-handlers";

export const handlers = [
  ...staffPreviewHandlers,
  ...staffRoomCatalogHandlers,
  ...publicCheckoutHandlers,
  ...reservationLinkHandlers,
  ...guestAccessHandlers,
  ...accountHandlers,
  ...private07Handlers,
  ...private09Handlers,
  http.get("http://pms.test/__msw/health", () => HttpResponse.json({ status: "ok" })),
  http.get("http://pms.test/__msw/missing", () => HttpResponse.text(null, { status: 404 })),
  http.get("http://pms.test/guest-accounts/:accountId", ({ params }) =>
    HttpResponse.json({
      account_id: params.accountId,
      email: "guest@example.com",
      external_identities: [],
    }),
  ),
  http.get("http://pms.test/api/v1/public/availability", handleAvailabilityRequest),
  http.get("/api/v1/public/availability", handleAvailabilityRequest),
  http.get("http://pms.test/api/v1/private/availability/matrix", handleGetAvailabilityMatrix),
  http.get("/api/v1/private/availability/matrix", handleGetAvailabilityMatrix),
  http.get("http://pms.test/api/v1/private/inventory/sell-limits", handleGetSellLimits),
  http.get("/api/v1/private/inventory/sell-limits", handleGetSellLimits),
  http.post("http://pms.test/api/v1/private/inventory/sell-limits", handleUpdateSellLimit),
  http.post("/api/v1/private/inventory/sell-limits", handleUpdateSellLimit),
  http.get("http://pms.test/api/v1/private/rates/restrictions", handleGetRateRestrictions),
  http.get("/api/v1/private/rates/restrictions", handleGetRateRestrictions),
  http.post("http://pms.test/api/v1/private/rates/restrictions", handleBatchUpdateRateRestrictions),
  http.post("/api/v1/private/rates/restrictions", handleBatchUpdateRateRestrictions),
  http.get("http://pms.test/api/v1/private/rates", handleGetRatePlans),
  http.get("/api/v1/private/rates", handleGetRatePlans),
  http.get("http://pms.test/api/v1/private/rates/:id", handleGetRatePlanById),
  http.get("/api/v1/private/rates/:id", handleGetRatePlanById),
  http.post("http://pms.test/api/v1/public/payments/guarantee", handlePaymentGuaranteeRequest),
  http.post("/api/v1/public/payments/guarantee", handlePaymentGuaranteeRequest),
  http.get("http://pms.test/api/v1/private/folios/:id", handleGetFolioById),
  http.get("/api/v1/private/folios/:id", handleGetFolioById),
  http.post("http://pms.test/api/v1/private/folios/:id/split-charge", handleSplitChargeRequest),
  http.post("/api/v1/private/folios/:id/split-charge", handleSplitChargeRequest),
  http.post("http://pms.test/api/v1/private/folios/:id/transfer-charge", handleTransferChargeRequest),
  http.post("/api/v1/private/folios/:id/transfer-charge", handleTransferChargeRequest),
  http.post("http://pms.test/api/v1/private/folios/:id/routing-rules", handleCreateRoutingRule),
  http.post("/api/v1/private/folios/:id/routing-rules", handleCreateRoutingRule),
  http.get("http://pms.test/api/v1/private/payments", handleGetPayments),
  http.get("/api/v1/private/payments", handleGetPayments),
  http.get("http://pms.test/api/v1/private/payments/:id", handleGetPaymentById),
  http.get("/api/v1/private/payments/:id", handleGetPaymentById),
  http.post("http://pms.test/api/v1/private/payments/authorize", handleAuthorizePayment),
  http.post("/api/v1/private/payments/authorize", handleAuthorizePayment),
  http.post("http://pms.test/api/v1/private/payments/:id/capture", handleCapturePayment),
  http.post("/api/v1/private/payments/:id/capture", handleCapturePayment),
  http.post("http://pms.test/api/v1/private/payments/:id/void", handleVoidPayment),
  http.post("/api/v1/private/payments/:id/void", handleVoidPayment),
  http.post("http://pms.test/api/v1/private/payments/:id/refund", handleRefundPayment),
  http.post("/api/v1/private/payments/:id/refund", handleRefundPayment),
  http.get("/api/v1/private/revenue/kpis", handleGetRevenueKpis),
  http.get("http://pms.test/api/v1/private/revenue/kpis", handleGetRevenueKpis),
];
