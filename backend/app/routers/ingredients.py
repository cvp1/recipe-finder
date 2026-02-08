from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recipe, SavedRecipe
from app.schemas import GenerateRequest, GenerateResponse, RecipeOut
from app.services.claude_service import generate_recipes, normalize_recipe
from app.services.learning_service import get_user_preferences, track_search

router = APIRouter(tags=["ingredients"])


@router.post("/recipes/generate", response_model=GenerateResponse)
def generate_recipes_endpoint(request: GenerateRequest, db: Session = Depends(get_db)):
    if not request.ingredients:
        raise HTTPException(status_code=400, detail="At least one ingredient is required")

    preferences = get_user_preferences(db)
    if request.dietary_preferences:
        preferences["dietary_preferences"] = request.dietary_preferences
    if request.cuisine_preference:
        preferences["cuisine_preference"] = request.cuisine_preference
    if request.max_cook_time:
        preferences["max_cook_time"] = request.max_cook_time

    try:
        raw_recipes = generate_recipes(request.ingredients, preferences)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Recipe generation failed: {e}")

    saved_recipes = []
    for recipe_data in raw_recipes:
        recipe_data = normalize_recipe(recipe_data)
        recipe = Recipe(
            name=recipe_data["name"],
            ingredients=recipe_data.get("ingredients", ""),
            directions=recipe_data.get("directions", ""),
            description=recipe_data.get("description"),
            prep_time=recipe_data.get("prep_time"),
            cook_time=recipe_data.get("cook_time"),
            total_time=recipe_data.get("total_time"),
            servings=recipe_data.get("servings"),
            categories=recipe_data.get("categories"),
            difficulty=recipe_data.get("difficulty"),
            cuisine=recipe_data.get("cuisine"),
            nutritional_info=recipe_data.get("nutritional_info"),
            source="AI Generated",
            ai_generated=True,
        )
        db.add(recipe)
        db.flush()
        saved_recipes.append(recipe)

    db.commit()

    track_search(db, request.ingredients)

    recipe_outs = []
    for recipe in saved_recipes:
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

    return GenerateResponse(recipes=recipe_outs)
