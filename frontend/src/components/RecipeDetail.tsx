import { Bookmark, BookmarkCheck, Camera, Clock, Download, FileText, Printer, Users, X } from "lucide-react";
import { useRef, useState } from "react";
import { exportRecipeMarkdown, exportRecipePaprika } from "../api/client";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  onRate?: (id: string, rating: number) => void;
  onImageUpload?: (file: File) => void;
  onImageDelete?: () => void;
}

export default function RecipeDetail({ recipe, onSave, onUnsave, onRate, onImageUpload, onImageDelete }: Props) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = recipe.categories ? (() => { try { return JSON.parse(recipe.categories); } catch { return []; } })() : [];
  const ingredientLines = recipe.ingredients.split("\n").filter(Boolean);
  const directionLines = recipe.directions.split("\n").filter(Boolean);

  return (
    <div className="recipe-print rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Hero image */}
      {recipe.image_url && !imgError && (
        <div className="relative">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="h-64 w-full object-cover sm:h-80"
            onError={() => setImgError(true)}
          />
          {onImageDelete && (
            <button
              onClick={onImageDelete}
              className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 print-hide"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-stone-100 p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-sans text-2xl font-bold tracking-tight text-stone-900">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-2 text-base leading-relaxed text-stone-500">
                {recipe.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 print-hide">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageUpload?.(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              title="Upload image"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              title="Print recipe"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={() => exportRecipePaprika(recipe.id)}
              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              title="Export to Paprika"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => exportRecipeMarkdown(recipe.id)}
              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              title="Export as Markdown"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                recipe.is_saved ? onUnsave?.(recipe.id) : onSave?.(recipe.id)
              }
              className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-amber-500"
            >
              {recipe.is_saved ? (
                <BookmarkCheck className="h-5 w-5 text-amber-500" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Meta bar */}
        <div className="recipe-meta mt-4 flex flex-wrap gap-4 font-sans text-sm text-stone-500">
          {recipe.prep_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-stone-400" />
              <span className="text-stone-400">Prep</span> {recipe.prep_time}
            </span>
          )}
          {recipe.cook_time && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-stone-400" />
              <span className="text-stone-400">Cook</span> {recipe.cook_time}
            </span>
          )}
          {recipe.total_time && (
            <span className="flex items-center gap-1.5 font-medium text-stone-700">
              <Clock className="h-4 w-4 text-amber-500" />
              {recipe.total_time}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-stone-400" />
              {recipe.servings}
            </span>
          )}
          {recipe.difficulty && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs capitalize">
              {recipe.difficulty}
            </span>
          )}
          {recipe.cuisine && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
              {recipe.cuisine}
            </span>
          )}
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((cat: string) => (
              <span
                key={cat}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 font-sans text-xs text-stone-500"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body — two-column on wider screens and print */}
      <div className="ingredients-directions p-6 sm:grid sm:grid-cols-5 sm:gap-8">
        {/* Ingredients */}
        <div className="sm:col-span-2">
          <h2 className="mb-3 font-sans text-sm font-bold uppercase tracking-wider text-stone-400">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredientLines.map((line, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[15px] leading-snug text-stone-700">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* Directions */}
        <div className="mt-6 sm:col-span-3 sm:mt-0">
          <h2 className="mb-3 font-sans text-sm font-bold uppercase tracking-wider text-stone-400">
            Directions
          </h2>
          <ol className="space-y-4">
            {directionLines.map((line, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-stone-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 font-sans text-xs font-bold text-amber-700">
                  {i + 1}
                </span>
                <span>{line.replace(/^(Step\s+)?\d+[.:]\s*/i, "")}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stone-100 p-6 pt-4">
        {recipe.nutritional_info && (
          <div className="mb-4">
            <h2 className="mb-1 font-sans text-sm font-bold uppercase tracking-wider text-stone-400">
              Nutrition
            </h2>
            <p className="text-sm text-stone-500">{recipe.nutritional_info}</p>
          </div>
        )}

        {recipe.notes && (
          <div className="mb-4 rounded-lg bg-amber-50/50 p-3">
            <p className="text-sm text-stone-600">
              <strong className="font-sans text-stone-700">Notes:</strong> {recipe.notes}
            </p>
          </div>
        )}

        {/* Rating — hide on print */}
        <div className="print-hide flex items-center gap-3 border-t border-stone-100 pt-4">
          <span className="font-sans text-sm text-stone-500">Rate:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => onRate?.(recipe.id, star)}
                className="text-xl transition-colors"
              >
                <span
                  className={
                    star <= (hoveredStar || recipe.rating || 0)
                      ? "text-amber-400"
                      : "text-stone-200"
                  }
                >
                  &#9733;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
