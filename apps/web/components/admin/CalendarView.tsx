'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCrmApi } from './AdminApp'

const SPANISH_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Año Nuevo', '2026-01-06': 'Reyes Magos',
  '2026-03-19': 'San José', '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo', '2026-05-01': 'Día del Trabajo',
  '2026-05-30': 'Día de Canarias', '2026-08-15': 'Asunción',
  '2026-10-12': 'Día Hispanidad', '2026-11-01': 'Todos los Santos',
  '2026-12-06': 'Día Constitución', '2026-12-08': 'Inmaculada',
  '2026-12-25': 'Navidad',
}

interface CalTask { id: string; text: string; dueDate: string | null; color: string | null; done: boolean }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function CalendarView() {
  const api = useCrmApi()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [tasks, setTasks] = useState<CalTask[]>([])
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    api.execTasks()
      // Only dated items belong on the calendar; tier-only items live in To-Do.
      .then(rows => setTasks((rows ?? []).filter(r => r.dueDate)))
      .catch(() => setTasks([]))
  }, [api])
  useEffect(() => { load() }, [load])

  // Group tasks by their date for quick lookup while rendering the grid.
  const byDate: Record<string, CalTask[]> = {}
  tasks.forEach(t => { if (t.dueDate) (byDate[t.dueDate] ??= []).push(t) })

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDow = (firstDay.getDay() + 6) % 7 // 0 = Mon

  const pad = (n: number) => String(n).padStart(2, '0')
  const dateKey = (d: number) => `${year}-${pad(month + 1)}-${pad(d)}`

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const selectedTasks = selectedDay ? (byDate[selectedDay] ?? []) : []
  const selectedHoliday = selectedDay ? SPANISH_HOLIDAYS_2026[selectedDay] : null

  const addTask = async () => {
    if (!newText.trim() || !selectedDay || adding) return
    setAdding(true)
    try {
      const created = await api.createExecTask({ text: newText.trim(), dueDate: selectedDay, color: 'var(--orange)' })
      setTasks(ts => [...ts, created])
      setNewText('')
    } catch { /* keep input for retry */ }
    finally { setAdding(false) }
  }

  const removeTask = async (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    try { await api.removeExecTask(id) } catch { load() }
  }

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
            const dayTasks = byDate[key] ?? []
            const hasTasks = dayTasks.length > 0
            const isHoliday = !!SPANISH_HOLIDAYS_2026[key]
            return (
              <div key={d} onClick={() => setSelectedDay(isSelected ? null : key)} style={{ borderRadius: 8, padding: '6px 4px', cursor: 'pointer', textAlign: 'center', background: isSelected ? 'var(--orange)' : isToday ? '#FFF3EE' : 'transparent', border: isToday && !isSelected ? '1.5px solid var(--orange)' : '1.5px solid transparent', position: 'relative' }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: isToday || isSelected ? 900 : 500, color: isSelected ? '#fff' : isToday ? 'var(--orange)' : isHoliday ? '#ef4444' : 'var(--dark)' }}>{d}</div>
                {hasTasks && !isSelected && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                    {dayTasks.slice(0, 3).map((t, ti) => (
                      <div key={ti} style={{ width: 4, height: 4, borderRadius: '50%', background: t.color ?? 'var(--orange)' }} />
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
          {selectedTasks.length === 0 && !selectedHoliday && (
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '16px 0' }}>No tasks for this day</div>
          )}
          {selectedTasks.map(task => (
            <div key={task.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: task.color ?? 'var(--orange)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--dark)' }}>{task.text}</div>
              <button onClick={() => removeTask(task.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14 }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a task for this day…"
              style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none' }}
            />
            <button onClick={addTask} disabled={adding || !newText.trim()} style={{ background: adding || !newText.trim() ? '#ccc' : 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>+ Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
