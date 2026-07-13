import { cn } from '@/lib/utils'

interface ConfidenceBarProps {
  confidence: number | null
  showLabel?: boolean
  className?: string
}

export function ConfidenceBar({ confidence, showLabel = true, className }: ConfidenceBarProps) {
  if (confidence === null || confidence === undefined) {
    return <span className="text-xs text-muted-foreground">N/A</span>
  }

  const pct = Math.round(confidence * 100)

  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 75 ? 'bg-orange-500' :
    pct >= 60 ? 'bg-yellow-500' :
    'bg-green-500'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-muted-foreground w-10 text-right">
          {pct}%
        </span>
      )}
    </div>
  )
}
