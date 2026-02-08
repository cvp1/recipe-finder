import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { useState } from "react";
import { getAllRecipes, saveRecipe, unsaveRecipe } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";

export default function AllRecipesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["allRecipes", page, activeSearch, source],
    queryFn: () => getAllRecipes(page, 20, activeSearch, source),
  });

  const save = useMutation({
    mutationFn: (id: string) => saveRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allRecipes"] }),
  });

  const unsave = useMutation({
    mutationFn: (id: string) => unsaveRecipe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allRecipes"] }),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  }

  const recipes = data?.recipes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.per_page ?? 20));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Recipes</h1>
        <p className="mt-1 text-gray-500">{total} recipe{total !== 1 ? "s" : ""} in library</p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes by name..."
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            Search
          </button>
        </form>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">All sources</option>
          <option value="ai">AI Generated</option>
          <option value="imported">Imported</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading recipes..." />
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Library className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">
            {activeSearch || source ? "No recipes match your filters." : "No recipes yet."}
          </p>
          <p className="text-sm text-gray-400">
            Generate recipes on the home page or import from Paprika.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onSave={(id) => save.mutate(id)}
                onUnsave={(id) => unsave.mutate(id)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
