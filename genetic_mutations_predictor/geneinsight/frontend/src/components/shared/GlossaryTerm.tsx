import { useExplainMode } from '@/hooks/useExplainMode'

const GLOSSARY: Record<string, string> = {
  variant: 'A small difference in DNA compared to the typical sequence. Some variants have no effect, while others can influence how proteins function.',
  mutation: 'A change in DNA. Some mutations have no effect, while others can affect how proteins work.',
  pathogenic: 'Likely to cause or contribute to disease. A pathogenic variant has characteristics similar to mutations previously linked to illness.',
  benign: 'Unlikely to cause disease. A benign variant appears similar to harmless genetic variations found in healthy people.',
  protein: 'A molecule that performs specific tasks inside cells. Proteins are built from chains of amino acids.',
  'amino acid': 'The building blocks of proteins. There are 20 different amino acids, each with unique chemical properties. Changing one can alter how the protein works.',
  hydrophobicity: 'How much a part of the protein avoids or attracts water. This property affects how proteins fold and interact with their environment.',
  charge: 'The electrical property of an amino acid. Changing the charge at a specific position can disrupt how the protein interacts with other molecules.',
  polarity: 'Whether an amino acid distributes its electrical charge evenly. This affects how proteins interact with water and other molecules.',
  'conserved residue': 'A location that has remained nearly unchanged across many species throughout evolution, suggesting it performs an important function.',
  shap: 'A mathematical technique that explains which features most influenced a model\'s prediction, and in which direction.',
  'clinical significance': 'The likely impact of a genetic variant on a person\'s health, based on scientific evidence.',
  'missense variant': 'A DNA change that causes one amino acid in a protein to be replaced by a different amino acid.',
  confidence: 'How certain the model is about its prediction. Higher confidence means the variant\'s features more closely match patterns the model learned during training.',
  'random forest': 'A machine learning method that makes predictions by combining the results of many decision trees.',
  gene: 'A segment of DNA that contains instructions for building a protein. Genes are inherited from parents.',
  'germline': 'A variant inherited from a parent, present in every cell of the body.',
  'somatic': 'A variant that develops during a person\'s lifetime, not inherited. Present only in certain cells.',
}

interface Props {
  term: string
  children?: React.ReactNode
  className?: string
}

export function GlossaryTerm({ term, children, className = '' }: Props) {
  const { explainMode } = useExplainMode()
  const definition = GLOSSARY[term.toLowerCase()]

  if (!definition) return <span className={className}>{children ?? term}</span>

  return (
    <span className={`relative group inline-block ${className}`}>
      <span
        className={`${explainMode ? 'underline decoration-dotted decoration-blue-500 cursor-help' : ''}`}
        style={explainMode ? { textDecorationStyle: 'dotted', textUnderlineOffset: '3px' } : {}}
      >
        {children ?? term}
      </span>
      {explainMode && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-50
            bg-foreground text-background text-[13px] leading-relaxed rounded-lg px-4 py-3 shadow-xl
            opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ minWidth: '220px' }}
        >
          <span className="block font-bold mb-1 capitalize">{term}</span>
          {definition}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: 'hsl(var(--foreground))' }}
          />
        </span>
      )}
    </span>
  )
}
