import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkX } from "lucide-react";
import { useState } from "react";
import { getSavedRecipes, unsaveRecipe } from "../api/client";
import ImportExportBar from "../components/ImportExportBar";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";

export default function SavedRecipesPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["savedRecipes", page],
    queryFn: () => getSavedRecipes(page),
  });

  const unsave = useMutation({
    mutationFn: (id: string) => unsaveRecipe(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] }),
  });

  if (isLoading) return <LoadingSpinner message="Loading saved recipes..." />;

  const recipes = data?.recipes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (data?.per_page ?? 20));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Recipes</h1>
        <p className="mt-1 text-gray-500">{total} recipe{total !== 1 ? "s" : ""} saved</p>
      </div>

      <ImportExportBar />

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <BookmarkX className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No saved recipes yet.</p>
          <p className="text-sm text-gray-400">
            Find recipes on the home page and save your favorites here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
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
