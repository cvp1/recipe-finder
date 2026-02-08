import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import {
  generateRecipes,
  getTopIngredients,
  saveRecipe,
  unsaveRecipe,
} from "../api/client";
import IngredientInput from "../components/IngredientInput";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";
import type { Recipe } from "../types";

export default function HomePage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);
  const queryClient = useQueryClient();

  const { data: topIngredients } = useQuery({
    queryKey: ["topIngredients"],
    queryFn: () => getTopIngredients(8),
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
      setResults((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
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

  function handleGenerate() {
    if (ingredients.length === 0) return;
    generate.mutate({ ingredients });
  }

  function addQuickIngredient(ingredient: string) {
    if (!ingredients.includes(ingredient)) {
      setIngredients([...ingredients, ingredient]);
    }
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          What's in your kitchen?
        </h1>
        <p className="text-gray-500">
          Add your ingredients and let AI create delicious recipes for you
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <IngredientInput
          ingredients={ingredients}
          onChange={setIngredients}
          disabled={generate.isPending}
        />

        <button
          onClick={handleGenerate}
          disabled={ingredients.length === 0 || generate.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          <Search className="h-5 w-5" />
          {generate.isPending ? "Creating recipes..." : "Find Recipes"}
        </button>

        {topIngredients && topIngredients.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-400">
              Your frequent ingredients:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topIngredients.map((item) => (
                <button
                  key={item.ingredient}
                  onClick={() => addQuickIngredient(item.ingredient)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
                >
                  {item.ingredient}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {generate.isPending && (
        <LoadingSpinner message="Claude is crafting recipes from your ingredients..." />
      )}

      {generate.isError && (
        <div className="mx-auto mt-6 max-w-2xl rounded-lg bg-red-50 p-4 text-center text-red-700">
          Failed to generate recipes. Please check your API key and try again.
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Recipes for you
          </h2>
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
