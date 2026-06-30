import React from 'react'

type GradeColor = { [key: string]: string }

const gradeColors: GradeColor = {
  grabber: 'var(--stage-lead)',
  dealer: 'var(--stage-qual)',
  trader: 'var(--stage-pitch)',
  pro: 'var(--stage-won)',
}

interface BadgeProps {
  grade?: 'grabber' | 'dealer' | 'trader' | 'pro'
  label: string
  color?: string
}

export function Badge({ grade, label, color }: BadgeProps) {
  const bg = color ?? (grade ? gradeColors[grade] : 'var(--sand)')
  return (
    <span style={{
      fontFamily: 'var(--font-ui)',
      fontSize: 10,
      fontWeight: 800,
      padding: '2px 8px',
      borderRadius: 6,
      background: bg,
      color: 'var(--dark)',
    }}>
      {label}
    </span>
  )
}
