import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Send, FlaskConical, User, Sparkles, Info,
  ChevronDown, ChevronUp, Trash2, AlertTriangle,
  CheckCircle2, TrendingUp, BookOpen
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/card'
import { assistantApi } from '@/lib/api'
import { useExplainMode, ReadingLevel } from '@/hooks/useExplainMode'
import { GlossaryTerm } from '@/components/shared/GlossaryTerm'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: 'Explain mutation', prompt: 'Explain what a missense mutation is in simple terms.' },
  { label: 'SHAP values', prompt: 'What do SHAP values mean and how should I interpret them?' },
  { label: 'Confidence score', prompt: 'What does the confidence score mean and how reliable is it?' },
  { label: 'Top risk factors', prompt: 'Which biochemical features most often indicate a pathogenic variant?' },
  { label: 'Summarize report', prompt: 'Summarize my most recent uploaded report.' },
  { label: 'Model accuracy', prompt: 'How accurate is the Random Forest model and what are its limitations?' },
]

const LEVEL_LABELS: Record<ReadingLevel, string> = {
  simple:    'Simple',
  standard:  'Standard',
  detailed:  'Detailed',
  technical: 'Technical',
}

// Parse assistant response into structured sections
function parseResponse(text: string) {
  const lines = text.split('\n').filter(l => l.trim())
  const summary: string[] = []
  const findings: string[] = []
  const detail: string[] = []
  let section: 'summary' | 'findings' | 'detail' = 'summary'
  let summaryFull = ''
  let inList = false

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('key finding') || lower.includes('important factor') || lower.includes('primary factor') || (line.startsWith('•') && summary.length > 0)) {
      section = 'findings'
    } else if (lower.includes('technical detail') || lower.includes('shap') || lower.includes('feature importance') || detail.length > 0) {
      section = 'detail'
    }

    if (section === 'summary') summaryFull += (summaryFull ? ' ' : '') + line.replace(/^#+\s*/, '').replace(/\*\*/g, '')
    else if (section === 'findings') findings.push(line.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, ''))
    else detail.push(line.replace(/^#+\s*/, '').replace(/\*\*/g, ''))
  }

  // If summary is too long, split
  const sentences = summaryFull.split(/(?<=[.!?])\s+/)
  const shortSummary = sentences.slice(0, 3).join(' ')
  const overflow = sentences.slice(3).join(' ')
  if (overflow) detail.unshift(overflow)

  return { summary: shortSummary, findings, detail: detail.join('\n\n'), raw: text }
}

function AssistantBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const { explainMode } = useExplainMode()

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[65%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-5 py-3.5">
          <p className="text-[16px] leading-relaxed">{msg.content}</p>
          <p className="text-[11px] text-blue-200 mt-1.5">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  const parsed = parseResponse(msg.content)

  return (
    <div className="space-y-3 max-w-[85%]">
      {/* Summary card — always visible */}
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
            <FlaskConical className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            HelixOS Research Assistant
          </span>
          <span className="text-[11px] text-muted-foreground ml-auto">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Summary */}
        <p className="text-[17px] leading-[1.7] text-foreground">
          {parsed.summary}
        </p>

        {/* Key findings */}
        {parsed.findings.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Key Points</p>
            <div className="space-y-1.5">
              {parsed.findings.slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[15px] leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand detail */}
        {parsed.detail && (
          <div className="border-t border-border pt-3">
            <button
              onClick={() => setDetailOpen(!detailOpen)}
              className="flex items-center gap-2 text-[14px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {detailOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {detailOpen ? 'Hide detailed explanation' : 'View detailed explanation'}
            </button>
            <AnimatePresence>
              {detailOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-2">
                    {parsed.detail.split('\n\n').map((para, i) => (
                      <p key={i} className="text-[15px] leading-relaxed text-muted-foreground">{para}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to the HelixOS Research Assistant. I can help you interpret variant pathogenicity predictions, explain biochemical property changes, understand SHAP values, and analyze your uploaded reports. Ask me anything about your data or the underlying science.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { readingLevel, setReadingLevel, explainMode } = useExplainMode()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: (message: string) => {
      const levelPrefix = readingLevel !== 'technical'
        ? `[Please respond at a ${LEVEL_LABELS[readingLevel]} level. ${
            readingLevel === 'simple'   ? 'Use plain language, avoid all jargon.' :
            readingLevel === 'standard' ? 'Use clear explanations, define any technical terms.' :
            'Provide detailed explanations with scientific context.'
          }] `
        : ''
      return assistantApi.chat(levelPrefix + message).then(r => r.data)
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }])
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
        timestamp: new Date(),
      }])
    },
  })

  const handleSend = (message?: string) => {
    const text = message || input.trim()
    if (!text) return
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }])
    setInput('')
    chatMutation.mutate(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Layout title="Research Assistant" subtitle="Scientific interpretation">
      <div className="flex gap-5" style={{ height: 'calc(100vh - 112px)' }}>

        {/* LEFT: Conversation */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Reading level selector */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <p className="text-[13px] text-muted-foreground">
              {messages.length - 1} message{messages.length !== 2 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Level:</span>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(Object.entries(LEVEL_LABELS) as [ReadingLevel, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setReadingLevel(value)}
                    className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      readingLevel === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMessages([messages[0]])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-accent transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-2">
            {/* Suggestions */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {SUGGESTIONS.map(({ label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(prompt)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-border bg-card hover:border-blue-500/60 hover:bg-blue-500/5 hover:text-blue-600 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AssistantBubble msg={msg} isLast={i === messages.length - 1} />
                </motion.div>
              ))}

              {chatMutation.isPending && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 w-fit">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                        <FlaskConical className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                        <span className="text-[13px] text-muted-foreground ml-2">Analyzing…</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <Card className="mt-3 p-0 overflow-hidden shrink-0">
            <div className="flex items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about variants, predictions, SHAP values, or genomic science…"
                rows={1}
                className="flex-1 resize-none px-5 py-4 text-[16px] bg-transparent border-0 outline-none placeholder:text-muted-foreground leading-relaxed"
                style={{ minHeight: '56px', maxHeight: '160px' }}
                disabled={chatMutation.isPending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || chatMutation.isPending}
                className="m-3 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-5 pb-3 border-t border-border pt-2">
              <Info className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Research tool · Responses are AI-generated · Always validate with a qualified clinician
              </p>
            </div>
          </Card>
        </div>

        {/* RIGHT: Context panel */}
        <div className="w-72 shrink-0 space-y-4 overflow-y-auto">
          {/* About this tool */}
          <Card>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">About This Tool</p>
                <div className="space-y-3">
                  {[
                    { icon: FlaskConical, color: 'text-blue-500', label: 'Variant Interpretation', desc: 'Ask about specific predictions and what they mean' },
                    { icon: TrendingUp, color: 'text-purple-500', label: 'SHAP Explanation', desc: 'Understand which features drove each prediction' },
                    { icon: BookOpen, color: 'text-green-500', label: 'Scientific Education', desc: 'Learn about genomics, proteins, and mutations' },
                  ].map(({ icon: Icon, color, label, desc }) => (
                    <div key={label} className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 ${color} mt-0.5 shrink-0`} />
                      <div>
                        <p className="text-[13px] font-semibold">{label}</p>
                        <p className="text-[12px] text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Current level */}
          <Card>
            <div className="p-5">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Response Mode</p>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <p className="text-[15px] font-bold text-blue-700 dark:text-blue-400">{LEVEL_LABELS[readingLevel]}</p>
                <p className="text-[12px] text-blue-600 dark:text-blue-500 mt-1">
                  {readingLevel === 'simple'    && 'Plain language, no technical jargon'}
                  {readingLevel === 'standard'  && 'Clear explanations, terms defined'}
                  {readingLevel === 'detailed'  && 'In-depth with scientific context'}
                  {readingLevel === 'technical' && 'Full terminology and model details'}
                </p>
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">Change in the level selector above the chat.</p>
            </div>
          </Card>

          {/* Glossary quick ref */}
          <Card>
            <div className="p-5">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Quick Reference</p>
              <div className="space-y-2">
                {[
                  { term: 'Pathogenic', def: 'Likely to cause disease' },
                  { term: 'Benign', def: 'Unlikely to cause disease' },
                  { term: 'SHAP', def: 'Feature contribution score' },
                  { term: 'Confidence', def: "Model's certainty level" },
                  { term: 'Missense', def: 'Amino acid substitution' },
                  { term: 'Conserved', def: 'Unchanged across species' },
                ].map(({ term, def }) => (
                  <div key={term} className="flex justify-between items-baseline gap-2">
                    <span className="text-[13px] font-semibold shrink-0">{term}</span>
                    <span className="text-[12px] text-muted-foreground text-right">{def}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Safety */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                AI responses are informational only. Never make clinical decisions based solely on this tool.
                Consult a qualified clinician for medical interpretation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
