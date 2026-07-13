import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dna, FlaskConical, Heart, Pill, Microscope, Cpu,
  Download, BookOpen, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle2, TrendingUp, TrendingDown, Minus,
  Info, AlertTriangle, FileText, FileSpreadsheet,
  Play
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { demoApi, reportsApi } from '@/lib/api'
import { useToast } from '@/components/shared/Toast'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Dataset {
  id: string
  name: string
  description: string
  file: string
  format: 'csv' | 'xlsx'
  variants: number
  genes: string[]
  categories: string[]
  color: string
  icon: string
}

interface DemoCase {
  id: string
  title: string
  variant: string
  gene: string
  protein_change: string
  prediction: string
  confidence: number
  clinical_significance: string
  reasoning: string[]
  summary: string
  features?: Record<string, number>
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  dna: Dna,
  flask: FlaskConical,
  heart: Heart,
  pill: Pill,
  microscope: Microscope,
  cpu: Cpu,
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  rose:   { bg: 'bg-rose-50 dark:bg-rose-950/20',     text: 'text-rose-600 dark:text-rose-400',   border: 'border-rose-200 dark:border-rose-800',   badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  red:    { bg: 'bg-red-50 dark:bg-red-950/20',       text: 'text-red-600 dark:text-red-400',     border: 'border-red-200 dark:border-red-800',     badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-950/20',   text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  green:  { bg: 'bg-green-50 dark:bg-green-950/20',   text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800',  badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/20',     text: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-200 dark:border-blue-800',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
}

// ── Dataset card ──────────────────────────────────────────────────────────────
function DatasetCard({ ds, onDownload, onLoad, loading }: {
  ds: Dataset
  onDownload: () => void
  onLoad: () => void
  loading: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ICON_MAP[ds.icon] || Dna
  const c = COLOR_MAP[ds.color] || COLOR_MAP.blue

  return (
    <Card className={`border ${c.border} transition-all hover:shadow-md`}>
      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.border} border flex items-center justify-center shrink-0`}>
            <Icon className={`h-6 w-6 ${c.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[16px] font-bold leading-tight">{ds.name}</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{ds.description}</p>
              </div>
              <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${c.badge}`}>
                {ds.format === 'xlsx'
                  ? <FileSpreadsheet className="h-3 w-3" />
                  : <FileText className="h-3 w-3" />}
                {ds.format.toUpperCase()}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3">
              <div>
                <span className="text-[22px] font-bold">{ds.variants.toLocaleString()}</span>
                <span className="text-[12px] text-muted-foreground ml-1">variants</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-wrap gap-1">
                {ds.categories.map(cat => (
                  <span key={cat} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.badge}`}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gene list (expandable) */}
        <div className="mt-4 border-t border-border pt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Genes: {ds.genes.slice(0, 4).join(', ')}{ds.genes.length > 4 ? ` +${ds.genes.length - 4} more` : ''}
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ds.genes.map(gene => (
                <span key={gene} className="px-2 py-0.5 rounded text-[12px] font-mono font-semibold bg-muted text-muted-foreground">
                  {gene}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            size="sm"
            onClick={onLoad}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {loading ? 'Loading…' : 'Load Demo'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Demo case card ─────────────────────────────────────────────────────────────
function DemoCaseCard({ dc }: { dc: DemoCase }) {
  const [open, setOpen] = useState(false)
  const isPat = dc.prediction === 'Pathogenic'
  const isVUS = dc.prediction === 'Uncertain'
  const isBenign = dc.prediction === 'Benign'

  const predColor = isPat
    ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'
    : isVUS
      ? 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800'
      : 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'

  const Icon = isPat ? TrendingUp : isVUS ? Minus : TrendingDown
  const confPct = Math.round(dc.confidence * 100)

  return (
    <Card className="overflow-hidden">
      <button className="w-full text-left" onClick={() => setOpen(!open)}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${predColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">{dc.title}</p>
              <p className="text-[16px] font-bold mt-0.5 font-mono">{dc.variant}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border ${predColor}`}>
                  {dc.prediction === 'Uncertain' ? 'Uncertain Significance' : dc.prediction}
                </span>
                <span className="text-[13px] text-muted-foreground">{confPct}% confidence</span>
              </div>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />}
          </div>
        </CardContent>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          {/* Summary */}
          <p className="text-[15px] leading-[1.7] text-foreground">{dc.summary}</p>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Model Confidence</span>
              <span className="text-[13px] font-bold">{confPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isPat ? 'bg-red-500' : isVUS ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>

          {/* Why */}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Why the model predicted this</p>
            <div className="space-y-1.5">
              {dc.reasoning.map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${isPat ? 'text-red-500' : isVUS ? 'text-amber-500' : 'text-green-500'}`} />
                  <p className="text-[14px] leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical sig */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-[13px]">
              <span className="font-semibold">Clinical Significance:</span>{' '}
              <span className="text-muted-foreground">{dc.clinical_significance}</span>
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DemoLibrary() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'datasets' | 'cases'>('datasets')

  const { data, isLoading } = useQuery({
    queryKey: ['demo-library'],
    queryFn: () => demoApi.library().then(r => r.data),
  })

  const datasets: Dataset[] = data?.datasets || []
  const cases: DemoCase[]   = data?.demo_cases || []

  const handleDownload = async (ds: Dataset) => {
    try {
      const res = await demoApi.download(ds.id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = ds.file
      a.click()
      URL.revokeObjectURL(url)
      toast({ type: 'success', title: `Downloaded ${ds.file}` })
    } catch {
      toast({ type: 'error', title: 'Download failed' })
    }
  }

  const handleLoad = async (ds: Dataset) => {
    setLoadingId(ds.id)
    try {
      // Download the file as a blob, then upload it as a new report
      const res = await demoApi.download(ds.id)
      const mimeType = ds.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      const file = new File([res.data], ds.file, { type: mimeType })
      const uploadRes = await reportsApi.upload(file)
      const reportId = uploadRes.data?.id || uploadRes.data?.report_id
      toast({ type: 'success', title: `${ds.name} loaded — opening report…` })
      if (reportId) navigate(`/reports/${reportId}`)
      else navigate('/reports')
    } catch {
      toast({ type: 'error', title: 'Failed to load demo. Make sure the backend is running.' })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Layout
      title="Demo Library"
      subtitle="Synthetic datasets for exploring HelixOS features"
    >
      {/* Notice banner */}
      <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-bold text-amber-700 dark:text-amber-400">Demonstration Data Only</p>
          <p className="text-[13px] text-amber-600 dark:text-amber-500 mt-0.5 leading-relaxed">
            All datasets are entirely synthetic and fictional. They do not contain real patient data,
            real clinical results, or real research findings. They are provided solely for exploring HelixOS features.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {([
          { key: 'datasets', label: 'Dataset Library', count: datasets.length },
          { key: 'cases',    label: 'Demo Cases',      count: cases.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-3 text-[14px] font-semibold border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === key ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'datasets' ? (
        <>
          {/* Instructions */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { step: '1', icon: BookOpen, text: 'Browse the library and choose a dataset that matches your use case' },
              { step: '2', icon: Play,     text: 'Click "Load Demo" to instantly upload the dataset and open the report' },
              { step: '3', icon: Download, text: 'Or download the raw file for use in your own analysis workflows' },
            ].map(({ step, icon: Icon, text }) => (
              <div key={step} className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                  {step}
                </div>
                <p className="text-[13px] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {datasets.map(ds => (
              <DatasetCard
                key={ds.id}
                ds={ds}
                onDownload={() => handleDownload(ds)}
                onLoad={() => handleLoad(ds)}
                loading={loadingId === ds.id}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Demo cases intro */}
          <div className="mb-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[13px] text-blue-700 dark:text-blue-400 leading-relaxed">
                These pre-built cases illustrate three key prediction scenarios: high-confidence pathogenic,
                uncertain significance, and likely benign. Expand each case to see the model's reasoning.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {cases.map(dc => (
              <DemoCaseCard key={dc.id} dc={dc} />
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
