// Every admin action that needs the service role key fails with Supabase's own
// "Invalid API key" when the key doesn't match the project the URL points at —
// a message that tells you nothing about which key, or why. A legacy service
// role key is a JWT carrying its project ref, so we can catch the common case
// (a key left over from a different Supabase project) and say so plainly.

function projectRefFromUrl(url: string): string | null {
  const m = /^https?:\/\/([a-z0-9]+)\.supabase\.(co|in)/i.exec(url.trim())
  return m ? m[1] : null
}

function projectRefFromJwt(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null // sb_secret_… keys carry no ref
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    return typeof payload?.ref === 'string' ? payload.ref : null
  } catch { return null }
}

/**
 * Returns an explanatory message when the configured service role key can't
 * work, or null when it looks usable. Never returns any part of the key.
 */
export function serviceKeyProblem(url: string | undefined, serviceKey: string | undefined): string | null {
  if (!serviceKey) return 'SUPABASE_SERVICE_ROLE_KEY is not set on this deployment.'
  if (!url) return 'NEXT_PUBLIC_SUPABASE_URL is not set on this deployment.'

  const urlRef = projectRefFromUrl(url)
  const keyRef = projectRefFromJwt(serviceKey)
  if (urlRef && keyRef && urlRef !== keyRef) {
    return `SUPABASE_SERVICE_ROLE_KEY belongs to Supabase project "${keyRef}", but this deployment points at "${urlRef}". Set the service role key from the ${urlRef} project.`
  }

  const looksAnon = keyRef !== null && /"role":"anon"/.test(Buffer.from(serviceKey.split('.')[1] ?? '', 'base64').toString('utf8'))
  if (looksAnon) return 'SUPABASE_SERVICE_ROLE_KEY holds the anon key, not the service role key. Admin actions need the service role key.'

  return null
}
