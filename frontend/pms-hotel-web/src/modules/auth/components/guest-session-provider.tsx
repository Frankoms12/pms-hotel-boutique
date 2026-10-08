"use client";

import { createContext, useContext } from "react";
import { useGuestSessionController } from "../hooks/use-guest-session-controller";

const GuestSessionContext = createContext<ReturnType<typeof useGuestSessionController> | null>(null);

/** Shared Guest state: BFF session in every data mode. No fixture identity or browser credentials. */
export function GuestSessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = useGuestSessionController();
  return <GuestSessionContext.Provider value={session}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession() {
  const session = useContext(GuestSessionContext);
  if (!session) throw new Error("GUEST_SESSION_PROVIDER_REQUIRED");
  return session;
}
