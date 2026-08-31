'use client'
import { useRef, useEffect } from 'react'

// Lightweight rich-text editor for the CMS (guides / news / events bodies).
// Stores HTML. Toolbar: bold, italic, underline, bullet & numbered lists, link.
// Uses execCommand — deprecated but still supported everywhere and perfect for
// a small admin editor. Content is sanitised on render; authors are exec-only.
export default function RichTextEditor({ value, onChange, placeholder }: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Sync incoming value into the editable div when it differs and the field
  // isn't focused (so the caret never jumps while typing). Runs on open/edit.
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    // Emit real tags (<b>, <i>…) rather than inline style attributes.
    try { document.execCommand('styleWithCSS', false, 'false') } catch { /* not supported everywhere */ }
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML || '')
  }
  // formatBlock needs the tag wrapped in <…> on some engines; toggling a heading
  // that's already applied drops back to a normal paragraph.
  const block = (tag: string) => {
    ref.current?.focus()
    document.execCommand('formatBlock', false, `<${tag}>`)
    onChange(ref.current?.innerHTML || '')
  }
  const addLink = () => {
    const url = window.prompt('Link URL (https://…)')?.trim()
    if (!url) return
    exec('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`)
  }

  const Btn = ({ cmd, arg, onClick, title, children }: { cmd?: string; arg?: string; onClick?: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault() }}   // keep the selection when clicking the toolbar
      onClick={() => (onClick ? onClick() : exec(cmd!, arg))}
      className="rte__btn">{children}</button>
  )

  return (
    <div className="rte">
      <div className="rte__bar">
        <Btn onClick={() => block('h2')} title="Big heading">H1</Btn>
        <Btn onClick={() => block('h3')} title="Small heading">H2</Btn>
        <Btn onClick={() => block('p')} title="Normal text">¶</Btn>
        <span className="rte__sep" />
        <Btn cmd="bold" title="Bold"><b>B</b></Btn>
        <Btn cmd="italic" title="Italic"><i>I</i></Btn>
        <Btn cmd="underline" title="Underline"><u>U</u></Btn>
        <span className="rte__sep" />
        <Btn cmd="insertUnorderedList" title="Bulleted list">List item</Btn>
        <Btn cmd="insertOrderedList" title="Numbered list">Numbered list</Btn>
        <span className="rte__sep" />
        <Btn onClick={addLink} title="Insert link">🔗 Link</Btn>
        <Btn cmd="removeFormat" title="Clear formatting">Clear</Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Write the article…'}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        className="rte__area"
      />
    </div>
  )
}
