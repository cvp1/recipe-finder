import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  getDailySuggestions,
  refreshSuggestions,
  saveRecipe,
  unsaveRecipe,
} from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeCard from "../components/RecipeCard";

export default function SuggestionsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dailySuggestions"],
    queryFn: getDailySuggestions,
  });

  const refresh = useMutation({
    mutationFn: refreshSuggestions,
    onSuccess: (newData) => {
      queryClient.setQueryData(["dailySuggestions"], newData);
    },
  });

  const save = useMutation({
    mutationFn: (id: string) => saveRecipe(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dailySuggestions"] }),
  });

  const unsave = useMutation({
    mutationFn: (id: string) => unsaveRecipe(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dailySuggestions"] }),
  });

  if (isLoading) {
    return <LoadingSpinner message="Getting today's recipe inspiration..." />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          Could not load daily suggestions. Make sure your API key is configured.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Picks</h1>
          {data && (
            <p className="mt-1 text-gray-500">
              {data.theme} &middot; {data.date}
            </p>
          )}
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {refresh.isPending && (
        <LoadingSpinner message="Claude is brewing fresh suggestions..." />
      )}

      {data && data.recipes.length > 0 && !refresh.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSave={(id) => save.mutate(id)}
              onUnsave={(id) => unsave.mutate(id)}
            />
          ))}
        </div>
      )}

      {data && data.recipes.length === 0 && !refresh.isPending && (
        <p className="py-12 text-center text-gray-500">
          No suggestions available. Try refreshing.
        </p>
      )}
    </div>
  );
}
