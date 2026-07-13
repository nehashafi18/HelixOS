import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useExplainMode, ReadingLevel } from '@/hooks/useExplainMode'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sun, Moon, User, Shield, Download, Accessibility,
  Type, Contrast, Volume2, Check, BookOpen
} from 'lucide-react'
import { samplesApi } from '@/lib/api'
import { useToast } from '@/components/shared/Toast'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-muted-foreground/30'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}

const READING_LEVELS: { value: ReadingLevel; label: string; desc: string }[] = [
  { value: 'simple',    label: 'Simple',    desc: 'Plain language, no technical terms' },
  { value: 'standard',  label: 'Standard',  desc: 'Some background assumed, clear explanations' },
  { value: 'detailed',  label: 'Detailed',  desc: 'In-depth with scientific context' },
  { value: 'technical', label: 'Technical', desc: 'Full terminology and model details' },
]

export function Settings() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const {
    readingLevel, setReadingLevel,
    largeText, setLargeText,
    highContrast, setHighContrast,
    speechEnabled, setSpeechEnabled,
  } = useExplainMode()

  const handleDownload = async (size: 'small' | 'medium' | 'large') => {
    try {
      const res = await samplesApi.download(size)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${size}_sample.csv`
      a.click()
      toast({ type: 'success', title: 'Sample downloaded' })
    } catch {
      toast({ type: 'error', title: 'Download failed' })
    }
  }

  return (
    <Layout title="Settings" subtitle="Account and accessibility preferences">
      <div className="max-w-2xl space-y-5">

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <User className="h-4 w-4" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name', value: user?.name },
                { label: 'Email', value: user?.email },
                { label: 'Role', value: user?.role },
                { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[12px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-[15px] font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-border">
              <Button variant="destructive" size="sm" onClick={logout}>Sign out</Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Appearance
            </CardTitle>
            <CardDescription>Display and color preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[15px] font-medium">Color Theme</p>
                <p className="text-[13px] text-muted-foreground">Currently using {theme} mode</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <Accessibility className="h-4 w-4" /> Accessibility
            </CardTitle>
            <CardDescription>Adjust the interface for your needs. Changes apply immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-border">
            {[
              {
                icon: Type,
                label: 'Large Text Mode',
                desc: 'Increases all text sizes by ~15% for better readability',
                checked: largeText,
                onChange: setLargeText,
              },
              {
                icon: Contrast,
                label: 'High Contrast Mode',
                desc: 'Increases color contrast for easier reading',
                checked: highContrast,
                onChange: setHighContrast,
              },
              {
                icon: Volume2,
                label: 'Text-to-Speech',
                desc: 'Enables read-aloud buttons on explanations in Explain Mode',
                checked: speechEnabled,
                onChange: setSpeechEnabled,
              },
            ].map(({ icon: Icon, label, desc, checked, onChange }) => (
              <div key={label} className="flex items-center justify-between py-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${checked ? 'text-blue-600' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-[15px] font-medium">{label}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
                <Toggle checked={checked} onChange={onChange} label={label} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reading Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Reading Level
            </CardTitle>
            <CardDescription>
              Adjusts the complexity of AI explanations and Explain Mode content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {READING_LEVELS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setReadingLevel(value)}
                  className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all ${
                    readingLevel === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-border hover:border-blue-500/40 hover:bg-muted/30'
                  }`}
                >
                  <div>
                    <p className={`text-[14px] font-bold ${readingLevel === value ? 'text-blue-700 dark:text-blue-400' : ''}`}>
                      {label}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {readingLevel === value && (
                    <Check className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sample data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <Download className="h-4 w-4" /> Sample Data
            </CardTitle>
            <CardDescription>Download synthetic variant files for testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map(size => (
                <Button key={size} variant="outline" size="sm" onClick={() => handleDownload(size)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {size === 'small' ? '20' : size === 'medium' ? '50' : '100'} variants
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] flex items-center gap-2">
              <Shield className="h-4 w-4" /> About HelixOS
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[14px] text-muted-foreground space-y-2 leading-relaxed">
            <p>HelixOS uses a Random Forest model trained on ClinVar genetic variant data to classify variants as pathogenic or benign.</p>
            <p>Features analyzed include amino acid hydrophobicity, charge, polarity, and size changes. SHAP values explain each prediction.</p>
            <p>For research and educational purposes only. Not a medical device.</p>
            <div className="pt-3 border-t border-border text-[12px]">
              <p>Version 1.0.0 · HelixOS Platform</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
