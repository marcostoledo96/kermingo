import { DEMO_BANNER_TEXT } from '@/lib/mocks/mode'

/** Server-safe banner. Visibility is fixed at build time via NEXT_PUBLIC_MOCK_API. */
export function DemoArchiveBanner() {
  if (process.env.NEXT_PUBLIC_MOCK_API !== 'true') return null

  return (
    <div
      role="status"
      className="border-b border-[#F6B21A]/40 bg-[#FFF8E7] px-4 py-2 text-center text-xs font-semibold text-[#5C4A12] sm:text-sm"
    >
      {DEMO_BANNER_TEXT}
    </div>
  )
}
