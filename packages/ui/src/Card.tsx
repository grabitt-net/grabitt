import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: number | string
}

export function Card({ padding = 16, style, children, ...props }: CardProps) {
  return (
    <div
      style={{
        background: 'var(--cream)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
