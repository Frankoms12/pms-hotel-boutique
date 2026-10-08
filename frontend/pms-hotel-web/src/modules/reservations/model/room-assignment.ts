export interface RoomAssignmentScope {
  propertyId: string;
  reservationId: string;
  stayId: string;
}
export interface AssignmentRoom {
  id: string;
  number: string;
  floor: string | null;
  status: 'ACTIVE' | 'OOO' | 'OOS';
  selectable: boolean;
  reason: string | null;
}
export interface RoomAssignmentPreview extends RoomAssignmentScope {
  arrival: string;
  departure: string;
  roomTypeId: string | null;
  roomType: string;
  canAssign: boolean;
  reason: string | null;
  rooms: AssignmentRoom[];
}
export interface RoomAssignmentResult extends RoomAssignmentScope {
  roomId: string;
  roomNumber: string;
}
