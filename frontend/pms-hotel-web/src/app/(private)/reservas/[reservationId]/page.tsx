import { StaffReservationsWorkspace } from '../../staff-property-workspace';

/** List and detail share the same authorized property selection. */
export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  return <StaffReservationsWorkspace reservationId={reservationId} />;
}
