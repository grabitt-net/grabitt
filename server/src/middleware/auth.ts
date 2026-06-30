import jwt from 'jsonwebtoken'

interface ConsumerPayload { id: string; grade: string }
interface ExecPayload { id: string; role: string }

export function verifyConsumerJwt(token: string): ConsumerPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as ConsumerPayload
  } catch {
    return null
  }
}

export function verifyExecJwt(token: string): ExecPayload | null {
  try {
    // Exec JWTs use a DIFFERENT secret from consumer JWTs
    return jwt.verify(token, process.env.EXEC_JWT_SECRET!) as ExecPayload
  } catch {
    return null
  }
}

export function signConsumerJwt(payload: ConsumerPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30d' })
}

export function signExecJwt(payload: ExecPayload): string {
  // 4-hour TTL, NO silent refresh
  return jwt.sign(payload, process.env.EXEC_JWT_SECRET!, { expiresIn: '4h' })
}
