'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken, refreshAuthToken, trpcAuthed } from '@/lib/authToken'
import { t } from '@/lib/i18n'

// The compose sheet for the first message to a seller or employer. Opening a
// listing conversation should never drop someone into a full-screen thread —
// they send one message and stay where they were. The thread is created and the
// message sent only on submit; every reply after that lives in the Messages
// centre.
export default function MessageComposer({
  listingId, sellerId, title, onClose,
}: {
  listingId: string
  sellerId: string
  title?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!body.trim()) return
    setError('')
    setSending(true)
    try {
      let token = getAuthToken()
      if (!token) token = await refreshAuthToken()
      if (!token) { onClose(); router.push(`/auth?next=/listings/${listingId}`); return }
      const c = trpcAuthed()
      const thread = await c.messages.thread.mutate({ listingId, sellerId })
      if (!thread?.id) throw new Error('Could not open the conversation')
      await c.messages.send.mutate({ threadId: thread.id, body: body.trim() })
      setSent(true)
      setTimeout(onClose, 1500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (/UNAUTHORIZED|FORBIDDEN|jwt|token/i.test(msg)) { onClose(); router.push(`/auth?next=/listings/${listingId}`) }
      else if (/yourself/i.test(msg)) setError("This is your own listing — you can't message yourself.")
      else setError('Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div onClick={() => { if (!sending) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: '20px 20px 0 0', padding: 20 }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)' }}>{t('Message sent')}</div>
            <div style={{ fontFamily: 'var(--font-comfortaa)', fontSize: 12, color: '#777', marginTop: 4 }}>{t('Replies appear in your Messages centre.')}</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-nunito)', fontSize: 16, fontWeight: 900, color: 'var(--dark)', marginBottom: 4 }}>{title ?? t('💬 Message')}</div>
            <div style={{ fontSize: 12, color: '#777', fontFamily: 'var(--font-comfortaa)', marginBottom: 12 }}>{t("Send a message — you'll manage replies in your Messages centre.")}</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t('Type your message…')} autoFocus style={{ width: '100%', boxSizing: 'border-box', minHeight: 96, border: '1.5px solid #e5dccd', borderRadius: 12, padding: 12, fontFamily: 'var(--font-comfortaa)', fontSize: 13, outline: 'none', resize: 'vertical' }} />
            {error && <div style={{ color: '#c0392b', fontSize: 11, fontFamily: 'var(--font-nunito)', marginTop: 6 }}>{error}</div>}
            <button onClick={send} disabled={sending || !body.trim()} style={{ width: '100%', marginTop: 12, background: !body.trim() ? '#ccc' : 'linear-gradient(135deg,#FF4500,#FF8C00)', color: '#fff', border: 'none', borderRadius: 14, padding: 14, fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 900, cursor: sending ? 'wait' : 'pointer' }}>{sending ? t('Sending…') : `${t('Send message')} →`}</button>
            <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'none', color: '#888', border: 'none', padding: 8, fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{t('Cancel')}</button>
          </>
        )}
      </div>
    </div>
  )
}
