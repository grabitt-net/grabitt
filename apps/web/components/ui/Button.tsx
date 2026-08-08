'use client'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon, { type IconName } from '../marketplace/Icon'

// Token-driven button primitive with real hover + keyboard-focus states.
// Prefer this over hand-rolled inline-styled buttons so the CTA look stays
// consistent everywhere. Styles live in globals.css (.btn / .btn--*).
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export default function Button({
  variant = 'primary', size = 'md', block, icon, iconRight, children, className = '', ...rest
}: {
  variant?: Variant; size?: Size; block?: boolean; icon?: IconName; iconRight?: IconName; children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn btn--${variant} btn--${size}${block ? ' btn--block' : ''}${className ? ' ' + className : ''}`
  const iconSize = size === 'lg' ? 18 : size === 'sm' ? 14 : 16
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={iconSize} strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} strokeWidth={2} />}
    </button>
  )
}
