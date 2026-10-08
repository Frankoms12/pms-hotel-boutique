import Link from 'next/link';
import styles from './dashboard.module.css';

export default function PrivateDashboardPage() {
  return <section className={styles.page}>
    <header><p className={styles.overline}>HOTEL BOUTIQUE · STAFF</p><h1>Panel de recepción</h1><p>Consulta las reservas y organiza las habitaciones de tu hotel.</p></header>
    <div className={styles.cards}>
      <Link className={styles.card} href="/reservas"><span className={styles.icon} aria-hidden="true">01</span><h2>Reservas</h2><p>Busca por código o huésped y revisa los detalles de cada estadía.</p><span className={styles.action}>Ver reservas →</span></Link>
      <Link className={styles.card} href="/calendario"><span className={styles.icon} aria-hidden="true">02</span><h2>Calendario</h2><p>Consulta las fechas de llegada y salida para organizar la recepción.</p><span className={styles.action}>Abrir calendario →</span></Link>
      <Link className={styles.card} href="/staff/habitaciones"><span className={styles.icon} aria-hidden="true">03</span><h2>Habitaciones</h2><p>Revisa el estado operativo y administra tipos y habitaciones físicas.</p><span className={styles.action}>Ver habitaciones →</span></Link>
    </div>
  </section>;
}
