import { ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  variant?: 'standard' | 'prominent'
  dismissible?: boolean
}

export function SafetyBanner({ variant = 'standard', dismissible = false }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  if (variant === 'prominent') {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[15px] font-bold text-amber-800 dark:text-amber-400 mb-1">
              For Educational and Research Use Only
            </p>
            <p className="text-[14px] text-amber-700 dark:text-amber-500 leading-relaxed">
              HelixOS is a research and educational tool. Predictions made by this platform are based on machine learning
              models and should not be used as the basis for clinical decisions, diagnosis, or treatment.
              All findings should be reviewed and validated by a qualified clinical geneticist or healthcare professional.
            </p>
            <p className="text-[13px] text-amber-600 dark:text-amber-600 mt-2">
              If you or someone you know has received a concerning genetic test result, please consult a genetic counselor or physician.
            </p>
          </div>
          {dismissible && (
            <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700 shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-[13px] text-muted-foreground mb-5">
      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      <span>
        <strong className="text-foreground">Research tool only.</strong>{' '}
        Predictions are not a substitute for clinical interpretation by a qualified geneticist.
        Always consult a healthcare professional for medical decisions.
      </span>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="ml-auto shrink-0 hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
