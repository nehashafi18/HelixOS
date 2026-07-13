import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ArrowLeft, Heart, HelpCircle, Lightbulb, ShieldAlert,
  MessageSquare, BookOpen, Volume2, VolumeX, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Info, Dna
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { reportsApi } from '@/lib/api'
import { useExplainMode } from '@/hooks/useExplainMode'
import { GlossaryTerm } from '@/components/shared/GlossaryTerm'
import { SafetyBanner } from '@/components/shared/SafetyBanner'
import { VariantListItem } from '@/types'

const FEATURE_PLAIN: Record<string, { plain: string; detail: string }> = {
  HydrophobicityChange: {
    plain: 'Water interaction change',
    detail: 'This mutation changes how this part of the protein interacts with its watery surroundings inside the cell. Proteins need to fold correctly, and this property affects folding.',
  },
  ChargeChange: {
    plain: 'Electrical charge change',
    detail: 'This mutation alters the electrical charge at this position in the protein. Proteins use electrical charges to recognize and bind to other molecules — changing this can disrupt those interactions.',
  },
  PolarityChange: {
    plain: 'Chemical polarity change',
    detail: 'Polarity describes how a molecule distributes its electrical charge. This mutation changes the polarity at one position, which can affect how the protein folds and functions.',
  },
  SizeChange: {
    plain: 'Amino acid size change',
    detail: 'The replacement amino acid is physically larger or smaller than the original. This can create steric clashes inside the protein — like trying to fit the wrong-sized piece into a puzzle.',
  },
  Position: {
    plain: 'Location in the protein',
    detail: 'Where in the protein chain this change occurs. Changes at positions that are "conserved" — meaning they are the same across many species — are more likely to be important.',
  },
  Gene: {
    plain: 'Which gene is affected',
    detail: 'The gene that contains this DNA change. Each gene provides instructions for making a specific protein, and mutations in different genes have different health implications.',
  },
}

function ConfidenceMeter({ confidence, isPathogenic }: { confidence: number; isPathogenic: boolean }) {
  const pct = Math.round(confidence * 100)
  const label = pct >= 90 ? 'Very High' : pct >= 75 ? 'High' : pct >= 60 ? 'Moderate' : 'Low'
  const color = isPathogenic ? '#dc2626' : '#16a34a'

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[32px] font-black" style={{ color }}>{pct}%</p>
          <p className="text-[14px] font-semibold text-muted-foreground">{label} Confidence</p>
        </div>
        <div className="text-right text-[13px] text-muted-foreground">
          <p>Model certainty</p>
          <p>not medical certainty</p>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {pct >= 85
          ? `Our model is ${label.toLowerCase()} confident in this prediction because this variant's chemical properties closely match patterns it learned from thousands of previously studied variants.`
          : pct >= 65
          ? `Our model has moderate confidence in this prediction. The variant shows some characteristics typical of ${isPathogenic ? 'harmful' : 'harmless'} variants, but the signal is not as clear-cut.`
          : `Our model has limited confidence here. This variant falls in a grey zone — its properties don't strongly resemble either harmful or harmless patterns. Additional evidence would be needed.`
        }
      </p>
      <p className="text-[13px] text-muted-foreground italic">
        Note: Confidence reflects the model's certainty based on learned patterns, not a medical guarantee.
        High model confidence does not replace clinical evaluation.
      </p>
    </div>
  )
}

function Section({ open, onToggle, icon: Icon, title, color, children }: {
  open: boolean
  onToggle: () => void
  icon: React.ElementType
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-[17px] font-bold">{title}</span>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-border">
          <div className="pt-5">{children}</div>
        </div>
      )}
    </div>
  )
}

export function AccessibleSummary() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { speechEnabled, setSpeechEnabled, speak } = useExplainMode()

  const [sections, setSections] = useState({
    found: true, meaning: true, why: true, confidence: false,
    nextSteps: true, glossary: false,
  })

  const toggle = (k: keyof typeof sections) =>
    setSections(s => ({ ...s, [k]: !s[k] }))

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(Number(id)).then(r => r.data),
    enabled: !!id,
  })

  const { data: variantData } = useQuery({
    queryKey: ['report-variants-summary', id],
    queryFn: () => reportsApi.getVariants(Number(id), { page: 1, page_size: 100 }).then(r => r.data),
    enabled: !!id,
  })

  const variants: VariantListItem[] = variantData?.items ?? []
  const pathogenic = variants.filter(v => v.prediction === 'Pathogenic')
  const benign = variants.filter(v => v.prediction === 'Benign')
  const total = variants.length
  const highConf = pathogenic.filter(v => (v.confidence ?? 0) >= 0.85)

  if (!report) {
    return (
      <Layout title="Accessible Summary">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Accessible Summary"
      subtitle="Plain-language explanation of your report"
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const enabling = !speechEnabled
              setSpeechEnabled(enabling)
              if (!enabling) {
                window.speechSynthesis?.cancel()
              } else {
                window.speechSynthesis?.cancel()
                const utt = new SpeechSynthesisUtterance(
                  `Read aloud mode enabled. Click any paragraph to hear it read aloud.`
                )
                utt.rate = 0.9
                utt.lang = 'en-US'
                window.speechSynthesis?.speak(utt)
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-accent transition-colors"
            title={speechEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
          >
            {speechEnabled ? <Volume2 className="h-4 w-4 text-blue-500" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            {speechEnabled ? 'Disable read aloud' : 'Read aloud'}
          </button>
          <button
            onClick={() => navigate(`/reports/${id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-accent transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Research view
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Intro */}
        <div className="rounded-xl bg-blue-600 text-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <Dna className="h-6 w-6" />
            <h2 className="text-[20px] font-bold">Your Genetic Analysis Report</h2>
          </div>
          <p
            className="text-[16px] leading-relaxed text-blue-100 cursor-pointer"
            onClick={() => speak(`Your genetic analysis report for ${report.filename} has been completed. We analyzed ${total} genetic variants.`)}
          >
            We analyzed the file <strong className="text-white">{report.filename}</strong> and examined{' '}
            <strong className="text-white">{total} genetic variant{total !== 1 ? 's' : ''}</strong> — small differences
            in DNA sequence. This summary explains what was found in straightforward language.
          </p>
        </div>

        <SafetyBanner variant="prominent" dismissible />

        {/* What was found */}
        <Section open={sections.found} onToggle={() => toggle('found')}
          icon={Heart} title="What Was Found" color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
          <div className="space-y-5">
            <p
              className="text-[16px] leading-relaxed cursor-pointer"
              onClick={() => speak(`We identified ${total} genetic variants. ${benign.length} appear unlikely to affect health and ${pathogenic.length} deserve additional attention because they resemble variants previously associated with disease.`)}
            >
              We identified <strong>{total}</strong> genetic change{total !== 1 ? 's' : ''} in this file.
              {benign.length > 0 && (
                <span> Most ({benign.length}) appear unlikely to affect health based on their biochemical properties.</span>
              )}
              {pathogenic.length > 0 && (
                <span> {pathogenic.length} variant{pathogenic.length !== 1 ? 's' : ''}{' '}
                {pathogenic.length === 1 ? 'deserves' : 'deserve'} additional attention because{' '}
                {pathogenic.length === 1 ? 'it resembles variants' : 'they resemble variants'} previously
                associated with disease in research.</span>
              )}
            </p>

            {/* Summary boxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-[14px] font-bold text-green-800 dark:text-green-400">Likely Harmless</span>
                </div>
                <p className="text-[36px] font-black text-green-600 leading-none">{benign.length}</p>
                <p className="text-[13px] text-green-700 dark:text-green-500 mt-1">
                  variants appear similar to harmless genetic differences commonly found in healthy people.
                </p>
              </div>
              <div className={`p-5 rounded-xl border ${
                pathogenic.length > 0
                  ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                  : 'bg-muted/30 border-border'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className={`h-5 w-5 ${pathogenic.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                  <span className={`text-[14px] font-bold ${pathogenic.length > 0 ? 'text-red-800 dark:text-red-400' : 'text-muted-foreground'}`}>
                    Needs Attention
                  </span>
                </div>
                <p className={`text-[36px] font-black leading-none ${pathogenic.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {pathogenic.length}
                </p>
                <p className={`text-[13px] mt-1 ${pathogenic.length > 0 ? 'text-red-700 dark:text-red-500' : 'text-muted-foreground'}`}>
                  {pathogenic.length > 0
                    ? 'variants share characteristics with mutations previously linked to disease in research studies.'
                    : 'No variants flagged for attention.'}
                </p>
              </div>
            </div>

            {/* Variant list */}
            {pathogenic.length > 0 && (
              <div>
                <p className="text-[14px] font-bold mb-3 text-foreground">Variants flagged for attention:</p>
                <div className="space-y-2">
                  {pathogenic.slice(0, 10).map((v, i) => (
                    <div key={i}
                      className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 cursor-pointer hover:border-red-400 transition-colors"
                      onClick={() => navigate(`/variants/${v.id}`)}
                    >
                      <div>
                        <p className="text-[15px] font-bold">
                          <span className="text-blue-600">{v.gene}</span>
                          <span className="text-muted-foreground font-mono ml-2 text-[13px]">
                            {v.original_aa}{v.position}{v.new_aa}
                          </span>
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          Amino acid substitution at position {v.position}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-black text-red-600">{Math.round((v.confidence ?? 0) * 100)}%</p>
                        <p className="text-[11px] text-muted-foreground">confidence</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* What does this mean */}
        <Section open={sections.meaning} onToggle={() => toggle('meaning')}
          icon={HelpCircle} title="What Does This Mean?" color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <div className="space-y-5">
            <p
              className="text-[16px] leading-relaxed cursor-pointer"
              onClick={() => speak("The words 'pathogenic' and 'benign' are medical research terms. Here's what they actually mean in plain language.")}
            >
              The words &ldquo;pathogenic&rdquo; and &ldquo;benign&rdquo; are medical research terms. Here's what they actually mean:
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div className="p-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <p className="text-[14px] font-bold text-red-800 dark:text-red-400 mb-2">When the model says "Pathogenic"…</p>
                <p className="text-[15px] leading-relaxed text-red-900 dark:text-red-300">
                  This means: <em>"This genetic change has characteristics similar to mutations that have been linked to disease
                  in previous research."</em>
                </p>
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="text-[13px] text-red-800 dark:text-red-400">
                    <strong>Important:</strong> This does <strong>not</strong> mean the variant definitely causes disease.
                    It means it resembles other variants that have been studied and associated with disease.
                    Many other factors determine whether a variant actually affects someone's health.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <p className="text-[14px] font-bold text-green-800 dark:text-green-400 mb-2">When the model says "Benign"…</p>
                <p className="text-[15px] leading-relaxed text-green-900 dark:text-green-300">
                  This means: <em>"This genetic change appears similar to harmless variations found in healthy people."</em>
                </p>
                <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-[13px] text-green-800 dark:text-green-400">
                    <strong>Note:</strong> A "benign" classification means the model found no strong indicators of harm —
                    not that the variant has been definitively proven to be harmless.
                  </p>
                </div>
              </div>
            </div>

            {highConf.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[14px] leading-relaxed text-blue-800 dark:text-blue-300">
                    <strong>{highConf.length} variant{highConf.length !== 1 ? 's' : ''}</strong> in this report were
                    flagged as likely pathogenic with high confidence (≥85%). These may particularly benefit
                    from review by a clinical geneticist.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Why did the model predict this */}
        <Section open={sections.why} onToggle={() => toggle('why')}
          icon={Lightbulb} title="Why Did the Model Predict This?" color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
          <div className="space-y-5">
            <p className="text-[16px] leading-relaxed">
              The model examines how each genetic change alters the physical and chemical properties of the protein
              it affects. Think of a protein as a precisely folded machine — every part has a specific shape and
              electrical charge that allows it to do its job. Here are the main properties the model considers:
            </p>

            <div className="space-y-3">
              {Object.entries(FEATURE_PLAIN).map(([key, { plain, detail }]) => (
                <div key={key} className="p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold">{plain}</p>
                      <p className="text-[14px] leading-relaxed text-muted-foreground mt-1">{detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-[14px] font-bold mb-2">How does the model learn?</p>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                The model was trained on thousands of genetic variants from ClinVar — a public database where researchers
                have recorded variants alongside evidence about whether they cause disease. By studying the chemical
                properties of variants with known effects, the model learned to recognize patterns that distinguish
                harmful variants from harmless ones.
              </p>
            </div>
          </div>
        </Section>

        {/* Confidence */}
        <Section open={sections.confidence} onToggle={() => toggle('confidence')}
          icon={Info} title="Understanding Confidence Scores" color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
          <div className="space-y-5">
            <p className="text-[16px] leading-relaxed">
              Every prediction includes a confidence score — a percentage that describes how certain the model is
              about its classification. Here's how to interpret these numbers:
            </p>

            <div className="space-y-2">
              {[
                { range: '90–100%', label: 'Very High Confidence', desc: 'The variant\'s properties strongly and consistently match one category. The model encountered many similar patterns during training.' },
                { range: '75–89%', label: 'High Confidence', desc: 'The variant shows clear characteristics of one category, though some uncertainty remains.' },
                { range: '60–74%', label: 'Moderate Confidence', desc: 'The evidence points in one direction, but the variant falls in a greyer area. Interpret with caution.' },
                { range: 'Below 60%', label: 'Low Confidence', desc: 'The variant\'s properties don\'t strongly match either category. Additional evidence is especially important here.' },
              ].map(({ range, label, desc }) => (
                <div key={range} className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                  <div className="w-24 shrink-0">
                    <p className="text-[13px] font-bold font-mono text-blue-600">{range}</p>
                    <p className="text-[12px] font-semibold text-foreground mt-0.5">{label}</p>
                  </div>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <p className="text-[14px] font-bold text-amber-800 dark:text-amber-400 mb-1">Important reminder</p>
              <p className="text-[14px] text-amber-700 dark:text-amber-500 leading-relaxed">
                A confidence score measures the model's certainty, not medical certainty. Even a 99% confidence score
                does not mean a variant definitely causes or doesn't cause disease — it means the model found very
                strong pattern matches. Clinical interpretation by a qualified professional is always necessary.
              </p>
            </div>
          </div>
        </Section>

        {/* Next steps */}
        <Section open={sections.nextSteps} onToggle={() => toggle('nextSteps')}
          icon={MessageSquare} title="What Should I Do Next?" color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
          <div className="space-y-4">
            <p className="text-[16px] leading-relaxed">
              This report is a research tool, not a medical diagnosis. Here are appropriate next steps depending on your situation:
            </p>

            <div className="space-y-3">
              {[
                {
                  who: 'If you are a researcher or clinician',
                  text: 'Review the flagged variants in the Research View, examine the SHAP explanations to understand the model\'s reasoning, and cross-reference with clinical databases such as ClinVar, OMIM, and gnomAD before drawing conclusions.',
                },
                {
                  who: 'If you are a patient or family member',
                  text: 'Do not attempt to draw medical conclusions from this report on your own. Share these findings with your physician or a certified genetic counselor who can interpret them in the context of your complete medical history.',
                },
                {
                  who: 'For concerning variants',
                  text: 'If this report identified variants with high-confidence pathogenic predictions, consider scheduling a consultation with a clinical geneticist. They can order confirmatory tests, provide accurate interpretation, and advise on appropriate next steps.',
                },
              ].map(({ who, text }) => (
                <div key={who} className="p-4 rounded-xl border border-border bg-card">
                  <p className="text-[14px] font-bold mb-1">{who}</p>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="text-[14px] text-blue-700 dark:text-blue-400 leading-relaxed">
                <strong>Finding a genetic counselor:</strong> In the US, visit the National Society of Genetic Counselors
                at nsgc.org to find a certified counselor near you. Your primary care physician can also provide a referral.
              </p>
            </div>
          </div>
        </Section>

        {/* Glossary */}
        <Section open={sections.glossary} onToggle={() => toggle('glossary')}
          icon={BookOpen} title="Scientific Terms Explained" color="bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
          <div className="grid grid-cols-1 gap-3">
            {[
              { term: 'Variant', def: 'A small difference in DNA compared to the typical sequence. Everyone has millions of genetic variants — most have no effect on health.' },
              { term: 'Protein', def: 'A molecule that performs specific jobs inside cells. Proteins are built from chains of smaller units called amino acids. Different proteins fold into different shapes that allow them to perform their tasks.' },
              { term: 'Amino Acid', def: 'The building blocks of proteins. There are 20 different amino acids, each with its own shape and chemical properties. A mutation can replace one amino acid with another.' },
              { term: 'Mutation / Missense Variant', def: 'A change in DNA where one amino acid in a protein is replaced with a different one. Depending on which amino acid is swapped and where, the effect can range from completely harmless to harmful.' },
              { term: 'Pathogenic', def: 'A technical term meaning "likely to cause disease." In this context, it means the variant has properties similar to variants previously linked to illness in research.' },
              { term: 'Benign', def: 'A technical term meaning "harmless." In this context, it means the variant\'s properties resemble harmless variations found in healthy people.' },
              { term: 'SHAP Value', def: 'A mathematical way of explaining which features most influenced the model\'s prediction. Positive SHAP values push toward "Pathogenic;" negative values push toward "Benign."' },
              { term: 'Conserved Position', def: 'A location in a protein that has remained nearly unchanged across many species throughout evolution. Conservation suggests the position performs an important function.' },
              { term: 'Confidence Score', def: 'A percentage that describes how certain the model is about its classification. Higher confidence means the variant\'s properties more strongly match patterns the model learned during training.' },
              { term: 'ClinVar', def: 'A public database maintained by the National Center for Biotechnology Information (NCBI) that stores information about genetic variants and their health effects.' },
            ].map(({ term, def }) => (
              <div key={term} className="p-4 rounded-lg border border-border bg-muted/30">
                <p className="text-[14px] font-bold mb-1">{term}</p>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{def}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer safety */}
        <div className="p-5 rounded-xl border border-border bg-card text-center">
          <ShieldAlert className="h-6 w-6 text-amber-500 mx-auto mb-2" />
          <p className="text-[14px] font-bold mb-1">Research and Educational Use Only</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            HelixOS is not a medical device and does not provide medical advice, diagnosis, or treatment recommendations.
            All findings from this platform must be interpreted by qualified healthcare professionals before any clinical action is taken.
          </p>
        </div>
      </div>
    </Layout>
  )
}
