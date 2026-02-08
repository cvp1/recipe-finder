import gzip
import hashlib
import io
import json
import zipfile
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Recipe, SavedRecipe


def _recipe_hash(data: dict) -> str:
    """Generate a SHA256 hash of recipe content for Paprika compatibility."""
    content = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def import_paprika(db: Session, file_bytes: bytes) -> dict:
    """Import recipes from a .paprikarecipes file (ZIP of gzipped JSON files)."""
    imported = []
    skipped = 0

    with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
        for entry in zf.namelist():
            if not entry.endswith(".paprikarecipe"):
                continue

            raw = zf.read(entry)
            try:
                decompressed = gzip.decompress(raw)
            except gzip.BadGzipFile:
                # Some exports may not gzip individual files
                decompressed = raw

            data = json.loads(decompressed)

            # Use Paprika's UID if available, otherwise generate
            recipe_id = data.get("uid")
            if recipe_id and db.query(Recipe).filter(Recipe.id == recipe_id).first():
                skipped += 1
                continue

            # Build source from source + source_url
            source = data.get("source", "")
            source_url = data.get("source_url", "")
            if source_url and source_url not in (source or ""):
                source = f"{source} ({source_url})" if source else source_url

            # Normalize categories
            categories = data.get("categories", [])
            if isinstance(categories, list):
                categories = json.dumps(categories) if categories else None
            elif isinstance(categories, str):
                categories = categories or None

            recipe = Recipe(
                id=recipe_id if recipe_id else None,
                name=data.get("name", "Untitled Recipe"),
                ingredients=data.get("ingredients", ""),
                directions=data.get("directions", ""),
                description=data.get("description"),
                notes=data.get("notes"),
                source=source or "Paprika Import",
                prep_time=data.get("prep_time"),
                cook_time=data.get("cook_time"),
                total_time=data.get("total_time"),
                servings=data.get("servings"),
                categories=categories,
                nutritional_info=data.get("nutritional_info"),
                image_url=data.get("image_url"),
                difficulty=data.get("difficulty"),
                ai_generated=False,
            )
            db.add(recipe)
            db.flush()

            # Create SavedRecipe if rated or favorited
            rating = data.get("rating")
            on_favorites = data.get("on_favorites", False)
            if (rating and int(rating) > 0) or on_favorites:
                saved = SavedRecipe(
                    recipe_id=recipe.id,
                    rating=int(rating) if rating and int(rating) > 0 else None,
                )
                db.add(saved)

            imported.append(recipe)

    db.commit()
    return {"imported": len(imported), "skipped": skipped, "recipes": imported}


def export_paprika(db: Session, recipes: list[Recipe]) -> bytes:
    """Export recipes as a .paprikarecipes file (ZIP of gzipped JSON files)."""
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for recipe in recipes:
            # Get saved/rating info
            saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe.id).first()

            # Parse categories back to list
            categories = []
            if recipe.categories:
                try:
                    categories = json.loads(recipe.categories)
                except json.JSONDecodeError:
                    categories = [recipe.categories]

            paprika_data = {
                "uid": recipe.id,
                "name": recipe.name or "",
                "ingredients": recipe.ingredients or "",
                "directions": recipe.directions or "",
                "description": recipe.description or "",
                "notes": recipe.notes or "",
                "source": recipe.source or "",
                "source_url": "",
                "prep_time": recipe.prep_time or "",
                "cook_time": recipe.cook_time or "",
                "total_time": recipe.total_time or "",
                "servings": recipe.servings or "",
                "categories": categories,
                "nutritional_info": recipe.nutritional_info or "",
                "image_url": recipe.image_url or "",
                "difficulty": recipe.difficulty or "",
                "rating": saved.rating if saved and saved.rating else 0,
                "on_favorites": saved is not None,
                "in_trash": False,
                "is_pinned": False,
                "scale": None,
                "photo": "",
                "photo_hash": "",
                "photo_data": None,
                "photo_large": None,
                "photo_url": None,
                "created": recipe.created_at.isoformat() if recipe.created_at else datetime.utcnow().isoformat(),
                "hash": "",
            }
            # Generate hash after building data
            paprika_data["hash"] = _recipe_hash(paprika_data)

            json_bytes = json.dumps(paprika_data, ensure_ascii=False).encode("utf-8")
            gzipped = gzip.compress(json_bytes)

            safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe.id
            zf.writestr(f"{safe_name}.paprikarecipe", gzipped)

    buf.seek(0)
    return buf.read()
