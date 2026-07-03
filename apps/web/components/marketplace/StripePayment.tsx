'use client'
import { useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe } from '@/lib/stripe'

// Real card entry via Stripe Elements. Given a PaymentIntent client secret, it
// renders the Stripe PaymentElement and confirms the intent on submit. For our
// escrow PaymentIntents (capture_method: 'manual') a successful confirm AUTHORISES
// the card and moves the intent to `requires_capture` — funds are held, not yet
// taken. Capture happens later at handover/tracking release.

function InnerForm({ label, onSuccess }: { label: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const pay = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    const { error: err } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // stay in-app for card payments
    })
    if (err) {
      setError(err.message || 'Payment failed')
      setSubmitting(false)
      return
    }
    // Authorised (manual capture) or paid (auto capture). The webhook flips the
    // transaction to held/paid; the UI advances optimistically.
    onSuccess()
  }

  return (
    <>
      <PaymentElement options={{ layout: 'tabs' }} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '14px 0' }}>
        {['🔒 256-bit SSL', '🏦 Stripe Secured', '🛡️ Escrow Protected'].map(b => (
          <span key={b} style={{ background: '#f0fdf4', color: '#555', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 50 }}>{b}</span>
        ))}
      </div>
      {error && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'red', marginBottom: 10 }}>{error}</div>}
      <button onClick={pay} disabled={!stripe || submitting} style={{ width: '100%', background: (!stripe || submitting) ? '#ccc' : 'linear-gradient(135deg,var(--orange),var(--orange2))', color: '#fff', border: 'none', borderRadius: 14, padding: 15, fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
        {submitting ? '⏳ Processing…' : label}
      </button>
    </>
  )
}

export default function StripePayment({ clientSecret, label, onSuccess }: { clientSecret: string; label: string; onSuccess: () => void }) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#b91c1c', background: '#fef2f2', borderRadius: 10, padding: 12 }}>Payments are not configured (missing Stripe key).</div>
  }
  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#FF4500' } } }}>
      <InnerForm label={label} onSuccess={onSuccess} />
    </Elements>
  )
}
