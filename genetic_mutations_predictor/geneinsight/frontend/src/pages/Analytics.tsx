import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton'
import { analyticsApi } from '@/lib/api'

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }

export function Analytics() {
  const { data: genes, isLoading: genesLoading } = useQuery({
    queryKey: ['analytics', 'genes'],
    queryFn: () => analyticsApi.genes(12).then(r => r.data),
  })

  const { data: confidence, isLoading: confLoading } = useQuery({
    queryKey: ['analytics', 'confidence'],
    queryFn: () => analyticsApi.confidence().then(r => r.data),
  })

  const { data: features, isLoading: featLoading } = useQuery({
    queryKey: ['analytics', 'features'],
    queryFn: () => analyticsApi.features().then(r => r.data),
  })

  return (
    <Layout title="Analytics" subtitle="Insights across all your variant reports">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Top genes */}
          <motion.div {...fadeIn} transition={{ delay: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Genes by Variant Count</CardTitle>
              </CardHeader>
              <CardContent>
                {genesLoading ? (
                  <ChartSkeleton height={280} />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={genes} layout="vertical" margin={{ left: 50, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={AXIS_STYLE} />
                      <YAxis dataKey="gene" type="category" tick={AXIS_STYLE} width={45} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pathogenic vs Benign by gene */}
          <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pathogenicity by Gene</CardTitle>
              </CardHeader>
              <CardContent>
                {genesLoading ? (
                  <ChartSkeleton height={280} />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={genes?.slice(0, 8)} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="gene" tick={AXIS_STYLE} />
                      <YAxis tick={AXIS_STYLE} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend
                        formatter={v => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v}</span>}
                      />
                      <Bar dataKey="pathogenic" name="Pathogenic" fill="#ef4444" stackId="a" />
                      <Bar dataKey="benign" name="Benign" fill="#22c55e" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Confidence histogram */}
          <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Confidence Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {confLoading ? (
                  <ChartSkeleton height={240} />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={confidence} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={AXIS_STYLE} />
                      <YAxis tick={AXIS_STYLE} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {confidence?.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'][i] || '#6366f1'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Feature importance */}
          <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Average Feature Importance (SHAP)</CardTitle>
              </CardHeader>
              <CardContent>
                {featLoading ? (
                  <ChartSkeleton height={240} />
                ) : !features?.length ? (
                  <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
                    Upload reports with SHAP values to see feature importance.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={features?.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 150, right: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={AXIS_STYLE} />
                      <YAxis dataKey="feature" type="category" tick={AXIS_STYLE} width={145} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toFixed(4), 'Importance']} />
                      <Bar dataKey="importance" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}
