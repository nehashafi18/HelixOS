import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, FlaskConical, Volume2,
  Eye, EyeOff, Download
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { variantsApi } from '@/lib/api'
import { useExplainMode } from '@/hooks/useExplainMode'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { GlossaryTerm } from '@/components/shared/GlossaryTerm'
import { SafetyBanner } from '@/components/shared/SafetyBanner'
import { ExplanationCard } from '@/components/shared/ExplanationCard'
import { BiologicalFeatureCard } from '@/components/shared/BiologicalFeatureCard'
import { useToast } from '@/components/shared/Toast'
import {
  interpretFeatures, biologicalSummary,
  overallBiologicalImpact, impactLabel
} from '@/lib/bioInterpretation'
import { exportVariantPDF } from '@/lib/pdfExport'

const AMINO_ACID_LABELS: Record<string, string> = {
  Ala: 'Alanine', Arg: 'Arginine', Asn: 'Asparagine', Asp: 'Aspartate',
  Cys: 'Cysteine', Gln: 'Glutamine', Glu: 'Glutamate', Gly: 'Glycine',
  His: 'Histidine', Ile: 'Isoleucine', Leu: 'Leucine', Lys: 'Lysine',
  Met: 'Methionine', Phe: 'Phenylalanine', Pro: 'Proline', Ser: 'Serine',
  Thr: 'Threonine', Trp: 'Tryptophan', Tyr: 'Tyrosine', Val: 'Valine',
}

const TABS = ['Overview', 'Biological Impact', 'SHAP Analysis', 'Raw Features'] as const
type Tab = typeof TABS[number]

const IMPACT_DOT: Record<string, string> = {
  high: 'bg-red-500', moderate: 'bg-amber-500', low: 'bg-blue-400', none: 'bg-green-400'
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <TrendingUp className="h-3.5 w-3.5 text-red-500" />
  if (change < 0) return <TrendingDown className="h-3.5 w-3.5 text-green-500" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

export function VariantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [showRawFeatures, setShowRawFeatures] = useState(false)
  const { explainMode, speak, speechEnabled, readingLevel } = useExplainMode()
  const { toast } = useToast()

  const { data: variant, isLoading } = useQuery({
    queryKey: ['variant', id],
    queryFn: () => variantsApi.get(Number(id)).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <Layout title="Variant Detail">
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-muted rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-lg" />)}
          </div>
        </div>
      </Layout>
    )
  }

  if (!variant) {
    return (
      <Layout title="Variant Not Found">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <FlaskConical className="h-12 w-12 text-muted-foreground" />
          <p className="text-[17px] font-semibold">Variant not found</p>
          <p className="text-[14px] text-muted-foreground">This variant doesn't exist or you don't have access.</p>
        </div>
      </Layout>
    )
  }

  const isPathogenic = variant.prediction === 'Pathogenic'
  const conf     = (variant.confidence || 0) * 100
  const rawFeats = variant.features || {}

  // Biological interpretation
  const bioFeatures = interpretFeatures(rawFeats)
  const overallImpact = overallBiologicalImpact(bioFeatures)
  const bioSummaryText = biologicalSummary(
    bioFeatures,
    variant.prediction,
    variant.gene,
    variant.original_aa,
    variant.new_aa,
    readingLevel === 'simple' ? 'beginner'
    : readingLevel === 'technical' ? 'advanced'
    : 'intermediate'
  )

  const shapData = variant.shap_values
    ? Object.entries(variant.shap_values)
        .map(([k, v]) => ({ feature: k, value: Number(v) }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 12)
    : []

  const gaugeData = [{ value: conf, fill: isPathogenic ? '#dc2626' : '#16a34a' }]

  return (
    <Layout
      title={`${variant.gene || '?'} · ${variant.original_aa}${variant.position}${variant.new_aa}`}
      subtitle="Variant pathogenicity report"
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              try {
                exportVariantPDF({
                  gene: variant.gene,
                  original_aa: variant.original_aa,
                  position: variant.position,
                  new_aa: variant.new_aa,
                  prediction: variant.prediction,
                  confidence: variant.confidence,
                  clinical_significance: variant.clinical_significance,
                  variant_type: variant.variant_type,
                  origin: variant.origin,
                  explanation: variant.explanation,
                  features: variant.features || {},
                  shap_values: variant.shap_values,
                })
                toast({ type: 'success', title: 'PDF downloaded' })
              } catch {
                toast({ type: 'error', title: 'PDF export failed — check browser console' })
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <ModeToggle />
        </div>
      }
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Hero banner */}
      <div className={`rounded-xl border-l-4 p-6 mb-5 ${
        isPathogenic
          ? 'bg-red-50 border-red-500 dark:bg-red-950/20'
          : 'bg-green-50 border-green-500 dark:bg-green-950/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPathogenic ? 'bg-red-100 dark:bg-red-900/50' : 'bg-green-100 dark:bg-green-900/50'
            }`}>
              {isPathogenic
                ? <AlertTriangle className="h-6 w-6 text-red-600" />
                : <CheckCircle2 className="h-6 w-6 text-green-600" />
              }
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-[28px] font-bold font-mono tracking-tight">
                  {variant.original_aa}{variant.position}{variant.new_aa}
                </span>
                <span className={isPathogenic ? 'badge-pathogenic' : 'badge-benign'}>
                  {variant.prediction}
                </span>
              </div>
              <p className="text-[15px] mt-1 text-foreground/70">
                <span className="font-semibold text-foreground">{variant.gene}</span>
                {variant.variant_type && <span className="ml-2">· {variant.variant_type}</span>}
                {variant.origin && <span className="ml-2">· {variant.origin}</span>}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[42px] font-black leading-none" style={{ color: isPathogenic ? '#dc2626' : '#16a34a' }}>
              {Math.round(conf)}%
            </p>
            <p className="text-[13px] font-semibold text-muted-foreground mt-1">Model Confidence</p>
          </div>
        </div>
      </div>

      {/* Safety banner */}
      <SafetyBanner />

      {/* Explain Mode cards */}
      {explainMode && (
        <div className="space-y-3 mb-5">
          <ExplanationCard title="What Happened?" icon={FlaskConical} color="blue" defaultOpen>
            <p className="text-[15px] leading-relaxed">
              In the <GlossaryTerm term="gene">{variant.gene}</GlossaryTerm> gene, one{' '}
              <GlossaryTerm term="amino acid">amino acid</GlossaryTerm> was replaced by another.
              Specifically, <strong>{AMINO_ACID_LABELS[variant.original_aa] || variant.original_aa}</strong> at
              position <strong>{variant.position}</strong> was changed to{' '}
              <strong>{AMINO_ACID_LABELS[variant.new_aa] || variant.new_aa}</strong>.
              {speechEnabled && (
                <button
                  onClick={() => speak(`In the gene ${variant.gene}, ${AMINO_ACID_LABELS[variant.original_aa]} at position ${variant.position} was changed to ${AMINO_ACID_LABELS[variant.new_aa]}.`)}
                  className="ml-2 inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-[13px]"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Read aloud
                </button>
              )}
            </p>
          </ExplanationCard>

          {bioFeatures.filter(f => f.impact !== 'none').length > 0 && (
            <ExplanationCard title="What Biological Changes Were Detected?" icon={TrendingUp} color="purple" defaultOpen>
              <p className="text-[15px] leading-relaxed mb-3">{bioSummaryText}</p>
              <div className="space-y-2">
                {bioFeatures.filter(f => f.impact !== 'none').map(f => (
                  <div key={f.id} className="flex items-start gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${IMPACT_DOT[f.impact]}`} />
                    <p className="text-[14px] leading-relaxed">
                      <strong>{f.title}:</strong> {f.headline}
                    </p>
                  </div>
                ))}
              </div>
            </ExplanationCard>
          )}

          <ExplanationCard
            title={`Why It Matters — ${isPathogenic ? 'This change raised a flag' : 'This change appears harmless'}`}
            icon={isPathogenic ? AlertTriangle : CheckCircle2}
            color={isPathogenic ? 'red' : 'green'}
            defaultOpen
          >
            <p className="text-[15px] leading-relaxed">
              {isPathogenic
                ? `The model flagged this genetic change because its chemical properties resemble patterns seen in harmful variants. The overall biological impact is rated ${impactLabel(overallImpact)}. Changes to ${bioFeatures.filter(f=>f.impact==='high'||f.impact==='moderate').map(f=>f.title.toLowerCase()).join(' and ') || 'amino acid properties'} contributed most to this prediction.`
                : `The model considers this genetic change likely harmless. The chemical properties of the replacement amino acid are similar enough to the original that the protein's function is unlikely to be significantly disrupted. Overall biological impact: ${impactLabel(overallImpact)}.`
              }
            </p>
          </ExplanationCard>

          <ExplanationCard title={`Model Confidence — ${Math.round(conf)}%`} icon={TrendingUp} color="amber" defaultOpen={false}>
            <div className="space-y-3">
              <div className="flex items-end gap-4">
                <p className="text-[40px] font-black" style={{ color: isPathogenic ? '#dc2626' : '#16a34a' }}>{Math.round(conf)}%</p>
                <p className="text-[15px] text-muted-foreground pb-2">
                  {conf >= 85 ? 'Very high' : conf >= 70 ? 'High' : conf >= 55 ? 'Moderate' : 'Low'} confidence
                </p>
              </div>
              <p className="text-[15px] leading-relaxed">
                {conf >= 85
                  ? "The model is very confident in this prediction. This variant's chemical properties closely match patterns it learned from thousands of previously studied variants."
                  : conf >= 70
                  ? "The model has high confidence, though not certainty. The variant shows clear characteristics of one category."
                  : "The model has moderate confidence. This variant falls in a grey zone — additional evidence would be valuable."}
              </p>
            </div>
          </ExplanationCard>

          <ExplanationCard title="Questions to Discuss with a Professional" icon={CheckCircle2} color="green" defaultOpen>
            <ul className="space-y-2 ml-2">
              {[
                `Why was the ${variant.gene} gene flagged?`,
                'Has this specific variant been reported in other patients?',
                'Are there confirmatory tests available?',
                `What does a ${Math.round(conf)}% confidence score mean in a clinical context?`,
                'Should other family members be tested?',
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-[14px]">
                  <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                  <span>"{q}"</span>
                </li>
              ))}
            </ul>
          </ExplanationCard>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-5 -mt-1 gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab-underline ${activeTab === tab ? 'active' : ''}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-3 gap-5">
          {/* Confidence gauge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-semibold">Confidence Gauge</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart cx="50%" cy="75%" innerRadius="60%" outerRadius="90%"
                  startAngle={180} endAngle={0} data={gaugeData}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value"
                    cornerRadius={8} angleAxisId={0} />
                  <text x="50%" y="68%" textAnchor="middle"
                    style={{ fontSize: '30px', fontWeight: 800, fill: isPathogenic ? '#dc2626' : '#16a34a' }}>
                    {Math.round(conf)}%
                  </text>
                  <text x="50%" y="82%" textAnchor="middle"
                    style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}>
                    {variant.prediction}
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Biological summary card */}
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-semibold">Prediction Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Biological summary text */}
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Biological Interpretation</p>
                <p className="text-[15px] leading-[1.7]">{bioSummaryText}</p>
              </div>

              {/* Feature impact overview (compact cards) */}
              {bioFeatures.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Property Changes</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bioFeatures.map(f => (
                      <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${IMPACT_DOT[f.impact]}`} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold truncate">{f.title}</p>
                          <p className="text-[11px] text-muted-foreground">{impactLabel(f.impact)} impact</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="text-[12px] text-amber-700 dark:text-amber-400">
                  <strong>Research Note:</strong> All predictions require experimental validation and clinical review before application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Biological Impact tab ─────────────────────────────────────────── */}
      {activeTab === 'Biological Impact' && (
        <div className="space-y-5">
          {/* Intro */}
          <Card>
            <CardContent className="p-5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2">What biological changes did this mutation introduce?</p>
              <p className="text-[15px] leading-[1.7]">
                The {variant.gene} variant <strong className="font-mono">{variant.original_aa}{variant.position}{variant.new_aa}</strong> swaps{' '}
                <strong>{AMINO_ACID_LABELS[variant.original_aa] || variant.original_aa}</strong> for{' '}
                <strong>{AMINO_ACID_LABELS[variant.new_aa] || variant.new_aa}</strong> at position {variant.position}.
                The cards below explain what each biochemical property change means and why it matters.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-[12px] font-bold border ${
                  overallImpact === 'high'     ? 'bg-red-100 text-red-700 border-red-200'
                  : overallImpact === 'moderate' ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : overallImpact === 'low'      ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-green-100 text-green-700 border-green-200'
                }`}>
                  Overall Impact: {impactLabel(overallImpact)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature cards — sorted by impact */}
          {bioFeatures.map(f => (
            <BiologicalFeatureCard
              key={f.id}
              feature={f}
              showResearchDetail={readingLevel === 'technical'}
            />
          ))}

          {/* Raw values toggle (Research mode) */}
          <div>
            <button
              onClick={() => setShowRawFeatures(!showRawFeatures)}
              className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {showRawFeatures ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showRawFeatures ? 'Hide raw model features' : 'View raw model features'}
            </button>
            {showRawFeatures && (
              <Card className="mt-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold">Raw ML Feature Values</CardTitle>
                  <p className="text-[13px] text-muted-foreground">Numerical values passed directly to the Random Forest model</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(rawFeats).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40 border border-border">
                        <span className="text-[13px] text-muted-foreground font-medium">{k}</span>
                        <span className="font-mono text-[14px] font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── SHAP Analysis tab ─────────────────────────────────────────────── */}
      {activeTab === 'SHAP Analysis' && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">SHAP Feature Contributions</CardTitle>
              <p className="text-[13px] text-muted-foreground">
                Red bars push toward Pathogenic · Green bars push toward Benign
              </p>
            </CardHeader>
            <CardContent>
              {shapData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={shapData} layout="vertical" margin={{ left: 180, right: 40, top: 5, bottom: 5 }}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="feature" type="category"
                      tick={{ fontSize: 13, fill: 'hsl(var(--foreground))' }} width={175} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                      formatter={(v: number) => [v.toFixed(5), 'SHAP value']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {shapData.map((entry, i) => (
                        <Cell key={i} fill={entry.value > 0 ? '#dc2626' : '#16a34a'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[14px] text-muted-foreground py-8 text-center">No SHAP data available for this variant.</p>
              )}
            </CardContent>
          </Card>

          {shapData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[14px] font-semibold">Feature Values Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left pl-6">Feature</th>
                      <th className="text-right">SHAP Value</th>
                      <th className="text-left">Direction</th>
                      <th className="text-left">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shapData.map((item, i) => {
                      const maxAbs = Math.max(...shapData.map(d => Math.abs(d.value)))
                      const pct = maxAbs > 0 ? (Math.abs(item.value) / maxAbs) * 100 : 0
                      return (
                        <tr key={i}>
                          <td className="pl-6 font-medium">{item.feature}</td>
                          <td className={`text-right font-mono font-bold ${item.value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.value > 0 ? '+' : ''}{item.value.toFixed(5)}
                          </td>
                          <td>
                            <span className={`text-[12px] font-semibold ${item.value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {item.value > 0 ? '↑ Pathogenic' : '↓ Benign'}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2 w-32">
                              <div className="flex-1 conf-bar-track">
                                <div className="h-full rounded" style={{
                                  width: `${pct}%`,
                                  background: item.value > 0 ? '#dc2626' : '#16a34a'
                                }} />
                              </div>
                              <span className="text-[11px] text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Raw Features tab ──────────────────────────────────────────────── */}
      {activeTab === 'Raw Features' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <p className="text-[13px] text-blue-700 dark:text-blue-400 leading-relaxed">
              <strong>Research view:</strong> These are the numerical values passed directly to the Random Forest model.
              For biological interpretation of what these values mean, see the <button onClick={() => setActiveTab('Biological Impact')} className="underline font-semibold">Biological Impact</button> tab.
            </p>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">All Feature Values</CardTitle>
              <p className="text-[13px] text-muted-foreground">Raw features passed to the Random Forest model</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(rawFeats).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="text-[14px] text-muted-foreground font-medium">{k}</span>
                    <span className="font-mono text-[15px] font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  )
}
