'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCrmApi } from './AdminApp'

type Tier = 'urgent' | 'soon' | 'someday'
interface Task { id: string; text: string; tier: string | null; done: boolean }

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  urgent: { label: '🔴 Urgent', color: '#ef4444', bg: '#fff5f5' },
  soon: { label: '🟡 Soon', color: '#f59e0b', bg: '#fffbeb' },
  someday: { label: '🟢 Someday', color: '#16a34a', bg: '#f0fdf4' },
}

// Static reference — a suggested weekly rhythm, not user data.
const WEEKLY_PLAN = [
  { day: 'Mon', tasks: ['Review pipeline', 'Check disputes', 'Answer queries'] },
  { day: 'Tue', tasks: ['Follow-up calls', 'E-shot planning'] },
  { day: 'Wed', tasks: ['Onboarding calls', 'Content creation'] },
  { day: 'Thu', tasks: ['Report review', 'Team sync'] },
  { day: 'Fri', tasks: ['Weekly wrap-up', 'Schedule next week'] },
]

export default function TodoView() {
  const api = useCrmApi()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newTier, setNewTier] = useState<Tier>('soon')
  const [adding, setAdding] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.execTasks()
      // Only tier-based (To-Do) items belong here; dated items live on the Calendar.
      .then(rows => setTasks((rows ?? []).filter(r => r.tier)))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [api])

  useEffect(() => { load() }, [load])

  const toggle = async (t: Task) => {
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !x.done } : x))
    try { await api.toggleExecTask(t.id, !t.done) } catch { load() }
  }

  const add = async () => {
    if (!newTask.trim() || adding) return
    setAdding(true)
    try {
      const created = await api.createExecTask({ text: newTask.trim(), tier: newTier })
      setTasks(ts => [created, ...ts])
      setNewTask('')
    } catch { /* leave input so the user can retry */ }
    finally { setAdding(false) }
  }

  const remove = async (id: string) => {
    setTasks(ts => ts.filter(x => x.id !== id))
    try { await api.removeExecTask(id) } catch { load() }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-body)', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        <span style={{ color: 'var(--orange)' }}>To Do</span>
      </h2>

      {/* Add task */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 20, display: 'flex', gap: 8 }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add a task…"
          style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none' }}
        />
        <select value={newTier} onChange={e => setNewTier(e.target.value as Tier)} style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '9px 10px', fontFamily: 'var(--font-ui)', fontSize: 12, outline: 'none' }}>
          <option value="urgent">Urgent</option>
          <option value="soon">Soon</option>
          <option value="someday">Someday</option>
        </select>
        <button onClick={add} disabled={adding} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>+</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading tasks…</div>
      ) : (['urgent', 'soon', 'someday'] as Tier[]).map(tier => {
        const tierTasks = tasks.filter(t => t.tier === tier)
        const cfg = TIER_CONFIG[tier]
        return (
          <div key={tier} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>{tierTasks.filter(t => !t.done).length} remaining</div>
            </div>
            {tierTasks.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>Nothing here yet</div>}
            {tierTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                <div onClick={() => toggle(task)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.done ? cfg.color : '#e0d8d0'}`, background: task.done ? cfg.color : '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {task.done && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: task.done ? '#bbb' : 'var(--dark)', textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
                </div>
                <button onClick={() => remove(task.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 14, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        )
      })}

      {/* Weekly plan (static reference) */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested weekly rhythm</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {WEEKLY_PLAN.map(day => (
            <div key={day.day} style={{ background: '#f9f6f2', borderRadius: 10, padding: '10px 8px' }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 900, color: 'var(--orange)', marginBottom: 6, textAlign: 'center' }}>{day.day}</div>
              {day.tasks.map((task, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: '#555', padding: '3px 0', borderBottom: i < day.tasks.length - 1 ? '1px solid #f0ebe4' : 'none' }}>• {task}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
