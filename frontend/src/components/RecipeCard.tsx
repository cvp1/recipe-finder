import { Bookmark, BookmarkCheck, Clock, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
}

export default function RecipeCard({ recipe, onSave, onUnsave }: Props) {
  const [imgError, setImgError] = useState(false);
  const categories = recipe.categories ? (() => { try { return JSON.parse(recipe.categories); } catch { return []; } })() : [];

  return (
    <div className="group relative flex flex-col rounded-xl border border-stone-200 bg-white overflow-hidden transition-all hover:border-amber-200 hover:shadow-md">
      {recipe.image_url && !imgError && (
        <Link to={`/recipe/${recipe.id}`}>
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-40 w-full object-cover"
            onError={() => setImgError(true)}
          />
        </Link>
      )}
      <div className="flex flex-col flex-1 p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link to={`/recipe/${recipe.id}`} className="flex-1">
          <h3 className="font-sans text-base font-semibold leading-snug text-stone-900 group-hover:text-amber-700">
            {recipe.name}
          </h3>
        </Link>
        <button
          onClick={() =>
            recipe.is_saved ? onUnsave?.(recipe.id) : onSave?.(recipe.id)
          }
          className="shrink-0 rounded-lg p-1 text-stone-300 transition-colors hover:text-amber-500"
        >
          {recipe.is_saved ? (
            <BookmarkCheck className="h-4 w-4 text-amber-500" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      {recipe.description && (
        <p className="mb-3 text-sm leading-relaxed text-stone-500 line-clamp-2">
          {recipe.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 font-sans text-xs text-stone-400">
        {recipe.total_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.total_time}
          </span>
        )}
        {recipe.servings && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {recipe.servings}
          </span>
        )}
        {recipe.difficulty && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 capitalize">
            {recipe.difficulty}
          </span>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {categories.slice(0, 3).map((cat: string) => (
            <span
              key={cat}
              className="rounded-full bg-amber-50 px-2 py-0.5 font-sans text-[10px] font-medium text-amber-700 capitalize"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {recipe.rating && (
        <div className="mt-2 flex gap-0.5 text-xs">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={star <= recipe.rating! ? "text-amber-400" : "text-stone-200"}
            >
              &#9733;
            </span>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
