// Grabitt wordmark (transparent PNG in /public). Sized by height; width auto.
export default function Logo({ height = 28, style }: { height?: number; style?: React.CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/grabitt-logo.png" alt="Grabitt" style={{ height, width: 'auto', display: 'block', ...style }} />
  )
}
