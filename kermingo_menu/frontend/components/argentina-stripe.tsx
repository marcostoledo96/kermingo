export function ArgentinaStripe({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full h-1.5 flex ${className}`}>
      <div className="flex-1 bg-[#75AADB]" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-[#75AADB]" />
    </div>
  )
}
