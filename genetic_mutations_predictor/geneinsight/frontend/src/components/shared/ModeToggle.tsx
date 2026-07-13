import { Microscope, BookOpen } from 'lucide-react'
import { useExplainMode } from '@/hooks/useExplainMode'

export function ModeToggle() {
  const { explainMode, toggleExplainMode } = useExplainMode()

  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 gap-0.5">
      <button
        onClick={() => explainMode && toggleExplainMode()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
          !explainMode
            ? 'bg-card shadow-sm text-foreground border border-border'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Microscope className="h-3.5 w-3.5" />
        Research
      </button>
      <button
        onClick={() => !explainMode && toggleExplainMode()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
          explainMode
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <BookOpen className="h-3.5 w-3.5" />
        Explain
      </button>
    </div>
  )
}
