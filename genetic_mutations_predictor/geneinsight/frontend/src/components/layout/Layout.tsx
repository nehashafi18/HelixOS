import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  headerActions?: React.ReactNode
}

export function Layout({ children, title, subtitle, headerActions }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <Header title={title} subtitle={subtitle} actions={headerActions} />
        <main className="flex-1 p-7 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
