import base64
import gzip
import hashlib
import io
import json
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Recipe, SavedRecipe

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"


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

            # Extract embedded photo data and save as file
            # photo_data contains base64-encoded image; photo is just a filename
            photo_data = data.get("photo_data")
            if photo_data and isinstance(photo_data, str):
                try:
                    img_bytes = base64.b64decode(photo_data)
                    if len(img_bytes) > 0:
                        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                        filename = f"{recipe.id}_{uuid.uuid4().hex[:8]}.jpg"
                        (UPLOADS_DIR / filename).write_bytes(img_bytes)
                        recipe.image_url = f"/api/uploads/{filename}"
                except Exception:
                    pass  # Skip bad image data silently

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

            # Read and encode image if available
            photo_filename = ""
            photo_data_b64 = None
            photo_hash_val = ""
            if recipe.image_url:
                img_path = UPLOADS_DIR / Path(recipe.image_url).name
                if img_path.is_file():
                    img_bytes = img_path.read_bytes()
                    photo_data_b64 = base64.b64encode(img_bytes).decode("ascii")
                    photo_hash_val = hashlib.sha256(img_bytes).hexdigest()
                    photo_filename = f"{recipe.id}.jpg"

            created_str = ""
            if recipe.created_at:
                created_str = recipe.created_at.strftime("%Y-%m-%d %H:%M:%S")
            else:
                created_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

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
                "scale": "",
                "photo": photo_filename,
                "photo_hash": photo_hash_val,
                "photo_data": photo_data_b64,
                "photo_large": "",
                "photo_url": "",
                "created": created_str,
                "hash": "",
            }
            # Generate hash after building data (exclude photo_data to keep hash stable)
            hash_data = {k: v for k, v in paprika_data.items() if k != "photo_data"}
            paprika_data["hash"] = _recipe_hash(hash_data)

            json_bytes = json.dumps(paprika_data, ensure_ascii=False).encode("utf-8")
            gzipped = gzip.compress(json_bytes)

            safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe.id
            zf.writestr(f"{safe_name}.paprikarecipe", gzipped)

    buf.seek(0)
    return buf.read()


def _recipe_to_markdown(recipe: Recipe, db: Session, include_image_tag: bool = True) -> str:
    """Convert a single recipe to a Markdown string."""
    lines: list[str] = []
    lines.append(f"# {recipe.name}\n")

    if recipe.description:
        lines.append(f"_{recipe.description}_\n")

    if include_image_tag and recipe.image_url:
        safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe.id
        lines.append(f"![{recipe.name}](img/{safe_name}.jpg)\n")

    # Metadata
    meta_parts = []
    if recipe.prep_time:
        meta_parts.append(f"**Prep:** {recipe.prep_time}")
    if recipe.cook_time:
        meta_parts.append(f"**Cook:** {recipe.cook_time}")
    if recipe.total_time:
        meta_parts.append(f"**Total:** {recipe.total_time}")
    if recipe.servings:
        meta_parts.append(f"**Servings:** {recipe.servings}")
    if recipe.difficulty:
        meta_parts.append(f"**Difficulty:** {recipe.difficulty}")
    if recipe.cuisine:
        meta_parts.append(f"**Cuisine:** {recipe.cuisine}")
    if meta_parts:
        lines.append(" | ".join(meta_parts) + "\n")

    categories = []
    if recipe.categories:
        try:
            categories = json.loads(recipe.categories)
        except json.JSONDecodeError:
            categories = [recipe.categories]
    if categories:
        lines.append("**Categories:** " + ", ".join(categories) + "\n")

    # Ingredients
    lines.append("## Ingredients\n")
    for line in (recipe.ingredients or "").split("\n"):
        line = line.strip()
        if line:
            lines.append(f"- {line}")
    lines.append("")

    # Directions
    lines.append("## Directions\n")
    for i, line in enumerate((recipe.directions or "").split("\n"), 1):
        line = line.strip()
        if line:
            clean = line
            # Strip existing step numbering
            import re
            clean = re.sub(r"^(Step\s+)?\d+[.:]\s*", "", clean, flags=re.IGNORECASE)
            lines.append(f"{i}. {clean}")
    lines.append("")

    # Optional sections
    if recipe.nutritional_info:
        lines.append("## Nutrition\n")
        lines.append(recipe.nutritional_info + "\n")

    if recipe.notes:
        lines.append("## Notes\n")
        lines.append(recipe.notes + "\n")

    saved = db.query(SavedRecipe).filter(SavedRecipe.recipe_id == recipe.id).first()
    if saved and saved.rating:
        lines.append(f"**Rating:** {'★' * saved.rating}{'☆' * (5 - saved.rating)}\n")

    if recipe.source:
        lines.append(f"**Source:** {recipe.source}\n")

    return "\n".join(lines)


def export_markdown(db: Session, recipes: list[Recipe]) -> bytes:
    """Export recipes as a ZIP containing Markdown files and images."""
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for recipe in recipes:
            safe_name = recipe.name.replace("/", "-").replace("\\", "-")[:80] if recipe.name else recipe.id

            md_content = _recipe_to_markdown(recipe, db)
            zf.writestr(f"{safe_name}.md", md_content.encode("utf-8"))

            # Include image if available
            if recipe.image_url:
                img_path = UPLOADS_DIR / Path(recipe.image_url).name
                if img_path.is_file():
                    zf.write(img_path, f"img/{safe_name}.jpg")

    buf.seek(0)
    return buf.read()


def export_single_markdown(recipe: Recipe, db: Session) -> str:
    """Export a single recipe as a Markdown string (no ZIP)."""
    return _recipe_to_markdown(recipe, db, include_image_tag=False)
