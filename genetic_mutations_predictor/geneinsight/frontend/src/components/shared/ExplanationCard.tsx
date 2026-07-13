import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type CardColor = 'blue' | 'red' | 'green' | 'amber' | 'purple' | 'gray'

const COLOR_MAP: Record<CardColor, { bg: string; border: string; icon: string; title: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/20',     border: 'border-blue-200 dark:border-blue-800',   icon: 'text-blue-600 dark:text-blue-400',   title: 'text-blue-900 dark:text-blue-200' },
  red:    { bg: 'bg-red-50 dark:bg-red-950/20',       border: 'border-red-200 dark:border-red-800',     icon: 'text-red-600 dark:text-red-400',     title: 'text-red-900 dark:text-red-200' },
  green:  { bg: 'bg-green-50 dark:bg-green-950/20',   border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400', title: 'text-green-900 dark:text-green-200' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/20',   border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600 dark:text-amber-400', title: 'text-amber-900 dark:text-amber-200' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800',icon: 'text-purple-600 dark:text-purple-400',title: 'text-purple-900 dark:text-purple-200' },
  gray:   { bg: 'bg-muted/40',                        border: 'border-border',                          icon: 'text-muted-foreground',              title: 'text-foreground' },
}

interface Props {
  title: string
  icon: React.ElementType
  color?: CardColor
  defaultOpen?: boolean
  children: React.ReactNode
}

export function ExplanationCard({ title, icon: Icon, color = 'blue', defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const c = COLOR_MAP[color]

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${c.icon} shrink-0`} />
          <span className={`text-[15px] font-bold ${c.title}`}>{title}</span>
        </div>
        {open
          ? <ChevronUp className={`h-4 w-4 ${c.icon} shrink-0`} />
          : <ChevronDown className={`h-4 w-4 ${c.icon} shrink-0`} />
        }
      </button>
      {open && (
        <div className="px-5 pb-5">
          <div className="border-t border-current opacity-10 mb-4" />
          {children}
        </div>
      )}
    </div>
  )
}
