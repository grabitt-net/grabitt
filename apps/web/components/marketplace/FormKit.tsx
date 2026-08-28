import React from 'react'

// Shared, token-based building blocks for the public create/list forms so they
// all read as one professional system (matching the dashboard). Styling lives
// in globals.css under ".gform*". Prefer these over ad-hoc inline inputs.

export function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="gform-section">
      <div className="gform-section__head">
        <h3 className="gform-section__title">{title}</h3>
        {sub && <div className="gform-section__sub">{sub}</div>}
      </div>
      <div className="gform-section__body">{children}</div>
    </div>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="gform-row">{children}</div>
}

export function Field({ label, required, help, children }: { label?: string; required?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div className="gform-field">
      {label && <label className="gform-label">{label}{required && <span className="gform-label__req"> *</span>}</label>}
      {children}
      {help && <div className="gform-help">{help}</div>}
    </div>
  )
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) { return <input ref={ref} {...props} className={`gform-control ${props.className ?? ''}`} /> }
)

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea(props, ref) { return <textarea ref={ref} {...props} className={`gform-control ${props.className ?? ''}`} /> }
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select(props, ref) { return <select ref={ref} {...props} className={`gform-control ${props.className ?? ''}`} /> }
)

export function Pill({ on, children, ...rest }: { on?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...rest} className={`gform-pill ${on ? 'gform-pill--on' : ''}`}>{children}</button>
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="gform-check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return children ? <div className="gform-error">{children}</div> : null
}

export function SubmitButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`gform-submit ${rest.className ?? ''}`}>{children}</button>
}

// Tabbed section navigation — click any tab to jump to that part of the form.
export function StepTabs({ steps, current, onSelect }: { steps: string[]; current: number; onSelect: (i: number) => void }) {
  return (
    <div className="gform-tabs" role="tablist">
      {steps.map((s, i) => (
        <button key={s} type="button" role="tab" aria-selected={i === current} onClick={() => onSelect(i)}
          className={`gform-tab ${i === current ? 'gform-tab--on' : ''}`}>
          <span className="gform-tab__n">{i + 1}</span>{s}
        </button>
      ))}
    </div>
  )
}

// Stepped-wizard progress bar. `current` is the 1-based active step.
export function StepBar({ current, total, title }: { current: number; total: number; title?: string }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="gform-stepbar">
      <div className="gform-stepbar__meta">
        <span>Step <b>{current}</b> of {total}{title ? <> · {title}</> : null}</span>
        <span>{pct}%</span>
      </div>
      <div className="gform-stepbar__track"><div className="gform-stepbar__fill" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

// Back / Continue (or final submit) row. The whole form is one <form> whose
// submit both advances a step and, on the last step, does the real submit — so
// Enter works too. Pass isLast + submitLabel for the final action.
export function StepNav({ isFirst, isLast, onBack, submitting, submitLabel = 'Submit', nextLabel = 'Continue' }: {
  isFirst: boolean; isLast: boolean; onBack: () => void; submitting?: boolean; submitLabel?: string; nextLabel?: string
}) {
  return (
    <div className="gform-stepnav">
      {!isFirst && <button type="button" className="gform-back" onClick={onBack}>← Back</button>}
      <button type="submit" className="gform-submit gform-next" disabled={submitting}>
        {isLast ? (submitting ? '…' : submitLabel) : `${nextLabel} →`}
      </button>
    </div>
  )
}
