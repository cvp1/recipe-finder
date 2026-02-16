import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Check, Clock, FolderPlus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { addRecipesToTab, getRecipeTabIds, getTabs, removeRecipeFromTab } from "../api/client";
import type { Recipe } from "../types";

interface Props {
  recipe: Recipe;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
  showTabAction?: boolean;
}

export default function RecipeCard({ recipe, onSave, onUnsave, showTabAction }: Props) {
  const [imgError, setImgError] = useState(false);
  const [showTabPopover, setShowTabPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const categories = recipe.categories ? (() => { try { return JSON.parse(recipe.categories); } catch { return []; } })() : [];

  const { data: tabs } = useQuery({
    queryKey: ["tabs"],
    queryFn: getTabs,
    enabled: showTabAction === true,
  });

  const { data: recipeTabIds } = useQuery({
    queryKey: ["recipeTabIds", recipe.id],
    queryFn: () => getRecipeTabIds(recipe.id),
    enabled: showTabPopover,
  });

  const addMut = useMutation({
    mutationFn: (tabId: number) => addRecipesToTab(tabId, [recipe.id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTabIds", recipe.id] });
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (tabId: number) => removeRecipeFromTab(tabId, recipe.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipeTabIds", recipe.id] });
      queryClient.invalidateQueries({ queryKey: ["tabs"] });
      queryClient.invalidateQueries({ queryKey: ["allRecipes"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowTabPopover(false);
      }
    }
    if (showTabPopover) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showTabPopover]);

  function toggleTab(tabId: number) {
    if (recipeTabIds?.includes(tabId)) {
      removeMut.mutate(tabId);
    } else {
      addMut.mutate(tabId);
    }
  }

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
        <div className="flex shrink-0 items-center gap-0.5">
          {showTabAction && tabs && tabs.length > 0 && (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setShowTabPopover(!showTabPopover)}
                className="rounded-lg p-1 text-stone-300 transition-colors hover:text-amber-500"
                title="Add to collection"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
              {showTabPopover && (
                <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  <div className="px-3 py-1.5 text-xs font-medium text-stone-400 uppercase">Collections</div>
                  {tabs.map((tab) => {
                    const isIn = recipeTabIds?.includes(tab.id);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => toggleTab(tab.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
                      >
                        {isIn ? (
                          <Check className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <span className="h-3.5 w-3.5" />
                        )}
                        {tab.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() =>
              recipe.is_saved ? onUnsave?.(recipe.id) : onSave?.(recipe.id)
            }
            className="rounded-lg p-1 text-stone-300 transition-colors hover:text-amber-500"
          >
            {recipe.is_saved ? (
              <BookmarkCheck className="h-4 w-4 text-amber-500" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
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
