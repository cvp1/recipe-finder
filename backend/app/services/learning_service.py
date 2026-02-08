import json
from datetime import datetime

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import IngredientFrequency, Recipe, SavedRecipe, SearchHistory


def track_search(db: Session, ingredients: list[str], recipe_id: str | None = None):
    history = SearchHistory(
        ingredients=json.dumps(ingredients),
        recipe_id=recipe_id,
    )
    db.add(history)

    for ingredient in ingredients:
        normalized = ingredient.strip().lower()
        existing = (
            db.query(IngredientFrequency)
            .filter(IngredientFrequency.ingredient == normalized)
            .first()
        )
        if existing:
            existing.count += 1
            existing.last_searched = datetime.utcnow()
        else:
            db.add(IngredientFrequency(ingredient=normalized, count=1))

    db.commit()


def get_top_ingredients(db: Session, limit: int = 10) -> list[dict]:
    results = (
        db.query(IngredientFrequency)
        .order_by(desc(IngredientFrequency.count))
        .limit(limit)
        .all()
    )
    return [{"ingredient": r.ingredient, "count": r.count} for r in results]


def get_user_preferences(db: Session) -> dict:
    preferences = {}

    # Top searched ingredients
    top_ingredients = get_top_ingredients(db, limit=10)
    if top_ingredients:
        preferences["top_ingredients"] = [i["ingredient"] for i in top_ingredients]

    # Top cuisines from saved/rated recipes
    cuisine_counts = (
        db.query(Recipe.cuisine, func.count(Recipe.cuisine))
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .filter(Recipe.cuisine.isnot(None))
        .group_by(Recipe.cuisine)
        .order_by(desc(func.count(Recipe.cuisine)))
        .limit(5)
        .all()
    )
    if cuisine_counts:
        preferences["top_cuisines"] = [c[0] for c in cuisine_counts]

    # Average rating by cuisine
    avg_ratings = (
        db.query(Recipe.cuisine, func.avg(SavedRecipe.rating))
        .join(SavedRecipe, SavedRecipe.recipe_id == Recipe.id)
        .filter(SavedRecipe.rating.isnot(None), Recipe.cuisine.isnot(None))
        .group_by(Recipe.cuisine)
        .order_by(desc(func.avg(SavedRecipe.rating)))
        .limit(5)
        .all()
    )
    if avg_ratings:
        preferences["avg_rating_by_cuisine"] = {
            c[0]: round(c[1], 1) for c in avg_ratings
        }

    return preferences
