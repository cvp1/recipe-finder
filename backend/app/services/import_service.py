import json
import logging
import uuid
from pathlib import Path
from urllib.parse import urljoin

import anthropic
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Recipe
from app.services.claude_service import _extract_json, normalize_recipe

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "uploads"

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

IMPORT_SYSTEM_PROMPT = """You are a recipe extraction assistant. Given raw text content (from a webpage or a text file),
extract all recipes found in the text. Always respond with valid JSON only — no markdown, no extra text.

Return a JSON array of recipe objects. Each recipe must have these fields:
{
  "name": "Recipe Name",
  "ingredients": "ingredient 1\\ningredient 2\\ningredient 3",
  "directions": "Step 1: Do this.\\nStep 2: Do that.\\nStep 3: Finish.",
  "description": "A short 1-2 sentence description",
  "prep_time": "15 min",
  "cook_time": "30 min",
  "total_time": "45 min",
  "servings": "4 servings",
  "categories": "[\\"Dinner\\", \\"Italian\\"]",
  "difficulty": "easy",
  "cuisine": "Italian",
  "nutritional_info": "Approx. 400 cal per serving"
}

Important rules:
- Extract ONLY recipes that are actually present in the text — do not invent recipes
- If a field is not available in the text, make a reasonable guess or use null
- Ingredients should be newline-separated, with quantities when available
- Directions should be newline-separated numbered steps
- Categories should be a JSON array as a string
- difficulty must be one of: easy, medium, hard
- If the text contains no recognizable recipe, return an empty array []"""


def _parse_recipe_with_claude(text: str, source: str) -> list[dict]:
    """Send text to Claude to extract structured recipe data."""
    # Truncate very long text to stay within token limits
    if len(text) > 30000:
        text = text[:30000]

    user_prompt = f"Extract all recipes from the following content (source: {source}):\n\n{text}"

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=IMPORT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = message.content[0].text
        logger.info("Claude import response (first 200 chars): %s", raw_text[:200])
        cleaned = _extract_json(raw_text)
        recipes = json.loads(cleaned)
        if isinstance(recipes, dict):
            recipes = [recipes]
        return [normalize_recipe(r) for r in recipes]
    except (json.JSONDecodeError, IndexError, anthropic.APIError) as e:
        logger.error("Claude API error during recipe import: %s", e)
        raise


def _find_recipe_image_url(soup: BeautifulSoup, base_url: str) -> str | None:
    """Extract the most likely recipe image URL from parsed HTML."""
    # 1. Try og:image meta tag (most reliable for recipe sites)
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return urljoin(base_url, og["content"])

    # 2. Try schema.org Recipe image
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                data = data[0]
            if isinstance(data, dict):
                if data.get("@type") == "Recipe" and data.get("image"):
                    img = data["image"]
                    if isinstance(img, list):
                        img = img[0]
                    if isinstance(img, dict):
                        img = img.get("url", "")
                    if img:
                        return urljoin(base_url, img)
        except (json.JSONDecodeError, IndexError):
            continue

    # 3. Try twitter:image
    tw = soup.find("meta", attrs={"name": "twitter:image"}) or soup.find("meta", property="twitter:image")
    if tw and tw.get("content"):
        return urljoin(base_url, tw["content"])

    return None


def _download_image(image_url: str, recipe_id: str) -> str | None:
    """Download an image and save it to uploads. Returns the local URL path or None."""
    try:
        resp = httpx.get(image_url, follow_redirects=True, timeout=15, headers={
            "User-Agent": "Mozilla/5.0 (compatible; RecipeFinder/1.0)"
        })
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if "jpeg" in content_type or "jpg" in content_type:
            ext = ".jpg"
        elif "png" in content_type:
            ext = ".png"
        elif "webp" in content_type:
            ext = ".webp"
        else:
            # Try to guess from URL
            url_lower = image_url.lower().split("?")[0]
            if url_lower.endswith(".png"):
                ext = ".png"
            elif url_lower.endswith(".webp"):
                ext = ".webp"
            else:
                ext = ".jpg"

        if len(resp.content) > 5 * 1024 * 1024:
            logger.warning("Image too large, skipping: %s", image_url)
            return None

        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{recipe_id}_{uuid.uuid4().hex[:8]}{ext}"
        (UPLOADS_DIR / filename).write_bytes(resp.content)
        return f"/api/uploads/{filename}"
    except Exception as e:
        logger.warning("Failed to download image %s: %s", image_url, e)
        return None


def _save_parsed_recipes(db: Session, recipes: list[dict], source: str, image_url: str | None = None) -> dict:
    """Save parsed recipe dicts to the database. Returns {imported, skipped} counts."""
    imported = 0
    skipped = 0

    for data in recipes:
        name = data.get("name", "").strip()
        if not name:
            skipped += 1
            continue

        # Check for duplicate by name
        existing = db.query(Recipe).filter(Recipe.name == name).first()
        if existing:
            skipped += 1
            continue

        recipe = Recipe(
            name=name,
            ingredients=data.get("ingredients", ""),
            directions=data.get("directions", ""),
            description=data.get("description"),
            source=source,
            prep_time=data.get("prep_time"),
            cook_time=data.get("cook_time"),
            total_time=data.get("total_time"),
            servings=data.get("servings"),
            categories=data.get("categories"),
            nutritional_info=data.get("nutritional_info"),
            difficulty=data.get("difficulty"),
            cuisine=data.get("cuisine"),
            ai_generated=False,
        )
        db.add(recipe)
        db.flush()  # get recipe.id for image filename

        # Download image for the first recipe from URL imports
        if image_url and imported == 0:
            local_path = _download_image(image_url, recipe.id)
            if local_path:
                recipe.image_url = local_path

        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped}


def import_from_url(db: Session, url: str) -> dict:
    """Fetch a URL, extract text, parse recipes with Claude, and save to DB."""
    try:
        response = httpx.get(url, follow_redirects=True, timeout=30, headers={
            "User-Agent": "Mozilla/5.0 (compatible; RecipeFinder/1.0)"
        })
        response.raise_for_status()
    except httpx.HTTPError as e:
        raise ValueError(f"Failed to fetch URL: {e}")

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove script and style elements
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Extract image URL before stripping tags
    image_url = _find_recipe_image_url(soup, url)

    text = soup.get_text(separator="\n", strip=True)

    if not text.strip():
        raise ValueError("No text content found at URL")

    recipes = _parse_recipe_with_claude(text, url)
    if not recipes:
        return {"imported": 0, "skipped": 0, "message": "No recipes found at that URL"}

    result = _save_parsed_recipes(db, recipes, url, image_url=image_url)
    result["message"] = f"Imported {result['imported']} recipes, skipped {result['skipped']} duplicates"
    return result


def import_from_text(db: Session, filename: str, content: str) -> dict:
    """Parse recipes from text/markdown content with Claude and save to DB."""
    if not content.strip():
        return {"imported": 0, "skipped": 0, "message": f"File '{filename}' was empty"}

    recipes = _parse_recipe_with_claude(content, filename)
    if not recipes:
        return {"imported": 0, "skipped": 0, "message": f"No recipes found in '{filename}'"}

    result = _save_parsed_recipes(db, recipes, filename)
    result["message"] = f"Imported {result['imported']} recipes, skipped {result['skipped']} duplicates"
    return result
