import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recipe, SavedRecipe
from app.schemas import (
    PaginatedRecipes,
    RateRecipeRequest,
    RecipeOut,
    SaveRecipeRequest,
    TopIngredientOut,
)
from app.services.learning_service import get_top_ingredients, get_user_preferences

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

router = APIRouter(tags=["recipes"])


def _recipe_to_out(recipe: Recipe, db: Session) -> RecipeOut:
    saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe.id).first()
    return RecipeOut(
        id=recipe.id,
        name=recipe.name,
        ingredients=recipe.ingredients,
        directions=recipe.directions,
        description=recipe.description,
        notes=recipe.notes,
        source=recipe.source,
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        total_time=recipe.total_time,
        servings=recipe.servings,
        categories=recipe.categories,
        nutritional_info=recipe.nutritional_info,
        image_url=recipe.image_url,
        difficulty=recipe.difficulty,
        cuisine=recipe.cuisine,
        ai_generated=recipe.ai_generated,
        created_at=recipe.created_at,
        is_saved=saved is not None,
        rating=saved.rating if saved else None,
    )


@router.get("/recipes", response_model=PaginatedRecipes)
def list_saved_recipes(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Recipe)
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .order_by(SavedRecipe.saved_at.desc())
    )
    total = query.count()
    recipes = query.offset((page - 1) * per_page).limit(per_page).all()

    return PaginatedRecipes(
        recipes=[_recipe_to_out(r, db) for r in recipes],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/recipes/all", response_model=PaginatedRecipes)
def list_all_recipes(
    page: int = 1,
    per_page: int = 20,
    search: str | None = None,
    source: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Recipe).order_by(Recipe.created_at.desc())
    if search:
        query = query.filter(Recipe.name.ilike(f"%{search}%"))
    if source == "ai":
        query = query.filter(Recipe.ai_generated.is_(True))
    elif source == "imported":
        query = query.filter(Recipe.ai_generated.is_(False))

    total = query.count()
    recipes = query.offset((page - 1) * per_page).limit(per_page).all()

    return PaginatedRecipes(
        recipes=[_recipe_to_out(r, db) for r in recipes],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/recipes/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: str, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return _recipe_to_out(recipe, db)


@router.post("/recipes/{recipe_id}/save", response_model=RecipeOut)
def save_recipe(
    recipe_id: str,
    request: SaveRecipeRequest,
    db: Session = Depends(get_db),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    existing = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Recipe already saved")

    saved = SavedRecipe(recipe_id=recipe_id, notes=request.notes)
    db.add(saved)
    db.commit()
    return _recipe_to_out(recipe, db)


@router.post("/recipes/{recipe_id}/rate", response_model=RecipeOut)
def rate_recipe(
    recipe_id: str,
    request: RateRecipeRequest,
    db: Session = Depends(get_db),
):
    if not 1 <= request.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe_id).first()
    if not saved:
        saved = SavedRecipe(recipe_id=recipe_id)
        db.add(saved)

    saved.rating = request.rating
    db.commit()
    return _recipe_to_out(recipe, db)


@router.delete("/recipes/{recipe_id}/save")
def unsave_recipe(recipe_id: str, db: Session = Depends(get_db)):
    saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe_id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved recipe not found")
    db.delete(saved)
    db.commit()
    return {"status": "removed"}


@router.post("/recipes/{recipe_id}/image", response_model=RecipeOut)
async def upload_recipe_image(
    recipe_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File must be JPG, PNG, or WebP")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    # Delete old image if exists
    if recipe.image_url:
        old_path = UPLOADS_DIR / Path(recipe.image_url).name
        if old_path.is_file():
            old_path.unlink()

    filename = f"{recipe_id}_{uuid.uuid4().hex[:8]}{ext}"
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / filename).write_bytes(contents)

    recipe.image_url = f"/api/uploads/{filename}"
    db.commit()
    db.refresh(recipe)
    return _recipe_to_out(recipe, db)


@router.delete("/recipes/{recipe_id}/image")
def delete_recipe_image(recipe_id: str, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    if recipe.image_url:
        old_path = UPLOADS_DIR / Path(recipe.image_url).name
        if old_path.is_file():
            old_path.unlink()
        recipe.image_url = None
        db.commit()

    return {"status": "removed"}


@router.get("/stats/top-ingredients", response_model=list[TopIngredientOut])
def top_ingredients(limit: int = 10, db: Session = Depends(get_db)):
    return get_top_ingredients(db, limit=limit)


@router.get("/stats/preferences")
def user_preferences(db: Session = Depends(get_db)):
    return get_user_preferences(db)
