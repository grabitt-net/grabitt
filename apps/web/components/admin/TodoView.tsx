'use client'
import { useState } from 'react'

type Tier = 'urgent' | 'soon' | 'someday'
interface Task { id: string; text: string; tier: Tier; done: boolean; nudge?: string }

const INITIAL_TASKS: Task[] = [
  { id: '1', text: 'Call Dave re: storefront renewal', tier: 'urgent', done: false, nudge: '2nd nudge' },
  { id: '2', text: 'Send June invoice to García & Co.', tier: 'urgent', done: false },
  { id: '3', text: 'Review open disputes (×3)', tier: 'urgent', done: true },
  { id: '4', text: 'Draft July e-shot copy', tier: 'soon', done: false },
  { id: '5', text: 'Update featured banner — summer theme', tier: 'soon', done: false },
  { id: '6', text: 'Follow up with 5 at-risk members', tier: 'soon', done: false, nudge: '1st nudge' },
  { id: '7', text: 'Research competitor pricing', tier: 'someday', done: false },
  { id: '8', text: 'Plan Q3 partner webinar', tier: 'someday', done: false },
]

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string }> = {
  urgent: { label: '🔴 Urgent', color: '#ef4444', bg: '#fff5f5' },
  soon: { label: '🟡 Soon', color: '#f59e0b', bg: '#fffbeb' },
  someday: { label: '🟢 Someday', color: '#16a34a', bg: '#f0fdf4' },
}

const WEEKLY_PLAN = [
  { day: 'Mon', tasks: ['Review pipeline', 'Check disputes', 'Answer queries'] },
  { day: 'Tue', tasks: ['Follow-up calls', 'E-shot planning'] },
  { day: 'Wed', tasks: ['Onboarding calls', 'Content creation'] },
  { day: 'Thu', tasks: ['Report review', 'Team sync'] },
  { day: 'Fri', tasks: ['Weekly wrap-up', 'Schedule next week'] },
]

export default function TodoView() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [newTask, setNewTask] = useState('')
  const [newTier, setNewTier] = useState<Tier>('soon')

  const toggle = (id: string) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const add = () => {
    if (!newTask.trim()) return
    setTasks(ts => [...ts, { id: Date.now().toString(), text: newTask.trim(), tier: newTier, done: false }])
    setNewTask('')
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
        <button onClick={add} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontFamily: 'var(--font-ui)', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>+</button>
      </div>

      {/* Tasks by tier */}
      {(['urgent', 'soon', 'someday'] as Tier[]).map(tier => {
        const tierTasks = tasks.filter(t => t.tier === tier)
        const cfg = TIER_CONFIG[tier]
        return (
          <div key={tier} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#888' }}>{tierTasks.filter(t => !t.done).length} remaining</div>
            </div>
            {tierTasks.length === 0 && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>All done! 🎉</div>}
            {tierTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
                <div onClick={() => toggle(task.id)} style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.done ? cfg.color : '#e0d8d0'}`, background: task.done ? cfg.color : '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {task.done && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: task.done ? '#bbb' : 'var(--dark)', textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
                  {task.nudge && !task.done && (
                    <span style={{ background: `${cfg.bg}`, color: cfg.color, fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 900, padding: '1px 7px', borderRadius: 50, marginLeft: 8 }}>{task.nudge}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* Weekly plan */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', padding: 16 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 900, color: '#555', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Marketing weekly plan</div>
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
