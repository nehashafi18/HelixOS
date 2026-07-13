import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { BiologicalFeature, ImpactLevel, impactLabel } from '@/lib/bioInterpretation'

const IMPACT_STYLES: Record<ImpactLevel, {
  bar: string; badge: string; dot: string; border: string; bg: string
}> = {
  high:     { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',    dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800',    bg: 'bg-red-50 dark:bg-red-950/10' },
  moderate: { bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',  dot: 'bg-amber-500',  border: 'border-amber-200 dark:border-amber-800',  bg: 'bg-amber-50 dark:bg-amber-950/10' },
  low:      { bar: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',   dot: 'bg-blue-400',   border: 'border-blue-200 dark:border-blue-800',   bg: 'bg-blue-50 dark:bg-blue-950/10' },
  none:     { bar: 'bg-green-400',  badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',  dot: 'bg-green-400',  border: 'border-green-200 dark:border-green-800',  bg: 'bg-green-50 dark:bg-green-950/10' },
}

const IMPACT_BAR_WIDTH: Record<ImpactLevel, string> = {
  high: '85%', moderate: '55%', low: '25%', none: '8%',
}

interface Props {
  feature: BiologicalFeature
  showResearchDetail?: boolean
  compact?: boolean
}

export function BiologicalFeatureCard({ feature, showResearchDetail = false, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const s = IMPACT_STYLES[feature.impact]

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${s.border} ${s.bg}`}>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold">{feature.title}</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>
              {impactLabel(feature.impact)}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
            {feature.headline}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 ${s.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[15px] font-bold">{feature.title}</h4>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                {impactLabel(feature.impact)} Impact
              </span>
              {/* Tooltip trigger */}
              <div className="relative">
                <button
                  onMouseEnter={() => setTooltipOpen(true)}
                  onMouseLeave={() => setTooltipOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                {tooltipOpen && (
                  <div className="absolute left-5 top-0 z-50 w-56 p-2.5 bg-foreground text-background text-[12px] rounded-lg shadow-xl leading-relaxed">
                    {feature.tooltip}
                    <div className="absolute left-[-4px] top-2 w-2 h-2 bg-foreground rotate-45" />
                  </div>
                )}
              </div>
            </div>

            {/* Impact bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                  style={{ width: IMPACT_BAR_WIDTH[feature.impact] }}
                />
              </div>
              <span className="text-[12px] text-muted-foreground shrink-0">
                {feature.rawValue != null && (
                  feature.rawValue > 0 ? `+${feature.rawValue.toFixed(2)}` : feature.rawValue.toFixed(2)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3 bg-card">
        <p className="text-[14px] font-semibold text-foreground">{feature.headline}</p>
        <p className="text-[14px] leading-[1.7] text-muted-foreground">{feature.explanation}</p>

        {/* Research detail toggle */}
        {showResearchDetail && feature.researchDetail && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-1"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? 'Hide model features' : 'View model features'}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-muted/60 border border-border">
                <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                  {feature.researchDetail}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compact feature summary row ────────────────────────────────────────────────
export function FeatureSummaryRow({ features }: { features: BiologicalFeature[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {features.map(f => (
        <BiologicalFeatureCard key={f.id} feature={f} compact />
      ))}
    </div>
  )
}
