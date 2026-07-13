import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatConfidence(confidence: number | null): string {
  if (confidence === null || confidence === undefined) return 'N/A'
  return `${(confidence * 100).toFixed(1)}%`
}

export function getConfidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-zinc-400'
  const pct = confidence * 100
  if (pct >= 90) return 'text-red-500'
  if (pct >= 75) return 'text-orange-500'
  if (pct >= 60) return 'text-yellow-500'
  return 'text-green-500'
}

export function getPredictionColor(prediction: string | null): string {
  if (prediction === 'Pathogenic') return 'text-red-500'
  if (prediction === 'Benign') return 'text-green-500'
  return 'text-zinc-400'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}
