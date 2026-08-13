import { DEMO_SESSION_KEY } from './mode'

export type DemoSessionUser = {
  id: number
  name: string
  email: string
  role?: string
  nombre?: string
}

export function readDemoSession(): DemoSessionUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY)
    return raw ? (JSON.parse(raw) as DemoSessionUser) : null
  } catch {
    return null
  }
}

export function writeDemoSession(user: DemoSessionUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
    else window.localStorage.removeItem(DEMO_SESSION_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}
