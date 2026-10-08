/**
 * Public API for the auth module.
 * Export only intentionally public Domain Models, hooks and components.
 */
export type { ExternalIdentity, ExternalIdentityProvider, GuestAccount } from "./model/guest-account";
export { GuestAccessPage } from "./components/guest-access-page";
export { GuestLinkedAccount, type LinkedAccountDetails } from "./components/guest-linked-account";
export { GuestSessionProvider, useGuestSession } from "./components/guest-session-provider";
export { GuestAccountGate } from "./components/guest-account-gate";
export { StaffSessionProvider, StaffLogout, useStaffSession } from "./components/staff-session-provider";
export type { StaffIdentity, StaffSession, StaffMembership } from "./model/staff-session";
