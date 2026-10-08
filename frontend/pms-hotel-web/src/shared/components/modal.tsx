"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

import styles from "./modal.module.css";

export interface ModalProps {
  /** Título visible del diálogo; se usa como nombre accesible. */
  title: string;
  /** Contenido principal del diálogo. */
  children: ReactNode;
  /** Acciones del diálogo. Sin footer el diálogo no muestra acciones. */
  footer?: ReactNode;
  /** Bloquea el cierre por ESC/backdrop y deshabilita la interacción durante el submit. */
  busy?: boolean;
  onClose: () => void;
  /** Elemento que recibe el foco al abrir; por defecto el primer elemento enfocable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Optional local layout, preserving the default appearance of other dialogs. */
  className?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Diálogo modal genérico sin reglas de dominio. Gestiona foco inicial, trampa de
 * foco, cierre por ESC y por backdrop. Los módulos lo consumen vía `@/shared/components`.
 */
export function Modal({ title, children, footer, busy = false, onClose, initialFocusRef, className = '' }: Readonly<ModalProps>) {
  const titleId = `modal-${useId()}`;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusTarget = initialFocusRef?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialog;
    focusTarget.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!busy) {
          onClose();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, initialFocusRef]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div ref={dialogRef} className={`${styles.dialog} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.header}>
          <h2 id={titleId}>{title}</h2>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.actions}>{footer}</footer> : null}
      </div>
    </div>
  );
}
