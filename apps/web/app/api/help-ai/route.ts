import { helpDigest, helpCategory } from '@/lib/helpContent'
import { createLooseTrpcClient } from '@/lib/trpc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// AI help assistant. Answers a visitor's question grounded in the Grabitt help
// content, so replies stay accurate to how the platform actually works.
//
// Calls the Anthropic Messages API over raw HTTP (rather than the SDK) so this
// route has no extra dependency to install/lock. Requires ANTHROPIC_API_KEY in
// the environment; without it the endpoint returns a graceful fallback.

type Turn = { role: 'user' | 'assistant'; content: string }

// Grounding digest — prefer the live, admin-managed articles so the assistant
// tracks whatever the Help Centre currently shows; fall back to the built-in
// content if the database is empty or unreachable.
async function grounding(): Promise<string> {
  try {
    const rows = await createLooseTrpcClient().help.articles.query() as { category: string; question: string; answer: string }[]
    if (Array.isArray(rows) && rows.length > 0) {
      const byCat = new Map<string, string[]>()
      for (const r of rows) {
        const arr = byCat.get(r.category) ?? []
        arr.push(`Q: ${r.question}\nA: ${r.answer}`)
        byCat.set(r.category, arr)
      }
      return Array.from(byCat.entries()).map(([cat, qa]) => `## ${helpCategory(cat).title}\n${qa.join('\n')}`).join('\n\n')
    }
  } catch { /* fall through to static */ }
  return helpDigest()
}

const systemFor = (digest: string) => `You are the Grabitt Help Assistant. Grabitt is a local-first marketplace for the Canary Islands (buying/selling items, jobs/recruitment, property, and services).

Answer the user's question using ONLY the Grabitt help information below. Be concise, friendly and practical — a few short sentences, plain text, no markdown headings. If the answer isn't covered, say you're not sure and suggest they contact support via the app, rather than inventing details. Never ask for or repeat passwords, card numbers or other sensitive data. Do not include internal or system XML tags in your response.

--- GRABITT HELP KNOWLEDGE ---
${digest}
--- END ---`

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  let body: { question?: string; history?: Turn[] }
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request' }, { status: 400 }) }

  const question = (body.question ?? '').toString().trim().slice(0, 2000)
  if (!question) return Response.json({ error: 'Please enter a question.' }, { status: 400 })

  if (!apiKey) {
    return Response.json({
      answer: "The AI assistant isn't available right now. Browse the help topics below, or contact us via the app and our team will help.",
      unavailable: true,
    })
  }

  // Keep only the last few turns to bound cost/latency.
  const history = Array.isArray(body.history) ? body.history.slice(-6) : []
  const messages = [
    ...history
      .filter(t => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
      .map(t => ({ role: t.role, content: t.content.slice(0, 2000) })),
    { role: 'user' as const, content: question },
  ]

  const system = systemFor(await grounding())
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 700,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        system,
        messages,
      }),
    })

    if (!res.ok) {
      return Response.json({ answer: "Sorry — I couldn't answer that just now. Please try the help topics below or contact support.", error: true }, { status: 200 })
    }

    const data = await res.json()
    if (data?.stop_reason === 'refusal') {
      return Response.json({ answer: "I can't help with that one — please contact our team via the app for anything sensitive." })
    }
    const answer = Array.isArray(data?.content)
      ? data.content.filter((b: { type?: string }) => b?.type === 'text').map((b: { text?: string }) => b.text ?? '').join('').trim()
      : ''
    return Response.json({ answer: answer || "I'm not sure about that — try the help topics below, or contact support." })
  } catch {
    return Response.json({ answer: "Sorry — the assistant is temporarily unavailable. Please try the help topics below.", error: true }, { status: 200 })
  }
}
