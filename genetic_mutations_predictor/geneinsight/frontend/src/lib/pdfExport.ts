/**
 * PDF report generator for HelixOS.
 * Uses jsPDF core API only (no autotable) to avoid CJS/ESM interop issues.
 */
import { jsPDF } from 'jspdf'

// ── Palette ───────────────────────────────────────────────────────────────────
type RGB = [number, number, number]
const NAVY:  RGB = [13,  17,  23]
const BLUE:  RGB = [37,  99,  235]
const RED:   RGB = [220, 38,  38]
const GREEN: RGB = [22,  163, 74]
const AMBER: RGB = [217, 119, 6]
const GRAY:  RGB = [107, 114, 128]
const LGRAY: RGB = [229, 231, 235]
const MGRAY: RGB = [243, 244, 246]
const WHITE: RGB = [255, 255, 255]
const DARK:  RGB = [17,  24,  39]

// ── Low-level helpers ─────────────────────────────────────────────────────────
function fill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]) }
function stroke(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]) }
function text(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]) }

const W = 210   // A4 width mm
const H = 297   // A4 height mm
const ML = 14   // margin left
const MR = 14   // margin right
const CW = W - ML - MR  // content width

// ── Page decoration ───────────────────────────────────────────────────────────
function drawSidebar(doc: jsPDF) {
  fill(doc, NAVY)
  doc.rect(0, 0, 5, H, 'F')
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  drawSidebar(doc)

  // Logo pill
  fill(doc, BLUE)
  doc.roundedRect(ML, 10, 28, 9, 1.5, 1.5, 'F')
  text(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('HelixOS', ML + 4, 16)

  // Title
  text(doc, DARK)
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.text(title, ML + 32, 16)

  // Subtitle
  text(doc, GRAY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(subtitle, ML + 32, 22)

  // Date right-aligned
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), W - MR, 22, { align: 'right' })

  // Divider
  stroke(doc, LGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML, 26, W - MR, 26)

  // Disclaimer
  text(doc, AMBER)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('RESEARCH USE ONLY — Not for clinical decision-making. Consult a qualified clinician.', ML, 31)
}

function drawFooter(doc: jsPDF, page: number, total: number) {
  stroke(doc, LGRAY)
  doc.setLineWidth(0.3)
  doc.line(ML, H - 10, W - MR, H - 10)
  text(doc, GRAY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('HelixOS — Genetic Variant Analysis Platform — Research Tool Only', ML, H - 6)
  doc.text(`Page ${page} of ${total}`, W - MR, H - 6, { align: 'right' })
}

function sectionTitle(doc: jsPDF, y: number, label: string): number {
  text(doc, BLUE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(label, ML, y)
  stroke(doc, BLUE)
  doc.setLineWidth(0.4)
  doc.line(ML, y + 1, W - MR, y + 1)
  return y + 7
}

// Manual table renderer — returns final Y
function drawTable(
  doc: jsPDF,
  y: number,
  headers: string[],
  rows: string[][],
  colWidths?: number[],
  opts?: { pageBreakY?: number }
): number {
  const rowH = 7
  const headH = 7.5
  const pageBreakAt = opts?.pageBreakY ?? H - 20
  const cols = headers.length
  const totalW = CW
  const widths = colWidths ?? headers.map(() => totalW / cols)

  // Header row
  fill(doc, NAVY)
  doc.rect(ML, y, totalW, headH, 'F')
  text(doc, WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  let x = ML
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 5)
    x += widths[i]
  })
  y += headH

  // Body rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  rows.forEach((row, ri) => {
    if (y + rowH > pageBreakAt) {
      doc.addPage()
      drawSidebar(doc)
      y = 20
      // Repeat header
      fill(doc, NAVY)
      doc.rect(ML, y, totalW, headH, 'F')
      text(doc, WHITE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      let xh = ML
      headers.forEach((h, i) => {
        doc.text(h, xh + 2, y + 5)
        xh += widths[i]
      })
      y += headH
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
    }

    // Alternating row background
    if (ri % 2 === 0) {
      fill(doc, MGRAY)
      doc.rect(ML, y, totalW, rowH, 'F')
    }

    text(doc, DARK)
    let cx = ML
    row.forEach((cell, ci) => {
      const maxW = widths[ci] - 4
      const truncated = doc.splitTextToSize(cell, maxW)[0] ?? ''
      // Colour coding for prediction column
      if (headers[ci] === 'Prediction' || headers[ci] === 'Direction') {
        if (cell === 'Pathogenic' || cell.startsWith('↑')) text(doc, RED)
        else if (cell === 'Benign' || cell.startsWith('↓')) text(doc, GREEN)
        else text(doc, DARK)
        doc.setFont('helvetica', 'bold')
        doc.text(truncated, cx + 2, y + 5)
        doc.setFont('helvetica', 'normal')
        text(doc, DARK)
      } else {
        doc.text(truncated, cx + 2, y + 5)
      }
      cx += widths[ci]
    })

    // Row border
    stroke(doc, LGRAY)
    doc.setLineWidth(0.1)
    doc.line(ML, y + rowH, ML + totalW, y + rowH)
    y += rowH
  })

  return y + 4
}

// ── Report-level PDF ──────────────────────────────────────────────────────────
export interface ReportPDFData {
  filename: string
  upload_date: string
  total_variants: number
  pathogenic_count: number
  benign_count: number
  status: string
  variants: {
    gene: string
    original_aa: string
    position: number
    new_aa: string
    prediction: string
    confidence: number
    clinical_significance: string
    variant_type: string
  }[]
}

export function exportReportPDF(data: ReportPDFData) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })

    // Page 1
    drawHeader(doc, 'Variant Analysis Report', data.filename)
    let y = 37

    // Stats row
    y = sectionTitle(doc, y, 'Report Summary')
    const stats = [
      { label: 'Total Variants', value: String(data.total_variants), color: DARK },
      { label: 'Pathogenic',     value: String(data.pathogenic_count), color: RED },
      { label: 'Benign',         value: String(data.benign_count),     color: GREEN },
      { label: 'Status',         value: data.status,                   color: GRAY },
    ]
    const boxW = CW / stats.length
    stats.forEach(({ label, value, color }, i) => {
      const bx = ML + i * boxW
      fill(doc, MGRAY)
      doc.roundedRect(bx, y, boxW - 3, 18, 2, 2, 'F')
      text(doc, color as RGB)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(value, bx + (boxW - 3) / 2, y + 11, { align: 'center' })
      text(doc, GRAY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(label, bx + (boxW - 3) / 2, y + 16.5, { align: 'center' })
    })
    y += 24

    // Meta
    text(doc, GRAY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const pathPct = data.total_variants > 0 ? (data.pathogenic_count / data.total_variants * 100).toFixed(1) : '0'
    doc.text(`Uploaded: ${new Date(data.upload_date).toLocaleDateString()}   ·   Pathogenicity split: ${pathPct}% pathogenic`, ML, y)
    y += 8

    // Variant table
    y = sectionTitle(doc, y, 'Variant List')
    const headers = ['Gene', 'Variant', 'Type', 'Prediction', 'Conf.', 'Clinical Significance']
    const colWidths = [22, 24, 32, 28, 16, CW - 22 - 24 - 32 - 28 - 16]
    const rows = data.variants.map(v => [
      v.gene || '—',
      v.original_aa && v.position ? `${v.original_aa}${v.position}${v.new_aa}` : '—',
      v.variant_type || '—',
      v.prediction || '—',
      v.confidence != null ? `${Math.round(v.confidence * 100)}%` : '—',
      v.clinical_significance || '—',
    ])
    y = drawTable(doc, y, headers, rows, colWidths)

    // Footers on all pages
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      drawFooter(doc, p, total)
    }

    doc.save(`HelixOS_Report_${data.filename.replace(/[^a-z0-9]/gi, '_')}.pdf`)
  } catch (err) {
    console.error('PDF export error:', err)
    throw err
  }
}

// ── Variant-level PDF ─────────────────────────────────────────────────────────
export interface VariantPDFData {
  gene: string
  original_aa: string
  position: number
  new_aa: string
  prediction: string
  confidence: number
  clinical_significance: string
  variant_type: string
  origin: string
  explanation: string
  features: Record<string, number | string>
  shap_values?: Record<string, number>
}

export function exportVariantPDF(variant: VariantPDFData) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const varName = `${variant.original_aa}${variant.position}${variant.new_aa}`
    const isPath = variant.prediction === 'Pathogenic'
    const conf   = Math.round((variant.confidence || 0) * 100)
    const predColor: RGB = isPath ? RED : GREEN

    drawHeader(doc, `${variant.gene} · ${varName}`, 'Variant Pathogenicity Report')
    let y = 37

    // Prediction hero card
    fill(doc, isPath ? [254, 242, 242] : [240, 253, 244])
    doc.roundedRect(ML, y, CW, 22, 2, 2, 'F')
    fill(doc, predColor)
    doc.rect(ML, y, 3, 22, 'F')
    text(doc, predColor)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(varName, ML + 7, y + 10)
    doc.setFontSize(10)
    doc.text(variant.prediction, ML + 7, y + 18)

    // Confidence right side
    doc.setFontSize(22)
    doc.text(`${conf}%`, W - MR, y + 12, { align: 'right' })
    text(doc, GRAY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Model Confidence', W - MR, y + 19, { align: 'right' })

    text(doc, GRAY)
    doc.setFontSize(8)
    doc.text(`${variant.gene}  ·  ${variant.variant_type || ''}  ·  ${variant.origin || ''}`, W - MR, y + 8, { align: 'right' })
    y += 28

    // Metadata table
    y = sectionTitle(doc, y, 'Variant Details')
    const metaRows = [
      ['Gene', variant.gene],
      ['Variant', varName],
      ['Type', variant.variant_type || '—'],
      ['Origin', variant.origin || '—'],
      ['Clinical Significance', variant.clinical_significance || '—'],
    ]
    y = drawTable(doc, y, ['Field', 'Value'], metaRows, [50, CW - 50])

    // Explanation
    if (variant.explanation) {
      y = sectionTitle(doc, y, 'Model Explanation')
      text(doc, DARK)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(variant.explanation, CW)
      doc.text(lines, ML, y)
      y += lines.length * 4.5 + 6
    }

    // Biochemical features
    const featEntries = Object.entries(variant.features || {})
    if (featEntries.length > 0) {
      y = sectionTitle(doc, y, 'Biochemical Features')
      const featRows = featEntries.map(([k, v]) => [k, String(v)])
      y = drawTable(doc, y, ['Feature', 'Value'], featRows, [90, CW - 90])
    }

    // SHAP values
    const shapEntries = Object.entries(variant.shap_values || {})
      .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
      .slice(0, 12)
    if (shapEntries.length > 0) {
      y = sectionTitle(doc, y, 'SHAP Feature Contributions')
      const shapRows = shapEntries.map(([k, v]) => [
        k,
        Number(v) > 0 ? `+${Number(v).toFixed(5)}` : Number(v).toFixed(5),
        Number(v) > 0 ? '↑ Pathogenic' : '↓ Benign',
      ])
      y = drawTable(doc, y, ['Feature', 'SHAP Value', 'Direction'], shapRows, [80, 50, CW - 130])
    }

    // Footers
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      drawFooter(doc, p, total)
    }

    doc.save(`HelixOS_${variant.gene}_${varName}.pdf`)
  } catch (err) {
    console.error('PDF export error:', err)
    throw err
  }
}
