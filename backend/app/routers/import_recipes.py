from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.import_service import import_from_text, import_from_url

router = APIRouter(tags=["import"])


class UrlImportRequest(BaseModel):
    url: str


@router.post("/import/url")
async def import_url(req: UrlImportRequest, db: Session = Depends(get_db)):
    try:
        result = import_from_url(db, req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
    return result


@router.post("/import/files")
async def import_files(files: list[UploadFile], db: Session = Depends(get_db)):
    total_imported = 0
    total_skipped = 0
    errors = []

    for file in files:
        if not file.filename or not file.filename.endswith((".txt", ".md")):
            errors.append(f"Skipped '{file.filename}': must be .txt or .md")
            continue

        try:
            content = (await file.read()).decode("utf-8")
        except UnicodeDecodeError:
            errors.append(f"Skipped '{file.filename}': could not decode as UTF-8")
            continue

        try:
            result = import_from_text(db, file.filename, content)
            total_imported += result["imported"]
            total_skipped += result["skipped"]
        except Exception as e:
            errors.append(f"Error processing '{file.filename}': {e}")

    message = f"Imported {total_imported} recipes, skipped {total_skipped} duplicates"
    if errors:
        message += f". Errors: {'; '.join(errors)}"

    return {"imported": total_imported, "skipped": total_skipped, "message": message}
