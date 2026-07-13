import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Microscope, BarChart3,
  MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight,
  Dna, Library
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

const navGroups = [
  {
    label: 'Analysis',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/reports', icon: FileText, label: 'Reports' },
      { path: '/predictions', icon: Microscope, label: 'Predictions' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/analytics', icon: BarChart3, label: 'Analytics' },
      { path: '/assistant', icon: MessageSquare, label: 'Research Assistant' },
      { path: '/demo', icon: Library, label: 'Demo Library' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const location = useLocation()
  const isDark = theme === 'dark'

  return (
    <aside
      className={cn(
        'sidebar fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-300 select-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'sidebar-logo flex items-center h-14 px-4 shrink-0',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
          <Dna className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className={cn('font-bold tracking-tight text-[15px]', isDark ? 'text-white' : 'text-gray-900')}>HelixOS</span>
            <span className={cn('block text-[10px] font-medium leading-none mt-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>Variant Analysis</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className={cn('px-3 mb-1 text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-[#484f58]' : 'text-gray-400')}>
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ path, icon: Icon, label }) => {
                const isActive = path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)

                return (
                  <NavLink
                    key={path}
                    to={path}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'sidebar-nav-item flex items-center gap-3 px-3 py-2.5 w-full',
                      isActive && 'active',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer px-2 py-2 space-y-0.5 shrink-0">
        {!collapsed && user && (
          <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-md', isDark ? 'text-[#8b949e]' : 'text-gray-500')}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white bg-blue-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={cn('text-[13px] font-semibold truncate', isDark ? 'text-[#e6edf3]' : 'text-gray-800')}>{user.name}</p>
              <p className={cn('text-[11px] capitalize', isDark ? 'text-[#6e7681]' : 'text-gray-400')}>{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'sidebar-nav-item flex items-center gap-3 w-full px-3 py-2.5',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'sidebar-nav-item flex items-center gap-3 w-full px-3 py-2.5',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  )
}
