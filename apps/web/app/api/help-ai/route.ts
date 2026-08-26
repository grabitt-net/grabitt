import { helpDigest, helpCategory } from '@/lib/helpContent'
import { createLooseTrpcClient } from '@/lib/trpc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// AI help assistant. Answers a visitor's question grounded in the Grabitt help
// content, so replies stay accurate to how the platform actually works.
//
// Calls the OpenAI Chat Completions API over raw HTTP (rather than the SDK) so
// this route has no extra dependency to install/lock. Requires OPENAI_API_KEY in
// the environment; without it the endpoint returns a graceful fallback.

type Turn = { role: 'user' | 'assistant'; content: string }

// Grounding digest — prefer the live, admin-managed articles so the assistant
// tracks whatever the Help Centre currently shows; fall back to the built-in
// content if the database is empty or unreachable.
// Retrieval: rank articles by keyword overlap with the question and keep only
// the most relevant handful. This keeps each AI call small and cheap — we send
// the pieces of the Help Centre that actually relate to the question, not the
// whole thing. Falls back to the full set when nothing scores (small anyway).
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'is', 'are', 'do', 'i', 'my', 'how', 'can', 'what', 'in', 'on', 'for', 'with', 'you', 'your', 'me', 'it'])
function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}
async function grounding(question: string): Promise<string> {
  let rows: { category: string; question: string; answer: string }[] = []
  try {
    const res = await createLooseTrpcClient().help.articles.query() as typeof rows
    if (Array.isArray(res)) rows = res
  } catch { /* fall through to static */ }
  if (rows.length === 0) return helpDigest()

  const qWords = new Set(tokens(question))
  const scored = rows.map(r => {
    const words = tokens(`${r.question} ${r.answer} ${r.category}`)
    let score = 0
    for (const w of words) if (qWords.has(w)) score++
    return { r, score }
  })
  const top = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map(s => s.r)
  const chosen = top.length >= 3 ? top : rows.slice(0, 14) // small corpus → just send a bounded slice

  const byCat = new Map<string, string[]>()
  for (const r of chosen) {
    const arr = byCat.get(r.category) ?? []
    arr.push(`Q: ${r.question}\nA: ${r.answer}`)
    byCat.set(r.category, arr)
  }
  return Array.from(byCat.entries()).map(([cat, qa]) => `## ${helpCategory(cat).title}\n${qa.join('\n')}`).join('\n\n')
}

const systemFor = (digest: string) => `You are the Grabitt Help Assistant. Grabitt is a local-first marketplace for the Canary Islands (buying/selling items, jobs/recruitment, property, and services).

Answer the user's question using ONLY the Grabitt help information below. Be concise, friendly and practical — a few short sentences, plain text, no markdown headings. If the answer isn't covered, say you're not sure and suggest they contact support via the app, rather than inventing details. Never ask for or repeat passwords, card numbers or other sensitive data. Do not include internal or system XML tags in your response.

--- GRABITT HELP KNOWLEDGE ---
${digest}
--- END ---`

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
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

  const system = systemFor(await grounding(question))
  try {
    // OpenAI Chat Completions over raw HTTP (no SDK dependency). gpt-4o-mini is
    // cheap and fast — plenty for answering from the grounded Help Centre
    // content. The system prompt is the first message in OpenAI's format.
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })

    if (!res.ok) {
      return Response.json({ answer: "Sorry — I couldn't answer that just now. Please try the help topics below or contact support.", error: true }, { status: 200 })
    }

    const data = await res.json()
    const choice = Array.isArray(data?.choices) ? data.choices[0] : null
    if (choice?.finish_reason === 'content_filter') {
      return Response.json({ answer: "I can't help with that one — please contact our team via the app for anything sensitive." })
    }
    const answer = (choice?.message?.content ?? '').toString().trim()
    return Response.json({ answer: answer || "I'm not sure about that — try the help topics below, or contact support." })
  } catch {
    return Response.json({ answer: "Sorry — the assistant is temporarily unavailable. Please try the help topics below.", error: true }, { status: 200 })
  }
}
