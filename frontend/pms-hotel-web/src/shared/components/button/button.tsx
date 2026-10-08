import React, { forwardRef } from 'react';
import styles from './button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

/** Reuse the same visual primitive for navigation links without nested controls. */
export function buttonClassName({variant='primary',size='md',disabled=false,className=''}: Pick<ButtonProps,'variant'|'size'|'disabled'|'className'> = {}) {
  const variants={primary:styles.variantPrimary,secondary:styles.variantSecondary,outline:styles.variantOutline,ghost:styles.variantGhost};
  const sizes={sm:styles.sizeSm,md:styles.sizeMd,lg:styles.sizeLg};
  return [styles.button,variants[variant],sizes[size],disabled?styles.buttonDisabled:'',className].filter(Boolean).join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const combinedClasses=buttonClassName({variant,size,disabled:disabled || isLoading,className});

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={combinedClasses}
        {...props}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
