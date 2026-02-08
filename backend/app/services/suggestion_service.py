import json
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models import DailySuggestion, Recipe
from app.services.claude_service import generate_daily_suggestions, normalize_recipe
from app.services.learning_service import get_user_preferences


def get_or_create_daily_suggestions(db: Session, force_refresh: bool = False) -> dict:
    today = date.today()

    if not force_refresh:
        existing = (
            db.query(DailySuggestion)
            .filter(DailySuggestion.date == today)
            .first()
        )
        if existing:
            try:
                recipe_ids = json.loads(existing.recipes)
            except (json.JSONDecodeError, TypeError):
                recipe_ids = []

            if recipe_ids:
                recipes = db.query(Recipe).filter(Recipe.id.in_(recipe_ids)).all()
                if recipes:
                    return {
                        "theme": existing.theme,
                        "recipes": recipes,
                        "date": str(today),
                    }

            # Cached entry is broken — delete it and regenerate
            print(f"[SUGGESTIONS] Stale cache entry for {today}, regenerating", flush=True)
            db.delete(existing)
            db.commit()

    preferences = get_user_preferences(db)
    result = generate_daily_suggestions(preferences)

    recipes = []
    recipe_ids = []
    for recipe_data in result.get("recipes", []):
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
            source="AI Generated - Daily Suggestion",
            ai_generated=True,
        )
        db.add(recipe)
        db.flush()
        recipes.append(recipe)
        recipe_ids.append(recipe.id)

    # Remove any old entry for today before inserting
    db.query(DailySuggestion).filter(DailySuggestion.date == today).delete()

    suggestion = DailySuggestion(
        date=today,
        recipes=json.dumps(recipe_ids),
        theme=result.get("theme", "Daily Picks"),
        created_at=datetime.utcnow(),
    )
    db.add(suggestion)
    db.commit()

    return {
        "theme": suggestion.theme,
        "recipes": recipes,
        "date": str(today),
    }
