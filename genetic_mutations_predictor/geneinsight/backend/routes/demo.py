"""Demo Library — serve synthetic datasets and metadata."""
import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_DIR = Path(__file__).parent.parent / "demo_data"


def _library() -> dict:
    meta_path = DEMO_DIR / "demo_library.json"
    if not meta_path.exists():
        return {"datasets": [], "demo_cases": []}
    with open(meta_path) as f:
        return json.load(f)


@router.get("/library")
def get_library():
    """Return full demo library metadata."""
    return _library()


@router.get("/datasets")
def list_datasets():
    """List all available demo datasets."""
    lib = _library()
    return {"datasets": lib.get("datasets", [])}


@router.get("/cases")
def list_demo_cases():
    """Return pre-built demo cases."""
    lib = _library()
    return {"cases": lib.get("demo_cases", [])}


@router.get("/download/{dataset_id}")
def download_dataset(dataset_id: str):
    """Download a demo dataset file."""
    lib = _library()
    dataset = next((d for d in lib.get("datasets", []) if d["id"] == dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    file_path = DEMO_DIR / dataset["file"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dataset file not found")

    media_types = {
        "csv":  "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json": "application/json",
    }
    ext = dataset["file"].rsplit(".", 1)[-1].lower()
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        filename=dataset["file"],
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{dataset["file"]}"'},
    )


@router.get("/readme/{dataset_id}")
def get_readme(dataset_id: str):
    """Return README text for a dataset."""
    readme_path = DEMO_DIR / f"{dataset_id}_README.md"
    if not readme_path.exists():
        raise HTTPException(status_code=404, detail="README not found")
    with open(readme_path) as f:
        return {"content": f.read()}
