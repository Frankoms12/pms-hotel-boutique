"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from 'react';
import { usePathname } from "next/navigation";
import { StaffLogout, useStaffSession } from "@/modules/auth";
import { PropertySwitcher } from "@/modules/properties";
import styles from "./private-layout.module.css";

const nav = [
  { href: "/dashboard", label: "Panel", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/reservas", label: "Reservas", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/calendario", label: "Calendario", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
  { href: "/staff/habitaciones", label: "Habitaciones", roles: ["SUPER_ADMIN", "GERENCIA", "RECEPCION"] },
] as const;

function canonicalRole(roleId: string): string {
  return roleId === "superadmin" ? "SUPER_ADMIN" : roleId.toUpperCase();
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const session = useStaffSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  const pathname = usePathname();
  const role = canonicalRole(session.roleId);
  const supportsScope = pathname === "/dashboard" || pathname === "/multi-property" || pathname.startsWith("/multi-property/disponibilidad/") || pathname === '/reservas' || pathname.startsWith('/reservas/') || pathname === '/staff/habitaciones';
  const propertyId = process.env.NEXT_PUBLIC_PROPERTY_ID;
  const mockSession = session.roleId === session.roleId.toLowerCase();
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Private shell sidebar">
      <p className={styles.brand}>PMS Staff</p>
      <button ref={menuButton} className={styles.menuToggle} aria-expanded={menuOpen} aria-controls="staff-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? 'Cerrar menú' : 'Abrir menú Staff'}</button>
      <div id="staff-navigation" className={menuOpen ? styles.navigationOpen : styles.navigation}>
      <nav aria-label="Módulos Staff"><ul className={styles.navList}>
        {nav.filter(entry => (entry.roles as readonly string[]).includes(role)).map(entry => <li key={entry.href}>
          <Link className={styles.navLink} onClick={() => setMenuOpen(false)} href={entry.href} aria-current={pathname === entry.href ? "page" : undefined}>{entry.label}</Link>
        </li>)}
      </ul></nav>
      </div>
    </aside>
    <div className={styles.mainColumn}>
      <header className={styles.header} aria-label="Private shell header">
        <div><strong>{session.userName}</strong><p>{session.roleName} · {mockSession ? "Sesión de demostración" : "Sesión Staff"}</p></div>
        {supportsScope ? <PropertySwitcher /> : <p className={styles.propertyContext}>{propertyId ? "Contexto propio del módulo: " + propertyId : "Este módulo conserva su contexto de propiedad."}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StaffLogout />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}
