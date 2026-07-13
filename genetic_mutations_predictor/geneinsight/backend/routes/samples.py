import io
import random
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/samples", tags=["samples"])

AMINO_ACIDS = [
    "Ala", "Arg", "Asn", "Asp", "Cys", "Gln", "Glu", "Gly", "His", "Ile",
    "Leu", "Lys", "Met", "Phe", "Pro", "Ser", "Thr", "Trp", "Tyr", "Val"
]
GENES = ["BRCA1", "BRCA2", "TP53", "EGFR", "KRAS", "APC", "MLH1", "MSH2", "PTEN", "VHL"]
TYPES = ["missense_variant", "synonymous_variant", "frameshift_variant"]
ORIGINS = ["germline", "somatic", "unknown"]
CLIN_SIG = ["Pathogenic", "Likely pathogenic", "Benign", "Likely benign", "Uncertain significance"]


def generate_sample_csv(n: int) -> str:
    lines = ["GeneSymbol,Name,Type,OriginSimple,ClinicalSignificance,original_aa,new_aa,position"]
    for i in range(n):
        gene = random.choice(GENES)
        orig = random.choice(AMINO_ACIDS)
        new = random.choice([aa for aa in AMINO_ACIDS if aa != orig])
        pos = random.randint(1, 1000)
        variant_type = random.choice(TYPES)
        origin = random.choice(ORIGINS)
        clin_sig = random.choice(CLIN_SIG)
        name = f"p.{orig}{pos}{new}"
        lines.append(f"{gene},{name},{variant_type},{origin},{clin_sig},{orig},{new},{pos}")
    return "\n".join(lines)


@router.get("")
def list_samples():
    return [
        {"name": "small_sample.csv", "variants": 20, "url": "/samples/small"},
        {"name": "medium_sample.csv", "variants": 50, "url": "/samples/medium"},
        {"name": "large_sample.csv", "variants": 100, "url": "/samples/large"},
    ]


@router.get("/small")
def small_sample():
    content = generate_sample_csv(20)
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=small_sample.csv"},
    )


@router.get("/medium")
def medium_sample():
    content = generate_sample_csv(50)
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=medium_sample.csv"},
    )


@router.get("/large")
def large_sample():
    content = generate_sample_csv(100)
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=large_sample.csv"},
    )
