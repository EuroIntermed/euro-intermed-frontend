import type { ReactNode } from 'react'

export interface Stat {
  label: string
  value: ReactNode
}

/**
 * A wrapping row of key-fact chips shown at the top of detail-page content
 * (e.g. lead value/created, company country/CUI/CAEN). Token-based surfaces so
 * it adapts to light/dark; wraps freely on mobile.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {stats.map((s, i) => (
        <div key={i} className="rounded-lg border bg-card px-3 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="text-sm font-medium tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
