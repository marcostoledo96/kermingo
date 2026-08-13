/** Whether the frontend should serve fixtures instead of calling Railway/Express. */
export function isMockApi(
  value: string | undefined = process.env.NEXT_PUBLIC_MOCK_API,
): boolean {
  return value === 'true'
}

export const DEMO_ADMIN_EMAIL = 'admin@kermingo.com'
export const DEMO_ADMIN_PASSWORD = 'admin123'
export const DEMO_SESSION_KEY = 'kermingo:demoSession'
export const DEMO_BANNER_TEXT =
  'Modo demo / archivo — el evento Kermingo 2026 ya finalizó. Los cambios no se guardan.'
