import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 flex items-center justify-between px-7 border-b border-border bg-background/98 backdrop-blur sticky top-0 z-20">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-none">{title}</h1>
        {subtitle && (
          <span className="text-[14px] text-muted-foreground font-normal hidden sm:inline">{subtitle}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
