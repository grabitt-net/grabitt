'use client'
import { useState } from 'react'

const SPANISH_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Año Nuevo', '2026-01-06': 'Reyes Magos',
  '2026-03-19': 'San José', '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo', '2026-05-01': 'Día del Trabajo',
  '2026-05-30': 'Día de Canarias', '2026-08-15': 'Asunción',
  '2026-10-12': 'Día Hispanidad', '2026-11-01': 'Todos los Santos',
  '2026-12-06': 'Día Constitución', '2026-12-08': 'Inmaculada',
  '2026-12-25': 'Navidad',
}

const MOCK_TASKS: Record<string, { text: string; color: string }[]> = {
  '2026-07-03': [{ text: 'Call Dave re: storefront', color: '#3b82f6' }],
  '2026-07-07': [{ text: 'Send welcome emails batch', color: 'var(--orange)' }, { text: 'Review disputes', color: '#ef4444' }],
  '2026-07-14': [{ text: 'Monthly revenue report', color: '#8b5cf6' }],
  '2026-07-20': [{ text: 'E-shot: Summer Deals', color: 'var(--orange)' }],
  '2026-07-28': [{ text: 'Q3 planning call', color: '#16a34a' }],
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (firstDay.getDay() + 6) % 7 // 0 = Mon

  const pad = (n: number) => String(n).padStart(2, '0')
  const dateKey = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const selectedTasks = selectedDay ? (MOCK_TASKS[selectedDay] ?? []) : []
  const selectedHoliday = selectedDay ? SPANISH_HOLIDAYS_2026[selectedDay] : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700 }}>
          <span style={{ color: 'var(--orange)' }}>Calendar</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={prev} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>‹</button>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 900, color: 'var(--dark)', minWidth: 130, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
          <button onClick={next} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 800 }}>›</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 16 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, color: '#888', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1
            const key = dateKey(d)
            const isToday = key === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
            const isSelected = selectedDay === key
            const hasTasks = !!MOCK_TASKS[key]
            const isHoliday = !!SPANISH_HOLIDAYS_2026[key]
            return (
              <div key={d} onClick={() => setSelectedDay(isSelected ? null : key)} style={{ borderRadius: 8, padding: '6px 4px', cursor: 'pointer', textAlign: 'center', background: isSelected ? 'var(--orange)' : isToday ? '#FFF3EE' : 'transparent', border: isToday && !isSelected ? '1.5px solid var(--orange)' : '1.5px solid transparent', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: isToday || isSelected ? 900 : 500, color: isSelected ? '#fff' : isToday ? 'var(--orange)' : isHoliday ? '#ef4444' : 'var(--dark)' }}>{d}</div>
                {hasTasks && !isSelected && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                    {(MOCK_TASKS[key] ?? []).slice(0, 3).map((t, ti) => (
                      <div key={ti} style={{ width: 4, height: 4, borderRadius: '50%', background: t.color }} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {selectedHoliday && (
            <div style={{ background: '#fff5f5', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontFamily: 'var(--font-ui)', fontSize: 12, color: '#ef4444', fontWeight: 800 }}>🇪🇸 {selectedHoliday}</div>
          )}
          {selectedTasks.length === 0 && !selectedHoliday ? (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '20px 0' }}>No tasks for this day</div>
          ) : selectedTasks.map((task, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--dark)' }}>{task.text}</div>
            </div>
          ))}
          <button style={{ marginTop: 12, background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 50, padding: '7px 16px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>+ Add task</button>
        </div>
      )}
    </div>
  )
}
