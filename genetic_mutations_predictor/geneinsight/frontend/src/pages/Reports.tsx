import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, Download, ChevronRight,
  CheckCircle2, Activity, AlertTriangle, Dna
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/shared/Toast'
import { reportsApi, samplesApi } from '@/lib/api'
import { formatDate, formatFileSize } from '@/lib/utils'
import { Report } from '@/types'

export function Reports() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then(r => r.data),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(10)
      const timer = setInterval(() => {
        setUploadProgress(p => Math.min(p + 8, 85))
      }, 350)
      try {
        const result = await reportsApi.upload(file)
        clearInterval(timer)
        setUploadProgress(100)
        return result.data
      } catch (err) {
        clearInterval(timer)
        throw err
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast({ type: 'success', title: 'Analysis complete', description: `${data.total_variants} variants processed` })
      setSelectedFile(null)
      setUploadProgress(0)
    },
    onError: (err: any) => {
      toast({ type: 'error', title: 'Upload failed', description: err.response?.data?.detail || 'Something went wrong' })
      setUploadProgress(0)
    },
  })

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setSelectedFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  })

  const handleDownloadSample = async (size: 'small' | 'medium' | 'large') => {
    try {
      const res = await samplesApi.download(size)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `sample_${size}.csv`
      a.click()
    } catch {
      toast({ type: 'error', title: 'Download failed' })
    }
  }

  return (
    <Layout title="Variant Reports" subtitle="Upload and manage variant analysis files">
      <div className="grid grid-cols-3 gap-5">

        {/* Upload panel */}
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold">Upload Variant File</CardTitle>
              <p className="text-[13px] text-muted-foreground">CSV, TSV, or Excel · ClinVar format supported</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                  ${isDragActive
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-border hover:border-blue-500/60 hover:bg-muted/30'}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Upload className={`h-5 w-5 ${isDragActive ? 'text-blue-600' : 'text-blue-500'}`} />
                  </div>
                  {isDragActive ? (
                    <p className="text-[14px] font-semibold text-blue-600">Drop to upload</p>
                  ) : (
                    <div>
                      <p className="text-[14px] font-semibold">Drop file here</p>
                      <p className="text-[13px] text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedFile && (
                <div className="animate-fade-up">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border mb-3">
                    <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{selectedFile.name}</p>
                      <p className="text-[12px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>

                  {uploadMutation.isPending && (
                    <div className="mb-3 space-y-1.5">
                      <div className="flex justify-between text-[12px] text-muted-foreground">
                        <span>Running pathogenicity analysis…</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    onClick={() => uploadMutation.mutate(selectedFile)}
                    disabled={uploadMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-[14px] font-semibold"
                  >
                    {uploadMutation.isPending ? 'Analyzing…' : 'Run Analysis'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sample files */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-semibold">Sample Files</CardTitle>
              <p className="text-[12px] text-muted-foreground">Test with synthetic variant data</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {([
                { size: 'small', label: '20 variants', desc: 'Quick test' },
                { size: 'medium', label: '50 variants', desc: 'Standard demo' },
                { size: 'large', label: '100 variants', desc: 'Full dataset' },
              ] as const).map(({ size, label, desc }) => (
                <button
                  key={size}
                  onClick={() => handleDownloadSample(size)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-md border border-border hover:bg-accent hover:border-blue-500/40 transition-all text-left"
                >
                  <div>
                    <p className="text-[13px] font-semibold">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Format guide */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-semibold">Required Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {[
                  { col: 'Name', desc: 'HGVS protein notation' },
                  { col: 'GeneSymbol', desc: 'Gene identifier' },
                  { col: 'Type', desc: 'Variant type' },
                  { col: 'OriginSimple', desc: 'germline / somatic' },
                ].map(({ col, desc }) => (
                  <div key={col} className="flex items-start gap-2">
                    <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono shrink-0 text-blue-600 dark:text-blue-400">{col}</code>
                    <span className="text-[12px] text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports table */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] font-semibold">All Reports</CardTitle>
                  {reports && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : !reports?.length ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Dna className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-[17px] font-bold text-foreground">No reports yet</p>
                    <p className="text-[14px] text-muted-foreground mt-1 max-w-[280px]">
                      Upload a variant file using the panel on the left to begin pathogenicity analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left pl-6">Filename</th>
                        <th className="text-left">Uploaded</th>
                        <th className="text-right">Variants</th>
                        <th className="text-right">Pathogenic</th>
                        <th className="text-right">Benign</th>
                        <th className="text-right">Rate</th>
                        <th className="text-left">Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report: Report) => {
                        const rate = report.total_variants > 0
                          ? ((report.pathogenic_count / report.total_variants) * 100).toFixed(0)
                          : '0'
                        return (
                          <tr
                            key={report.id}
                            className="cursor-pointer"
                            onClick={() => navigate(`/reports/${report.id}`)}
                          >
                            <td className="pl-6">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-mono text-[13px] font-medium max-w-[160px] truncate">{report.filename}</span>
                              </div>
                            </td>
                            <td className="text-muted-foreground">{formatDate(report.upload_date)}</td>
                            <td className="text-right font-semibold">{report.total_variants}</td>
                            <td className="text-right font-bold text-red-600">{report.pathogenic_count}</td>
                            <td className="text-right font-bold text-green-600">{report.benign_count}</td>
                            <td className="text-right">
                              <span className={`font-bold ${Number(rate) > 50 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                {rate}%
                              </span>
                            </td>
                            <td>
                              <span className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded ${
                                report.status === 'completed'
                                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {report.status === 'completed'
                                  ? <CheckCircle2 className="h-3 w-3" />
                                  : <Activity className="h-3 w-3 animate-spin" />
                                }
                                {report.status}
                              </span>
                            </td>
                            <td>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
