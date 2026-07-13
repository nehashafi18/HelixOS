import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dna, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (type: 'researcher' | 'admin') => {
    if (type === 'researcher') {
      setEmail('researcher@demo.com')
      setPassword('demo123')
    } else {
      setEmail('admin@demo.com')
      setPassword('admin123')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10" style={{ background: '#0d1117' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Dna className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white text-[17px]">HelixOS</span>
        </div>

        <div>
          <p className="text-[28px] font-bold text-white leading-tight mb-4">
            Precision genomic analysis for clinical researchers.
          </p>
          <div className="space-y-3">
            {[
              'Random Forest pathogenicity classification',
              'SHAP-powered feature explainability',
              'ClinVar variant format support',
              'Structured clinical research reports',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <p className="text-[14px]" style={{ color: '#8b949e' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px]" style={{ color: '#484f58' }}>
          For research use only. Not a substitute for clinical diagnosis.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Dna className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[17px]">HelixOS</span>
          </div>

          <h1 className="text-[28px] font-bold mb-1">Sign in</h1>
          <p className="text-[15px] text-muted-foreground mb-7">Enter your credentials to access your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[14px] font-semibold">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@institution.edu"
                required
                className="h-11 text-[15px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[14px] font-semibold">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 text-[15px] pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[14px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-[15px] font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Demo Accounts</p>
            <div className="space-y-2">
              <button
                onClick={() => fillDemo('researcher')}
                className="w-full text-left px-4 py-3 rounded-lg bg-card border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <p className="text-[14px] font-semibold">Researcher</p>
                <p className="text-[12px] text-muted-foreground font-mono mt-0.5">researcher@demo.com · demo123</p>
              </button>
              <button
                onClick={() => fillDemo('admin')}
                className="w-full text-left px-4 py-3 rounded-lg bg-card border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <p className="text-[14px] font-semibold">Administrator</p>
                <p className="text-[12px] text-muted-foreground font-mono mt-0.5">admin@demo.com · admin123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
