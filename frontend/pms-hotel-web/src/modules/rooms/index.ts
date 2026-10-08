/**
 * Public API for the rooms module.
 * Export only intentionally public Domain Models, hooks and components.
 * Do not expose DTOs, mappers or service internals without an approved reason.
 */

export { RoomBoard } from "./components/room-board";
export { RoomCatalogAdmin } from "./components/room-catalog-admin";
export { useRooms } from "./hooks/use-rooms";
export type { Room, RoomStatus } from "./model/room";
export type { RoomStatusChangeResult } from "./model/room-status-change";
