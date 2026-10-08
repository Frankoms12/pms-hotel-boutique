"use client";

import { useGuestSession } from "./guest-session-provider";
import {Button} from "@/shared/components";
import styles from "./guest-access-page.module.css";

export function GuestSessionCheck() {
  const { status, retrySession } = useGuestSession();
  return <section className={styles.page} aria-busy={status === "checking"}>
    <div className={styles.content}>
      {status === "checking" ? <p role="status">Comprobando tu sesión…</p> : <>
        <p role="alert">No pudimos comprobar tu sesión. Comprueba tu conexión y vuelve a intentarlo.</p>
        <Button className={styles.action} type="button" onClick={retrySession}>Reintentar sesión</Button>
      </>}
    </div>
  </section>;
}
