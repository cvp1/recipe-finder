from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SavedRecipe
from app.schemas import DailySuggestionOut, RecipeOut
from app.services.suggestion_service import get_or_create_daily_suggestions

router = APIRouter(tags=["suggestions"])


@router.get("/suggestions/daily", response_model=DailySuggestionOut)
def daily_suggestions(db: Session = Depends(get_db)):
    try:
        result = get_or_create_daily_suggestions(db)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to generate suggestions: {e}")

    recipe_outs = []
    for recipe in result["recipes"]:
        saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe.id).first()
        recipe_outs.append(
            RecipeOut(
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
        )

    return DailySuggestionOut(
        theme=result["theme"],
        recipes=recipe_outs,
        date=result["date"],
    )


@router.post("/suggestions/refresh", response_model=DailySuggestionOut)
def refresh_suggestions(db: Session = Depends(get_db)):
    try:
        result = get_or_create_daily_suggestions(db, force_refresh=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to refresh suggestions: {e}")

    recipe_outs = []
    for recipe in result["recipes"]:
        saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe.id).first()
        recipe_outs.append(
            RecipeOut(
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
        )

    return DailySuggestionOut(
        theme=result["theme"],
        recipes=recipe_outs,
        date=result["date"],
    )
