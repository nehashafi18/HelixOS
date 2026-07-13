import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Filter, BookOpen, Download } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchInput } from '@/components/shared/SearchInput'
import { ConfidenceBar } from '@/components/shared/ConfidenceBar'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { reportsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { VariantListItem } from '@/types'
import { exportReportPDF } from '@/lib/pdfExport'

export function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [prediction, setPrediction] = useState('all')
  const [page, setPage] = useState(1)

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(Number(id)).then(r => r.data),
    enabled: !!id,
  })

  const { data: variantData, isLoading } = useQuery({
    queryKey: ['report-variants', id, search, prediction, page],
    queryFn: () =>
      reportsApi
        .getVariants(Number(id), {
          page,
          page_size: 20,
          search: search || undefined,
          prediction: prediction === 'all' ? undefined : prediction,
        })
        .then(r => r.data),
    enabled: !!id,
  })

  const handleExportPDF = async () => {
    if (!report) return
    // Fetch all variants (no pagination) for full export
    const allVariants = await reportsApi
      .getVariants(Number(id), { page: 1, page_size: 1000 })
      .then(r => r.data.items)
    exportReportPDF({
      filename: report.filename,
      upload_date: report.upload_date,
      total_variants: report.total_variants,
      pathogenic_count: report.pathogenic_count,
      benign_count: report.benign_count,
      status: report.status,
      variants: allVariants,
    })
  }

  return (
    <Layout
      title={report?.filename || 'Report Detail'}
      subtitle={report ? formatDate(report.upload_date) : ''}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/reports/${id}/summary`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-accent transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Accessible Summary
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!report}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:bg-accent transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <ModeToggle />
        </div>
      }
    >
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </Button>

        {/* Summary */}
        {report && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Variants', value: report.total_variants, color: 'text-foreground' },
              { label: 'Pathogenic', value: report.pathogenic_count, color: 'text-red-500' },
              { label: 'Benign', value: report.benign_count, color: 'text-green-500' },
              { label: 'Status', value: report.status, color: 'text-muted-foreground', badge: true },
            ].map(({ label, value, color, badge }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {badge ? (
                    <Badge variant={value as any} className="mt-1">{value}</Badge>
                  ) : (
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Variants table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm">Variants</CardTitle>
              <div className="flex items-center gap-2">
                <SearchInput
                  value={search}
                  onChange={v => { setSearch(v); setPage(1) }}
                  placeholder="Search gene or variant..."
                  className="w-52"
                />
                <Select value={prediction} onValueChange={v => { setPrediction(v); setPage(1) }}>
                  <SelectTrigger className="w-36">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Pathogenic">Pathogenic</SelectItem>
                    <SelectItem value="Benign">Benign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Gene</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Variant</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Prediction</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground w-40">Confidence</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">ClinSig</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantData?.items.map((v: VariantListItem) => (
                      <tr
                        key={v.id}
                        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/variants/${v.id}`)}
                      >
                        <td className="py-3 font-semibold text-xs text-indigo-400">{v.gene || '—'}</td>
                        <td className="py-3 font-mono text-xs">
                          {v.original_aa && v.new_aa
                            ? `${v.original_aa}${v.position}${v.new_aa}`
                            : v.name || '—'}
                        </td>
                        <td className="py-3">
                          <Badge variant={v.prediction?.toLowerCase() as any}>{v.prediction}</Badge>
                        </td>
                        <td className="py-3 w-40">
                          <ConfidenceBar confidence={v.confidence} />
                        </td>
                        <td className="py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                          {v.clinical_significance || '—'}
                        </td>
                        <td className="py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {variantData && variantData.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {(page - 1) * 20 + 1}–{Math.min(page * 20, variantData.total)} of {variantData.total}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= variantData.pages} onClick={() => setPage(p => p + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
