export function SkeletonCard({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-label="Загрузка">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk-card">
          <div className="sk sk-ico" />
          <div className="sk-block">
            <div className="sk sk-line" />
            <div className="sk sk-line sm" />
          </div>
        </div>
      ))}
      <span className="sr-only">Загрузка…</span>
    </div>
  )
}