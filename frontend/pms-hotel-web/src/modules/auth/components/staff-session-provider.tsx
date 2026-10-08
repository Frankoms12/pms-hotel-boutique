"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { logoutStaffSession } from "../service/staff-session.service";
import { staffSessionKey, staffSessionQuery } from "../hooks/staff-session-query";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { StaffSession } from "../model/staff-session";
import { staffPreviewEnabled } from '@/lib/staff-preview';
import { staffPreviewKey, staffPreviewQuery } from '../hooks/staff-preview-query';
import { closeStaffPreview, openStaffPreview } from '../service/staff-preview.service';
import styles from './staff-preview.module.css';

const StaffContext = createContext<StaffSession | null>(null);
const StaffActions = createContext<{ logout: () => void; busy: boolean; error: boolean } | null>(null);

export function useStaffSession() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("STAFF_SESSION_REQUIRED");
  return value;
}

export function StaffLogout() {
  const actions = useContext(StaffActions);
  if (!actions) return null;
  return <div>
    <button type="button" onClick={actions.logout} disabled={actions.busy}>
      {actions.busy ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
    {actions.error && <p role="alert">No se pudo cerrar la sesión. Inténtalo nuevamente.</p>}
  </div>;
}

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  return <StaffBffSession preview={staffPreviewEnabled()}>{children}</StaffBffSession>;
}

async function clearStaffCaches(client: QueryClient, sessionKey: typeof staffSessionKey | typeof staffPreviewKey) {
  await client.cancelQueries({ queryKey: sessionKey });
  client.setQueryData(sessionKey, null);
  // Dashboard/calendar caches are Staff-owned; Guest/public queries stay intact.
  for (const key of ["private-09", "reservations", "rooms", "staff-room-catalog", "staff-reservation-quotes", "staff-room-assignment", "staff-room-occupancy"]) {
    await client.cancelQueries({ queryKey: [key] });
    client.removeQueries({ queryKey: [key] });
  }
}

function StaffBffSession({ children, preview }: { children: ReactNode; preview: boolean }) {
  const client = useQueryClient();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const sessionKey = preview ? staffPreviewKey : staffSessionKey;
  const session = useQuery({ queryKey: sessionKey,
    queryFn: preview ? staffPreviewQuery.queryFn : staffSessionQuery.queryFn, retry: false });
  const reopen = useMutation({ mutationFn: openStaffPreview, onSuccess: () => client.invalidateQueries({ queryKey: staffPreviewKey }) });
  const redirectStarted = useRef(false);
  const signedOut = session.isSuccess && session.data === null && session.fetchStatus === "idle";
  useEffect(() => {
    if (preview) return;
    // Windows share cookies. Revalidate through the BFF when returning to one;
    // cancelRefetch:false coalesces focus with visibility/reconnect revalidation.
    const revalidate = () => { void client.refetchQueries({ queryKey: staffSessionKey, type: "active" }, { cancelRefetch: false }); };
    window.addEventListener("focus", revalidate);
    return () => window.removeEventListener("focus", revalidate);
  }, [client, preview]);
  useEffect(() => {
    if (preview || !signedOut || redirectStarted.current) return;
    redirectStarted.current = true;
    void clearStaffCaches(client, sessionKey).then(() => router.replace("/"));
  }, [signedOut, client, router, preview, sessionKey]);
  const logout = useMutation({
    mutationFn: preview ? closeStaffPreview : logoutStaffSession,
    onSuccess: async () => {
      redirectStarted.current = true;
      setLeaving(true);
      await clearStaffCaches(client, sessionKey);
      router.replace("/");
    },
  });
  if (leaving) return <p role="status">Sesión cerrada. Volviendo al inicio…</p>;
  if (!session.data && session.fetchStatus === "paused") return <p role="status">Sin conexión. Esperando para cargar la sesión Staff.</p>;
  if (session.isPending || (session.data === null && session.isFetching)) return <p role="status">Cargando sesión Staff…</p>;
  // Retain the last valid identity during background/network revalidation.
  // Invalid authorization DTOs fail closed, with a load error rather than a false 401.
  if (session.isError && (!session.data || session.error instanceof DomainMappingError)) return <section>
    <p role="alert">No se pudo cargar la sesión Staff.</p>
    <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
  </section>;
  if (!session.data) {
    if (!preview) return <p role="status">Volviendo al inicio…</p>;
    return <section>
      <h1>Vista previa Staff cerrada</h1>
      <p>Este entorno local permite revisar el frontend sin iniciar sesión en Backend.</p>
      <button type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()}>Abrir vista previa Staff</button>
      {reopen.isError && <p role="alert">No se pudo abrir la vista previa. Inténtalo nuevamente.</p>}
      <button type="button" onClick={() => void session.refetch()}>Reintentar sesión</button>
    </section>;
  }
  return <StaffContext.Provider value={session.data}>
    <StaffActions.Provider value={{
      logout: () => logout.mutate(), busy: logout.isPending, error: logout.isError,
    }}>{preview && <div className={styles.notice} role="status"><strong>Vista previa Staff</strong>
      Datos ficticios del frontend · Sin Backend, cuentas ni pagos reales.</div>}{children}</StaffActions.Provider>
  </StaffContext.Provider>;
}
