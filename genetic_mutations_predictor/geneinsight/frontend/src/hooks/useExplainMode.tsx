import { createContext, useContext, useState, useEffect } from 'react'

export type ReadingLevel = 'simple' | 'standard' | 'detailed' | 'technical'

interface ExplainModeState {
  explainMode: boolean
  readingLevel: ReadingLevel
  largeText: boolean
  highContrast: boolean
  speechEnabled: boolean
  toggleExplainMode: () => void
  setReadingLevel: (level: ReadingLevel) => void
  setLargeText: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setSpeechEnabled: (v: boolean) => void
  speak: (text: string) => void
}

const Ctx = createContext<ExplainModeState | null>(null)

function ls<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : def
  } catch {
    return def
  }
}

export function ExplainModeProvider({ children }: { children: React.ReactNode }) {
  const [explainMode, _setExplainMode] = useState(() => ls('hx_explain', false))
  const [readingLevel, _setReadingLevel] = useState<ReadingLevel>(() => ls('hx_level', 'detailed'))
  const [largeText, _setLargeText] = useState(() => ls('hx_large', false))
  const [highContrast, _setHighContrast] = useState(() => ls('hx_hc', false))
  const [speechEnabled, _setSpeechEnabled] = useState(() => ls('hx_speech', false))

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText)
  }, [largeText])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  const set = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, key: string) =>
    (v: T) => {
      setter(v)
      localStorage.setItem(key, JSON.stringify(v))
    }

  const speak = (text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.9
    utt.lang = 'en-US'
    window.speechSynthesis.speak(utt)
  }

  return (
    <Ctx.Provider value={{
      explainMode,
      readingLevel,
      largeText,
      highContrast,
      speechEnabled,
      toggleExplainMode: () => set(_setExplainMode, 'hx_explain')(!explainMode),
      setReadingLevel: set(_setReadingLevel, 'hx_level'),
      setLargeText: set(_setLargeText, 'hx_large'),
      setHighContrast: set(_setHighContrast, 'hx_hc'),
      setSpeechEnabled: set(_setSpeechEnabled, 'hx_speech'),
      speak,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useExplainMode() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useExplainMode must be inside ExplainModeProvider')
  return ctx
}
