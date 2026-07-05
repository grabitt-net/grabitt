'use client'
import { useEffect, useRef, useState } from 'react'
import { useChat, type ChatMessage } from '@/hooks/useChat'

interface Props {
  threadId: string
  userId: string
  initialMessages: ChatMessage[]
}

export default function ChatWindow({ threadId, userId, initialMessages }: Props) {
  // useChat owns loading/sending via the protected tRPC router (enforces §10.2).
  const { messages: live, sendMessage } = useChat(threadId, userId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Show server-rendered messages until the first live fetch returns.
  const messages = live.length > 0 ? live : initialMessages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    setInput('')
    setSending(true)
    try { await sendMessage(body) } finally { setSending(false) }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Contact-info guard (server also enforces §10.2) */}
      <div style={{ background: '#FFF3EE', padding: '6px 14px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-nunito)', fontSize: 10, color: '#a8460f' }}>
          🔒 Keep conversations on Grabitt — sharing phone/email is not allowed.
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bbb', marginTop: 40, fontFamily: 'var(--font-nunito)', fontSize: 13 }}>
            Send a message to start the conversation
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === userId
          const prevMsg = messages[i - 1]
          const showTime = !prevMsg || timeDiff(prevMsg.createdAt, msg.createdAt) > 10

          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: 'center', fontSize: 10, color: '#bbb', fontFamily: 'var(--font-nunito)', margin: '4px 0 8px' }}>
                  {formatTime(msg.createdAt)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                {msg.blocked ? (
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', borderRadius: 14,
                    background: '#fff4f4', border: '1px solid #ffd5d5',
                    color: '#c0392b', fontFamily: 'var(--font-nunito)', fontSize: 12, lineHeight: 1.4,
                  }}>
                    ⚠️ This message was hidden because it looked like it contained contact details. Keep deals on Grabitt.
                  </div>
                ) : (
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? 'var(--orange)' : '#fff',
                    color: isMe ? '#fff' : 'var(--dark)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    fontFamily: 'var(--font-nunito)', fontSize: 14, lineHeight: 1.4,
                  }}>
                    {msg.body}
                    <div style={{ fontSize: 9, marginTop: 4, textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.7)' : '#bbb' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <span style={{ marginLeft: 4 }}>{msg.readAt ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        flexShrink: 0, background: '#fff', borderTop: '1px solid #eee',
        padding: '10px 12px max(10px, env(safe-area-inset-bottom))',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex: 1, border: '1.5px solid #eee', borderRadius: 20,
            padding: '10px 14px', fontFamily: 'var(--font-nunito)',
            fontSize: 14, outline: 'none', resize: 'none',
            lineHeight: 1.4, maxHeight: 120, overflowY: 'auto', background: '#fafafa',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: '50%',
            background: input.trim() ? 'var(--orange)' : '#eee',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          ➤
        </button>
      </div>
    </>
  )
}

function timeDiff(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000
}
function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })
}
