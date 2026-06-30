import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--orange)', color: '#fff', border: 'none' },
  secondary: { background: 'transparent', color: 'var(--orange)', border: '2px solid var(--orange)' },
  ghost: { background: 'transparent', color: 'var(--dark)', border: 'none' },
  danger: { background: 'var(--terra)', color: '#fff', border: 'none' },
}

const sizes: Record<string, React.CSSProperties> = {
  sm: { fontSize: 12, padding: '6px 12px', borderRadius: 8 },
  md: { fontSize: 14, padding: '10px 20px', borderRadius: 12 },
  lg: { fontSize: 16, padding: '14px 28px', borderRadius: 14 },
}

export function Button({ variant = 'primary', size = 'md', style, children, ...props }: ButtonProps) {
  return (
    <button
      style={{
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'opacity 0.15s',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
