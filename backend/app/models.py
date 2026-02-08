import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    ingredients: Mapped[str] = mapped_column(Text, default="")
    directions: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    prep_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cook_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    servings: Mapped[str | None] = mapped_column(String(100), nullable=True)
    categories: Mapped[str | None] = mapped_column(Text, nullable=True)
    nutritional_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cuisine: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    saved_entry: Mapped["SavedRecipe | None"] = relationship(back_populates="recipe")


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipe_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("recipes.id"), nullable=False
    )
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    saved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    recipe: Mapped["Recipe"] = relationship(back_populates="saved_entry")


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ingredients: Mapped[str] = mapped_column(Text, nullable=False)
    recipe_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("recipes.id"), nullable=True
    )
    searched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IngredientFrequency(Base):
    __tablename__ = "ingredient_frequency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ingredient: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    count: Mapped[int] = mapped_column(Integer, default=1)
    last_searched: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailySuggestion(Base):
    __tablename__ = "daily_suggestions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    recipes: Mapped[str] = mapped_column(Text, nullable=False)
    theme: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
