"use client";

import Link from "next/link";
import { useGuestSession } from "@/modules/auth";
import { useAccountSummary } from "../hooks/use-account-summary";
import type { RealAccountSummary } from "../model/account";
import styles from "./account-dashboard-page.module.css";

export function AccountDashboardPage() {
  const { account } = useGuestSession();
  const { data: summary, isPending, error, refetch } = useAccountSummary();
  if (!account) return null;
  if (isPending) return <section className={styles.feedback} role="status">Cargando tu cuenta…</section>;
  if (error || !summary) return <section className={styles.feedback}>
    <p role="alert">No se pudo cargar tu cuenta.</p>
    <button className={styles.btnPrimary} type="button" onClick={() => void refetch()}>Reintentar</button>
  </section>;
  if (summary.source === "real") return <RealAccountDashboard summary={summary} />;

  const cards = [
    { href: "/cuenta/reservas", category: "PRÓXIMAS RESERVAS", title: summary.upcomingStay ? "Próxima estancia" : "No tienes próximas estadías", description: summary.upcomingStay ? `${summary.upcomingStay.reservationCode} · ${summary.upcomingStay.roomsCount} habitaciones · ${summary.upcomingStay.datesLabel}. ${summary.upcomingStay.summaryText}` : "Cuando reserves, tus próximas estancias aparecerán aquí." },
    { href: "/cuenta/perfil", category: "PERFIL Y PREFERENCIAS", title: `${summary.profile.name} · ${summary.profile.preferredLanguage}`, description: summary.profile.description },
    { href: "/cuenta/facturas", category: "FACTURAS", title: `${summary.invoices.availableDocumentsCount} documentos disponibles`, description: summary.invoices.description },
    { href: "/cuenta/rewards", category: "REWARDS", title: `${summary.rewards.tierName} · ${summary.rewards.currentNights}/${summary.rewards.targetNights} hacia ${summary.rewards.nextTierName}`, description: `${summary.rewards.activeBenefitsCount} beneficios activos · ${summary.rewards.description}` },
    { href: "/cuenta/perfil#preferencias", category: "CONFIGURACIÓN", title: "Preferencias de estancia", description: "Configura idioma y preferencias de tu perfil." },
    { href: "/cuenta/promociones", category: "PROMOCIONES", title: summary.promotions.eligibleOffersCount ? `${summary.promotions.eligibleOffersCount} ofertas elegibles · ${summary.promotions.featuredOfferTitle}` : "Sin ofertas elegibles", description: summary.promotions.description },
  ];

  return <section className={styles.page}>
    <div className={styles.container}>
      <section className={styles.intro}>
        <div className={styles.introContent}>
          <h1>Mi cuenta</h1>
          <p>Hola, {summary.guestName}. Consulta tus reservas, facturas, rewards y promociones desde un solo lugar.</p>
          <span className={styles.statusTag}>
            {summary.isActive ? "Cuenta activa" : "Cuenta inactiva"} · Sesión de huésped · {summary.linkedReservationsCount} reservas vinculadas
          </span>
        </div>
        <div className={styles.actions}>
          <Link className={styles.btnPrimary} href="/cuenta/reservas">Historial</Link>
          <Link className={styles.btnSecondary} href="/">Buscar disponibilidad</Link>
        </div>
      </section>
      <section aria-label="Resumen de cuenta" className={styles.grid}>
        {cards.map(card => <Link className={styles.card} href={card.href} key={card.href}>
          <div><p className={styles.cardCategory}>{card.category}</p><h2 className={styles.cardTitle}>{card.title}</h2><p className={styles.cardDesc}>{card.description}</p></div>
        </Link>)}
      </section>
      <p className={styles.note}>La cuenta es opcional para reservar. La identidad de acceso y el perfil del huésped se mantienen separados.</p>
    </div>
  </section>;
}

function RealAccountDashboard({ summary }: { summary: RealAccountSummary }) {
  const next = summary.upcomingStay;
  return <section className={styles.page}>
    <div className={styles.container}>
      <section className={styles.intro}>
        <div className={styles.introContent}>
          <h1>Mi cuenta</h1>
          <span className={styles.statusTag}>{summary.isActive ? "Cuenta activa" : "Cuenta inactiva"} · {summary.linkedReservationsCount} reservas vinculadas</span>
        </div>
        <div className={styles.actions}><Link className={styles.btnSecondary} href="/">Buscar disponibilidad</Link></div>
      </section>
      <section aria-label="Resumen de cuenta" className={styles.grid}>
        <article className={`${styles.card} ${styles.featuredCard}`}><div><p className={styles.cardCategory}>PRÓXIMA ESTANCIA</p>
          <h2 className={styles.cardTitle}>{next ? "Próxima estancia confirmada" : "No tienes próximas estancias confirmadas"}</h2>
          <p className={styles.cardDesc}>{next ? `${next.confirmationCode} · ${next.arrival} → ${next.departure}` : "Solo se muestran estancias de reservas vinculadas a tu cuenta."}</p>
        </div></article>
        <article className={styles.card}><div><p className={styles.cardCategory}>PERFIL Y PREFERENCIAS</p>
          <h2 className={styles.cardTitle}>{summary.profiles.length ? "Perfiles vinculados" : "Sin perfil vinculado"}</h2>
          {summary.profiles.map(profile => <p className={styles.cardDesc} key={profile.id}>
            {profile.firstName} {profile.lastName} · {profile.preferredLanguage ?? "Idioma no indicado"} · {profile.status === "ACTIVE" ? "Perfil activo" : "Perfil inactivo"}
          </p>)}
          <p className={styles.cardDesc}>La edición del perfil aún no está disponible.</p>
        </div></article>
        <article className={styles.card}><div><p className={styles.cardCategory}>RESERVAS VINCULADAS</p>
          <h2 className={styles.cardTitle}>{summary.linkedReservationsCount ? `${summary.linkedReservationsCount} reservas vinculadas` : "No tienes reservas vinculadas"}</h2>
          <p className={styles.cardDesc}>El listado y la vinculación desde esta pantalla aún no están disponibles.</p>
        </div></article>
      </section>
      <section className={styles.moreSection} aria-labelledby="more-account-title">
        <h2 id="more-account-title" className={styles.sectionTitle}>Más de tu cuenta</h2>
        <ul className={styles.upcomingFeatures}>
          {["Facturas", "Rewards", "Promociones", "Mensajes"].map(category => <li className={styles.upcomingFeature} key={category}>
            <span>{category}</span><span className={styles.upcomingLabel}>Próximamente</span>
          </li>)}
        </ul>
      </section>
      <p className={styles.note}>La identidad de acceso y los perfiles de huésped se mantienen separados. Las reservas requieren una vinculación verificada.</p>
    </div>
  </section>;
}
