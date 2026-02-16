from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recipe, SavedRecipe
from app.services.paprika_service import export_markdown, export_paprika, export_single_markdown, import_paprika

router = APIRouter(tags=["paprika"])


@router.post("/paprika/import")
async def import_paprika_file(file: UploadFile, db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".paprikarecipes"):
        raise HTTPException(status_code=400, detail="File must be a .paprikarecipes file")

    contents = await file.read()
    try:
        result = import_paprika(db, contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import: {e}")

    return {
        "imported": result["imported"],
        "skipped": result["skipped"],
        "message": f"Imported {result['imported']} recipes, skipped {result['skipped']} duplicates",
    }


@router.get("/paprika/export")
def export_saved_paprika(db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .all()
    )
    if not recipes:
        raise HTTPException(status_code=404, detail="No saved recipes to export")

    data = export_paprika(db, recipes)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RecipeFinder-Saved.paprikarecipes"},
    )


@router.get("/paprika/export-all")
def export_all_paprika(db: Session = Depends(get_db)):
    recipes = db.query(Recipe).all()
    if not recipes:
        raise HTTPException(status_code=404, detail="No recipes to export")

    data = export_paprika(db, recipes)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RecipeFinder-All.paprikarecipes"},
    )


@router.get("/paprika/export/{recipe_id}")
def export_single_paprika(recipe_id: str, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    data = export_paprika(db, [recipe])
    safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe_id
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.paprikarecipes"},
    )


@router.get("/markdown/export")
def export_saved_markdown(db: Session = Depends(get_db)):
    recipes = (
        db.query(Recipe)
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .all()
    )
    if not recipes:
        raise HTTPException(status_code=404, detail="No saved recipes to export")

    data = export_markdown(db, recipes)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RecipeFinder-Saved.zip"},
    )


@router.get("/markdown/export-all")
def export_all_markdown(db: Session = Depends(get_db)):
    recipes = db.query(Recipe).all()
    if not recipes:
        raise HTTPException(status_code=404, detail="No recipes to export")

    data = export_markdown(db, recipes)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=RecipeFinder-All.zip"},
    )


@router.get("/markdown/export/{recipe_id}")
def export_single_recipe_markdown(recipe_id: str, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    md = export_single_markdown(recipe, db)
    safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe_id
    return Response(
        content=md.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={safe_name}.md"},
    )
