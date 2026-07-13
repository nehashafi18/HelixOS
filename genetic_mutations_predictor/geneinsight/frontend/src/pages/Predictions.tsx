import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Brain, ChevronRight, Filter } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/shared/SearchInput'
import { ConfidenceBar } from '@/components/shared/ConfidenceBar'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { variantsApi } from '@/lib/api'
import { VariantListItem } from '@/types'

export function Predictions() {
  const [search, setSearch] = useState('')
  const [prediction, setPrediction] = useState<string>('all')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['variants', 'search', search, prediction, page],
    queryFn: () =>
      variantsApi
        .search({
          q: search || undefined,
          prediction: prediction === 'all' ? undefined : prediction,
          page,
          page_size: 20,
        })
        .then(r => r.data),
  })

  return (
    <Layout title="Predictions" subtitle="Browse all variant predictions across reports">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm">All Variant Predictions</CardTitle>
            <div className="flex items-center gap-2">
              <SearchInput
                value={search}
                onChange={v => { setSearch(v); setPage(1) }}
                placeholder="Search by gene or variant..."
                className="w-64"
              />
              <Select
                value={prediction}
                onValueChange={v => { setPrediction(v); setPage(1) }}
              >
                <SelectTrigger className="w-36">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All predictions</SelectItem>
                  <SelectItem value="Pathogenic">Pathogenic</SelectItem>
                  <SelectItem value="Benign">Benign</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : !data?.items.length ? (
            <EmptyState
              icon={Brain}
              title="No predictions found"
              description="Upload a report to see variant predictions here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Gene</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Variant</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Prediction</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground w-40">Confidence</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Origin</th>
                      <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((v: VariantListItem) => (
                      <tr
                        key={v.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/variants/${v.id}`)}
                      >
                        <td className="py-3 font-semibold text-xs text-indigo-400">{v.gene || '—'}</td>
                        <td className="py-3 font-mono text-xs">
                          {v.original_aa && v.new_aa
                            ? `${v.original_aa}${v.position}${v.new_aa}`
                            : v.name || '—'}
                        </td>
                        <td className="py-3">
                          <Badge variant={v.prediction?.toLowerCase() as any}>
                            {v.prediction || '—'}
                          </Badge>
                        </td>
                        <td className="py-3 w-40">
                          <ConfidenceBar confidence={v.confidence} />
                        </td>
                        <td className="py-3 text-xs text-muted-foreground capitalize">—</td>
                        <td className="py-3">
                          <Badge variant={v.review_status as any}>{v.review_status}</Badge>
                        </td>
                        <td className="py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}
