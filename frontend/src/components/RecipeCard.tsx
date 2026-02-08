import { Bookmark, BookmarkCheck, Clock, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
}

export default function RecipeCard({ recipe, onSave, onUnsave }: Props) {
  const categories = recipe.categories ? JSON.parse(recipe.categories) : [];

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <Link to={`/recipe/${recipe.id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
            {recipe.name}
          </h3>
        </Link>
        <button
          onClick={() =>
            recipe.is_saved ? onUnsave?.(recipe.id) : onSave?.(recipe.id)
          }
          className="ml-2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-500"
        >
          {recipe.is_saved ? (
            <BookmarkCheck className="h-5 w-5 text-primary-500" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </div>

      {recipe.description && (
        <p className="mb-3 text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {recipe.total_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {recipe.total_time}
          </span>
        )}
        {recipe.difficulty && (
          <span className="flex items-center gap-1">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            {recipe.difficulty}
          </span>
        )}
        {recipe.servings && <span>{recipe.servings}</span>}
      </div>

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.slice(0, 3).map((cat: string) => (
            <span
              key={cat}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {recipe.rating && (
        <div className="mt-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={star <= recipe.rating! ? "text-yellow-400" : "text-gray-300"}
            >
              &#9733;
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
