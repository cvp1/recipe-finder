import json
import logging

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

RECIPE_SYSTEM_PROMPT = """You are a professional chef and recipe creator. When given ingredients,
create delicious, practical recipes. Always respond with valid JSON only — no markdown, no extra text.

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
- Ingredients should be newline-separated, with quantities (e.g. "2 cups flour")
- Directions should be newline-separated numbered steps
- Categories should be a JSON array as a string
- difficulty must be one of: easy, medium, hard
- Be creative but practical — recipes should be achievable for home cooks"""

SUGGESTION_SYSTEM_PROMPT = """You are a professional chef providing daily recipe inspiration.
Generate themed recipe suggestions based on the context provided.
Always respond with valid JSON only — no markdown, no extra text.

Return a JSON object with:
{
  "theme": "A catchy theme name like 'Cozy Winter Comfort Food'",
  "recipes": [array of recipe objects with same format as recipe generation]
}

Each recipe must have: name, ingredients, directions, description, prep_time, cook_time,
total_time, servings, categories, difficulty, cuisine, nutritional_info."""


def normalize_recipe(data: dict) -> dict:
    """Normalize Claude's recipe output — handles arrays vs strings for fields."""
    for field in ("ingredients", "directions"):
        val = data.get(field, "")
        if isinstance(val, list):
            data[field] = "\n".join(str(item) for item in val)

    cat = data.get("categories")
    if isinstance(cat, list):
        data["categories"] = json.dumps(cat)
    elif isinstance(cat, str) and not cat.startswith("["):
        data["categories"] = json.dumps([cat])

    # nutritional_info can come back as a dict — convert to readable string
    nutri = data.get("nutritional_info")
    if isinstance(nutri, dict):
        data["nutritional_info"] = ", ".join(f"{k}: {v}" for k, v in nutri.items())

    # servings can come back as an int
    servings = data.get("servings")
    if servings is not None and not isinstance(servings, str):
        data["servings"] = str(servings)

    return data


def _extract_json(text: str) -> str:
    """Strip markdown code fences if Claude wraps JSON in them."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        # Remove closing fence
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


def generate_recipes(
    ingredients: list[str],
    preferences: dict | None = None,
    count: int = 3,
) -> list[dict]:
    pref_context = ""
    if preferences:
        if preferences.get("top_ingredients"):
            pref_context += f"\nUser frequently searches for: {', '.join(preferences['top_ingredients'])}"
        if preferences.get("top_cuisines"):
            pref_context += f"\nUser prefers cuisines: {', '.join(preferences['top_cuisines'])}"
        if preferences.get("avg_rating_by_cuisine"):
            pref_context += f"\nHighest rated cuisines: {preferences['avg_rating_by_cuisine']}"
        if preferences.get("dietary_preferences"):
            pref_context += f"\nDietary preferences: {preferences['dietary_preferences']}"

    user_prompt = f"""Create {count} recipes using these ingredients: {', '.join(ingredients)}

The recipes should primarily use the listed ingredients but can include common pantry staples
(salt, pepper, oil, butter, garlic, onion, common spices).
{pref_context}"""

    if preferences and preferences.get("cuisine_preference"):
        user_prompt += f"\nPreferred cuisine style: {preferences['cuisine_preference']}"
    if preferences and preferences.get("max_cook_time"):
        user_prompt += f"\nMaximum cooking time: {preferences['max_cook_time']}"

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=RECIPE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw_text = message.content[0].text
        logger.info("Claude raw response (first 200 chars): %s", raw_text[:200])
        cleaned = _extract_json(raw_text)
        return json.loads(cleaned)
    except (json.JSONDecodeError, IndexError, anthropic.APIError) as e:
        logger.error("Claude API error during recipe generation: %s", e)
        raise


def generate_daily_suggestions(preferences: dict | None = None) -> dict:
    from datetime import date

    today = date.today()
    month_names = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    day_names = [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ]

    pref_context = ""
    if preferences:
        if preferences.get("top_ingredients"):
            pref_context += f"\nUser's favorite ingredients: {', '.join(preferences['top_ingredients'][:5])}"
        if preferences.get("top_cuisines"):
            pref_context += f"\nUser's preferred cuisines: {', '.join(preferences['top_cuisines'])}"

    user_prompt = f"""Generate 5 themed daily recipe suggestions for {day_names[today.weekday()]},
{month_names[today.month]} {today.day}.

Consider the season and day of the week when choosing a theme and recipes.
{pref_context}

Make the recipes varied — include different meal types (breakfast, lunch, dinner, snack/dessert)."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=6000,
            system=SUGGESTION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        print(f"[SUGGESTIONS] stop_reason={message.stop_reason} content_blocks={len(message.content)}", flush=True)
        raw_text = message.content[0].text
        print(f"[SUGGESTIONS] raw response (first 300 chars): {raw_text[:300]}", flush=True)
        cleaned = _extract_json(raw_text)
        return json.loads(cleaned)
    except Exception as e:
        print(f"[SUGGESTIONS] ERROR: {type(e).__name__}: {e}", flush=True)
        raise
