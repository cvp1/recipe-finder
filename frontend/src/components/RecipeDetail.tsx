import { Bookmark, BookmarkCheck, Clock, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  onRate?: (id: string, rating: number) => void;
}

export default function RecipeDetail({ recipe, onSave, onUnsave, onRate }: Props) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const categories = recipe.categories ? JSON.parse(recipe.categories) : [];
  const ingredientLines = recipe.ingredients.split("\n").filter(Boolean);
  const directionLines = recipe.directions.split("\n").filter(Boolean);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
        <button
          onClick={() =>
            recipe.is_saved ? onUnsave?.(recipe.id) : onSave?.(recipe.id)
          }
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-500"
        >
          {recipe.is_saved ? (
            <BookmarkCheck className="h-6 w-6 text-primary-500" />
          ) : (
            <Bookmark className="h-6 w-6" />
          )}
        </button>
      </div>

      {recipe.description && (
        <p className="mb-4 text-gray-600">{recipe.description}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-gray-500">
        {recipe.prep_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> Prep: {recipe.prep_time}
          </span>
        )}
        {recipe.cook_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> Cook: {recipe.cook_time}
          </span>
        )}
        {recipe.total_time && (
          <span className="flex items-center gap-1 font-medium text-gray-700">
            <Clock className="h-4 w-4" /> Total: {recipe.total_time}
          </span>
        )}
        {recipe.difficulty && (
          <span className="flex items-center gap-1">
            <UtensilsCrossed className="h-4 w-4" /> {recipe.difficulty}
          </span>
        )}
        {recipe.servings && <span>{recipe.servings}</span>}
        {recipe.cuisine && (
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-primary-700">
            {recipe.cuisine}
          </span>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat: string) => (
            <span
              key={cat}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Ingredients</h2>
        <ul className="space-y-1.5">
          {ingredientLines.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-400" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Directions</h2>
        <ol className="space-y-3">
          {directionLines.map((line, i) => (
            <li key={i} className="flex gap-3 text-gray-700">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                {i + 1}
              </span>
              <span>{line.replace(/^(Step\s+)?\d+[.:]\s*/i, "")}</span>
            </li>
          ))}
        </ol>
      </div>

      {recipe.nutritional_info && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Nutrition</h2>
          <p className="text-sm text-gray-600">{recipe.nutritional_info}</p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Rate this recipe</h2>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => onRate?.(recipe.id, star)}
              className="text-2xl transition-colors"
            >
              <span
                className={
                  star <= (hoveredStar || recipe.rating || 0)
                    ? "text-yellow-400"
                    : "text-gray-300"
                }
              >
                &#9733;
              </span>
            </button>
          ))}
        </div>
      </div>

      {recipe.notes && (
        <div className="mt-4 rounded-lg bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            <strong>Notes:</strong> {recipe.notes}
          </p>
        </div>
      )}
    </div>
  );
}
