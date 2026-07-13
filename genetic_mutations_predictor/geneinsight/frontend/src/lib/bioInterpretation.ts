/**
 * Translates raw ML feature values into human-readable biological explanations.
 * The ML model generates numerical features; this layer converts them to meaning.
 */

export type ImpactLevel = 'high' | 'moderate' | 'low' | 'none'

export interface BiologicalFeature {
  id: string
  title: string
  impact: ImpactLevel
  direction?: 'increase' | 'decrease' | 'changed' | 'none'
  headline: string
  explanation: string
  researchDetail: string
  tooltip: string
  rawValue?: number
}

// ── Thresholds ────────────────────────────────────────────────────────────────
function hydrophobicityImpact(delta: number): ImpactLevel {
  const abs = Math.abs(delta)
  if (abs >= 4)   return 'high'
  if (abs >= 2)   return 'moderate'
  if (abs >= 0.5) return 'low'
  return 'none'
}

function chargeImpact(delta: number): ImpactLevel {
  const abs = Math.abs(delta)
  if (abs >= 1) return 'high'
  if (abs > 0)  return 'moderate'
  return 'none'
}

function polarityImpact(delta: number): ImpactLevel {
  if (delta !== 0) return 'moderate'
  return 'none'
}

function sizeImpact(delta: number): ImpactLevel {
  const abs = Math.abs(delta)
  if (abs >= 60)  return 'high'
  if (abs >= 30)  return 'moderate'
  if (abs >= 10)  return 'low'
  return 'none'
}

function direction(delta: number): 'increase' | 'decrease' | 'changed' | 'none' {
  if (delta > 0.05)  return 'increase'
  if (delta < -0.05) return 'decrease'
  return 'none'
}

function impactLabel(level: ImpactLevel): string {
  return { high: 'High', moderate: 'Moderate', low: 'Low', none: 'Minimal' }[level]
}

// ── Feature builders ──────────────────────────────────────────────────────────
function hydrophobicityFeature(delta: number): BiologicalFeature {
  const impact = hydrophobicityImpact(delta)
  const dir    = direction(delta)
  const absD   = Math.abs(delta).toFixed(1)

  const headlines: Record<ImpactLevel, string> = {
    high:     dir === 'increase'
      ? `Large increase in hydrophobicity — the new amino acid strongly avoids water`
      : `Large decrease in hydrophobicity — the new amino acid is much more water-loving`,
    moderate: dir === 'increase'
      ? `Moderate shift toward a more water-repelling amino acid`
      : `Moderate shift toward a more water-interacting amino acid`,
    low:      `Minor change in how the amino acid interacts with water`,
    none:     `Hydrophobic character essentially unchanged`,
  }

  const explanations: Record<ImpactLevel, string> = {
    high:     `This mutation causes a substantial change in hydrophobicity (Δ${absD}). Hydrophobic interactions are a primary force in protein folding — they drive non-polar amino acids to cluster in the protein interior away from water. A change this large may disrupt the hydrophobic core of the protein, potentially causing it to misfold or lose stability.`,
    moderate: `The hydrophobicity of this position changes moderately (Δ${absD}). This can affect how the amino acid positions itself relative to the protein's water-exposed surface. Depending on its location, this may influence local structure or domain stability.`,
    low:      `A small hydrophobicity shift (Δ${absD}) at this position. The local environment may be mildly altered, but significant structural disruption is less likely unless this residue is in a critical functional site.`,
    none:     `The amino acid substitution has minimal effect on hydrophobicity. This property is unlikely to contribute significantly to any pathogenic mechanism.`,
  }

  return {
    id:       'hydrophobicity',
    title:    'Hydrophobicity Change',
    impact,
    direction: dir === 'none' ? 'changed' : dir,
    headline: headlines[impact],
    explanation: explanations[impact],
    researchDetail: `HydrophobicityChange = ${delta > 0 ? '+' : ''}${delta.toFixed(2)} (Kyte-Doolittle scale). Positive values indicate a more hydrophobic substitution; negative values indicate increased hydrophilicity.`,
    tooltip:  'Hydrophobicity describes how strongly an amino acid repels water. Changes can disrupt protein folding and stability.',
    rawValue: delta,
  }
}

function chargeFeature(delta: number): BiologicalFeature {
  const impact = chargeImpact(delta)
  const absD   = Math.abs(delta).toFixed(1)

  const posLost     = delta < 0 && Math.abs(delta) >= 0.5
  const posGained   = delta > 0 && Math.abs(delta) >= 0.5
  const neutralized = Math.abs(delta) < 0.5

  const headline = posLost
    ? `Loss of positive charge — the mutation removes a charged amino acid`
    : posGained
      ? `Gain of charge — the mutation introduces an electrically charged amino acid`
      : impact === 'none'
        ? `Electrical charge preserved`
        : `Partial charge alteration at this position`

  const explanation = impact === 'high'
    ? `This mutation significantly alters the electrical charge at this position (${Number(absD) < 1 ? 'partially' : 'completely'}). Charged amino acids (particularly arginine, lysine, and aspartate) participate in salt bridges — electrostatic interactions that stabilize protein structure and mediate functional contacts. Losing or gaining a charge can disrupt these interactions, alter DNA or ligand binding, and affect protein stability.`
    : impact === 'moderate'
      ? `The charge environment at this position is altered. Electrostatic interactions contribute to protein stability and molecular recognition. Even partial charge changes can affect how nearby residues interact.`
      : impact === 'low'
        ? `A minor charge perturbation is introduced. The local electrostatic environment may shift slightly.`
        : `No significant charge change. Electrostatic interactions at this position are likely preserved.`

  return {
    id:       'charge',
    title:    'Charge Alteration',
    impact,
    direction: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'none',
    headline,
    explanation,
    researchDetail: `ChargeChange = ${delta > 0 ? '+' : ''}${delta.toFixed(2)}. Derived from formal charge at physiological pH. Ranges from −1 (loss of positive or gain of negative charge) to +1 (gain of positive or loss of negative charge).`,
    tooltip:  'Charge describes the electrical state of an amino acid at physiological pH. Charged residues participate in salt bridges that stabilize protein structure.',
    rawValue: delta,
  }
}

function polarityFeature(delta: number): BiologicalFeature {
  const impact = polarityImpact(delta)

  const headline = impact === 'none'
    ? `Polarity class unchanged`
    : delta > 0
      ? `Mutation introduces a polar amino acid at a previously non-polar position`
      : `Mutation replaces a polar amino acid with a non-polar one`

  const explanation = impact === 'none'
    ? `Both the original and replacement amino acid share the same polarity class. The local interaction with surrounding water molecules and nearby residues is likely maintained.`
    : `This substitution changes the polarity class of the amino acid. Polar amino acids can form hydrogen bonds with water and with other polar residues, while non-polar amino acids avoid water. A polarity switch can alter hydrogen bonding networks, change the local folding environment, and affect interactions with ligands or other proteins.`

  return {
    id:       'polarity',
    title:    'Polarity Shift',
    impact,
    direction: delta !== 0 ? 'changed' : 'none',
    headline,
    explanation,
    researchDetail: `PolarityChange = ${delta > 0 ? '+' : ''}${delta} (discrete: −1 nonpolar→polar swap, 0 = same class, +1 = polar→nonpolar swap).`,
    tooltip:  'Polarity describes how unevenly electrical charge is distributed within an amino acid. Polar amino acids interact strongly with water; non-polar ones avoid it.',
    rawValue: delta,
  }
}

function sizeFeature(delta: number): BiologicalFeature {
  const impact = sizeImpact(delta)
  const absD   = Math.abs(delta)
  const dir    = direction(delta)

  const headline = impact === 'none'
    ? `Amino acid size essentially unchanged`
    : dir === 'increase'
      ? `Larger amino acid introduced — may create steric crowding`
      : `Smaller amino acid substituted — may create a cavity or structural looseness`

  const explanation = impact === 'high'
    ? `The replacement amino acid differs substantially in size (Δ${absD} Da). Large size changes can introduce steric clashes with neighboring residues or create a void within the protein. Both scenarios can destabilize the local structure: steric clashes force neighboring atoms apart, while cavities reduce the packing efficiency of the hydrophobic core.`
    : impact === 'moderate'
      ? `A moderate size difference (Δ${absD} Da) may affect how tightly the protein packs at this position. Size changes in buried positions tend to have larger structural effects than surface-exposed ones.`
      : impact === 'low'
        ? `A minor size change (Δ${absD} Da). Likely tolerated unless the residue is in a tightly packed structural core.`
        : `Negligible size difference between the original and replacement amino acids.`

  return {
    id:       'size',
    title:    'Amino Acid Size Difference',
    impact,
    direction: dir === 'none' ? 'changed' : dir,
    headline,
    explanation,
    researchDetail: `SizeChange = ${delta > 0 ? '+' : ''}${delta} Da (molecular weight difference). Large positive values indicate a bulkier replacement; large negative values indicate a smaller substitute.`,
    tooltip:  'Amino acid size affects how tightly the protein packs together. Very large or small substitutions can create structural strain.',
    rawValue: delta,
  }
}

// ── Main interpreter ──────────────────────────────────────────────────────────
export interface FeatureInputs {
  HydrophobicityChange?: number
  ChargeChange?: number
  PolarityChange?: number
  SizeChange?: number
  [key: string]: number | undefined
}

export function interpretFeatures(features: FeatureInputs): BiologicalFeature[] {
  const result: BiologicalFeature[] = []

  if (features.HydrophobicityChange != null) {
    result.push(hydrophobicityFeature(features.HydrophobicityChange))
  }
  if (features.ChargeChange != null) {
    result.push(chargeFeature(features.ChargeChange))
  }
  if (features.PolarityChange != null) {
    result.push(polarityFeature(features.PolarityChange))
  }
  if (features.SizeChange != null) {
    result.push(sizeFeature(features.SizeChange))
  }

  // Sort: highest impact first
  const order: ImpactLevel[] = ['high', 'moderate', 'low', 'none']
  return result.sort((a, b) => order.indexOf(a.impact) - order.indexOf(b.impact))
}

export function overallBiologicalImpact(features: BiologicalFeature[]): ImpactLevel {
  if (features.some(f => f.impact === 'high'))     return 'high'
  if (features.some(f => f.impact === 'moderate')) return 'moderate'
  if (features.some(f => f.impact === 'low'))      return 'low'
  return 'none'
}

export function biologicalSummary(
  features: BiologicalFeature[],
  prediction: string,
  gene: string,
  origAA: string,
  newAA: string,
  level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): string {
  const highFeats   = features.filter(f => f.impact === 'high')
  const modFeats    = features.filter(f => f.impact === 'moderate')
  const anyImpact   = [...highFeats, ...modFeats]
  const isPat       = prediction?.toLowerCase().includes('pathogenic')

  if (level === 'beginner') {
    if (anyImpact.length === 0) {
      return `The model found only minor changes to this protein's building block, suggesting it's unlikely to cause harm.`
    }
    const feat = anyImpact[0]
    return `This genetic change swaps one of the protein's building blocks (${origAA} → ${newAA}). ${feat.headline}. The model thinks this ${isPat ? 'could affect how the protein works' : 'is unlikely to significantly affect the protein'}.`
  }

  if (level === 'advanced' || level === 'intermediate') {
    const featureNames = anyImpact.map(f => f.title).join(', ')
    if (featureNames) {
      return `The ${gene} p.${origAA}${newAA} substitution alters ${featureNames.toLowerCase()}. ${
        highFeats.length > 0 ? `The ${highFeats[0].title.toLowerCase()} change is the most significant contributor to the ${isPat ? 'pathogenic' : 'benign'} prediction.` : ''
      }`
    }
    return `The biochemical features of this ${gene} substitution (${origAA}→${newAA}) show minimal change, consistent with a ${isPat ? 'pathogenic classification driven by other genomic context' : 'benign classification'}.`
  }

  return ''
}

export { impactLabel }
