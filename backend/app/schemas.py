from datetime import datetime

from pydantic import BaseModel


class RecipeBase(BaseModel):
    name: str
    ingredients: str = ""
    directions: str = ""
    description: str | None = None
    notes: str | None = None
    source: str | None = None
    prep_time: str | None = None
    cook_time: str | None = None
    total_time: str | None = None
    servings: str | None = None
    categories: str | None = None
    nutritional_info: str | None = None
    image_url: str | None = None
    difficulty: str | None = None
    cuisine: str | None = None


class RecipeOut(RecipeBase):
    id: str
    ai_generated: bool = True
    created_at: datetime
    is_saved: bool = False
    rating: int | None = None

    model_config = {"from_attributes": True}


class GenerateRequest(BaseModel):
    ingredients: list[str]
    dietary_preferences: str | None = None
    cuisine_preference: str | None = None
    max_cook_time: str | None = None


class GenerateResponse(BaseModel):
    recipes: list[RecipeOut]


class SaveRecipeRequest(BaseModel):
    notes: str | None = None


class RateRecipeRequest(BaseModel):
    rating: int


class DailySuggestionOut(BaseModel):
    theme: str
    recipes: list[RecipeOut]
    date: str


class TopIngredientOut(BaseModel):
    ingredient: str
    count: int


class PaginatedRecipes(BaseModel):
    recipes: list[RecipeOut]
    total: int
    page: int
    per_page: int


class RecipeTabCreate(BaseModel):
    name: str


class RecipeTabUpdate(BaseModel):
    name: str | None = None
    position: int | None = None


class RecipeTabOut(BaseModel):
    id: int
    name: str
    position: int
    recipe_count: int = 0

    model_config = {"from_attributes": True}


class AddRecipesToTab(BaseModel):
    recipe_ids: list[str]
