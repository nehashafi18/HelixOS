import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Activity, AlertTriangle, CheckCircle2,
  TrendingUp, Upload, ChevronRight, Dna
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { analyticsApi, reportsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Report } from '@/types'

const COLORS = { pathogenic: '#dc2626', benign: '#16a34a', primary: '#2563eb' }

function StatCard({
  label, value, sub, icon: Icon, accent, delay = 0
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
  delay?: number
}) {
  return (
    <div
      className="animate-fade-up bg-card border border-border rounded-lg p-5 hover:border-blue-500/40 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${accent}18` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[32px] font-bold tracking-tight leading-none text-foreground animate-count-up">
        {value}
      </p>
      {sub && <p className="text-[13px] text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

function PredictionBadge({ prediction }: { prediction: string }) {
  return prediction === 'Pathogenic'
    ? <span className="badge-pathogenic">Pathogenic</span>
    : <span className="badge-benign">Benign</span>
}

export function Dashboard() {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  })

  const { data: confidenceDist } = useQuery({
    queryKey: ['analytics', 'confidence'],
    queryFn: () => analyticsApi.confidence().then(r => r.data),
  })

  const { data: geneData } = useQuery({
    queryKey: ['analytics', 'genes'],
    queryFn: () => analyticsApi.genes(8).then(r => r.data),
  })

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then(r => r.data),
  })

  const pieData = stats ? [
    { name: 'Pathogenic', value: stats.pathogenic_count, color: COLORS.pathogenic },
    { name: 'Benign', value: stats.benign_count, color: COLORS.benign },
  ] : []

  const pathRate = stats && stats.total_variants > 0
    ? ((stats.pathogenic_count / stats.total_variants) * 100).toFixed(1)
    : '—'

  const avgConf = stats?.avg_confidence
    ? `${(stats.avg_confidence * 100).toFixed(1)}%`
    : '—'

  return (
    <Layout
      title="Dashboard"
      subtitle="Variant analysis overview"
      headerActions={
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-md transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Report
        </button>
      }
    >
      {/* Metric strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded mb-4" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Reports" value={stats?.total_reports ?? 0} sub="uploaded" icon={FileText} accent="#2563eb" delay={0} />
            <StatCard label="Variants" value={stats?.total_variants?.toLocaleString() ?? 0} sub="analyzed" icon={Dna} accent="#7c3aed" delay={40} />
            <StatCard label="Pathogenic Rate" value={`${pathRate}%`} sub="of all variants" icon={AlertTriangle} accent="#dc2626" delay={80} />
            <StatCard label="Avg Confidence" value={avgConf} sub="model certainty" icon={TrendingUp} accent="#0891b2" delay={120} />
          </>
        )}
      </div>

      {/* Main content: 3-col */}
      <div className="grid grid-cols-3 gap-5 mb-5">

        {/* Pathogenic split — 1 col */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Classification Split</CardTitle>
            {stats && (
              <p className="text-[13px] text-muted-foreground">{stats.total_variants?.toLocaleString()} total variants</p>
            )}
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-8 border-muted animate-pulse" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-around text-center mt-1">
                  <div>
                    <p className="text-[22px] font-bold text-red-600">{stats?.pathogenic_count ?? 0}</p>
                    <p className="text-[12px] text-muted-foreground">Pathogenic</p>
                  </div>
                  <div>
                    <p className="text-[22px] font-bold text-green-600">{stats?.benign_count ?? 0}</p>
                    <p className="text-[12px] text-muted-foreground">Benign</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Confidence distribution — 2 col */}
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Confidence Distribution</CardTitle>
            <p className="text-[13px] text-muted-foreground">Model confidence across all predictions</p>
          </CardHeader>
          <CardContent>
            {!confidenceDist ? (
              <div className="h-[208px] bg-muted animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <BarChart data={confidenceDist} margin={{ left: -15, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }}
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: gene chart + recent reports */}
      <div className="grid grid-cols-3 gap-5">

        {/* Top genes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Top Genes by Variants</CardTitle>
          </CardHeader>
          <CardContent>
            {!geneData ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-7 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {geneData.slice(0, 8).map((item: any, i: number) => {
                  const pct = geneData[0]?.count > 0 ? (item.count / geneData[0].count) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-semibold w-16 shrink-0 text-foreground truncate">{item.gene}</span>
                      <div className="flex-1 conf-bar-track">
                        <div className="h-full bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[12px] text-muted-foreground w-8 text-right shrink-0">{item.count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reports table */}
        <Card className="col-span-2">
          <CardHeader className="pb-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold">Recent Reports</CardTitle>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-1 text-[13px] text-blue-600 hover:text-blue-700 font-medium"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent className="pt-2">
            {reportsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !reports?.length ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-foreground">No reports yet</p>
                  <p className="text-[13px] text-muted-foreground mt-1">Upload a variant file to begin analysis</p>
                </div>
                <button
                  onClick={() => navigate('/reports')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-md transition-colors mt-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload your first report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Filename</th>
                      <th className="text-left">Date</th>
                      <th className="text-right">Variants</th>
                      <th className="text-right">Pathogenic</th>
                      <th className="text-right">Benign</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 7).map((report: Report) => (
                      <tr
                        key={report.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        <td className="font-mono text-[13px] max-w-[180px] truncate">{report.filename}</td>
                        <td className="text-muted-foreground">{formatDate(report.upload_date)}</td>
                        <td className="text-right font-semibold">{report.total_variants}</td>
                        <td className="text-right font-semibold text-red-600">{report.pathogenic_count}</td>
                        <td className="text-right font-semibold text-green-600">{report.benign_count}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded ${
                            report.status === 'completed'
                              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}>
                            {report.status === 'completed'
                              ? <CheckCircle2 className="h-3 w-3" />
                              : <Activity className="h-3 w-3" />
                            }
                            {report.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
