import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  generateRecipes,
  getTopIngredients,
  saveRecipe,
  unsaveRecipe,
} from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";
import type { Recipe } from "../types";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
  const queryClient = useQueryClient();

  const { data: topIngredients } = useQuery({
    queryKey: ["topIngredients"],
    queryFn: () => getTopIngredients(12),
  });

  const generate = useMutation({
    mutationFn: generateRecipes,
    onSuccess: (data) => {
      setResults(data.recipes);
      queryClient.invalidateQueries({ queryKey: ["topIngredients"] });
    },
  });

  const save = useMutation({
    mutationFn: (id: string) => saveRecipe(id),
    onSuccess: (updated) => {
      setResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    },
  });

  const unsave = useMutation({
    mutationFn: (id: string) => unsaveRecipe(id),
    onSuccess: (_, id) => {
      setResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_saved: false, rating: null } : r))
      );
    },
  });

  function addIngredient(value?: string) {
    const trimmed = (value ?? input).trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      if (!value) setInput("");
    }
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        addIngredient();
      } else if (ingredients.length > 0) {
        generate.mutate({ ingredients });
      }
    }
    if (e.key === "Backspace" && !input && ingredients.length > 0) {
      removeIngredient(ingredients.length - 1);
    }
  }

  function handleGenerate() {
    if (ingredients.length === 0) return;
    generate.mutate({ ingredients });
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero area */}
      {results.length === 0 && !generate.isPending && (
        <div className="mb-10 pt-10 text-center">
          <p className="mb-2 text-sm italic text-amber-600/80">tell us what you have</p>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-amber-950" style={{ fontFamily: 'Georgia, serif' }}>
            What's in your kitchen?
          </h1>
          <p className="font-sans text-base text-stone-500">
            Add your ingredients and we'll dream up something delicious.
          </p>
        </div>
      )}

      {/* Input area */}
      <div className={`${results.length > 0 || generate.isPending ? "mb-8" : "mb-6"}`}>
        <div className="rounded-2xl border border-amber-200/70 bg-white/90 p-3 shadow-sm shadow-amber-100/50 transition-shadow focus-within:shadow-md focus-within:shadow-amber-200/40 focus-within:border-amber-300">
          {/* Ingredient chips inside the input box */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ingredients.map((ingredient, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-1 font-sans text-sm font-medium text-amber-900 border border-amber-200/60"
              >
                {ingredient}
                <button
                  onClick={() => removeIngredient(index)}
                  disabled={generate.isPending}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-amber-200/60 text-amber-600"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ingredients.length === 0 ? "chicken, rice, garlic..." : "add more..."}
              disabled={generate.isPending}
              className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1.5 font-sans text-base text-stone-800 placeholder-stone-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Action row */}
          <div className="mt-2 flex items-center justify-between border-t border-amber-100/60 pt-2">
            <span className="font-sans text-xs text-stone-400">
              {ingredients.length === 0
                ? "Press Enter after each ingredient"
                : `${ingredients.length} ingredient${ingredients.length !== 1 ? "s" : ""}`}
            </span>
            <button
              onClick={handleGenerate}
              disabled={ingredients.length === 0 || generate.isPending}
              className="flex items-center gap-1.5 rounded-full bg-amber-700 px-5 py-1.5 font-sans text-sm font-semibold text-amber-50 transition-all hover:bg-amber-800 disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generate.isPending ? "Cooking up ideas..." : "Find recipes"}
            </button>
          </div>
        </div>

        {/* Quick-add suggestions */}
        {topIngredients && topIngredients.length > 0 && results.length === 0 && !generate.isPending && (
          <div className="mt-5 text-center">
            <p className="mb-2 font-sans text-xs font-medium uppercase tracking-wider text-amber-600/50">
              Your favorites
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {topIngredients.map((item) => (
                <button
                  key={item.ingredient}
                  onClick={() => addIngredient(item.ingredient)}
                  disabled={ingredients.includes(item.ingredient)}
                  className="rounded-full border border-amber-200/50 bg-white/80 px-3 py-1 font-sans text-xs text-amber-800/70 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-30"
                >
                  {item.ingredient}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {generate.isPending && (
        <LoadingSpinner message="Finding recipes for you..." />
      )}

      {/* Error state */}
      {generate.isError && (
        <div className="rounded-xl bg-red-50 p-4 text-center font-sans text-sm text-red-700">
          Failed to generate recipes. Please check your API key and try again.
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !generate.isPending && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-amber-500" />
            <h2 className="font-sans text-lg font-semibold text-amber-900">
              Here's what you can make
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSave={(id) => save.mutate(id)}
                onUnsave={(id) => unsave.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
