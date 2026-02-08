import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getRecipe, rateRecipe, saveRecipe, unsaveRecipe } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeDetail from "../components/RecipeDetail";

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => getRecipe(id!),
    enabled: !!id,
  });

  const save = useMutation({
    mutationFn: (recipeId: string) => saveRecipe(recipeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipe", id] }),
  });

  const unsave = useMutation({
    mutationFn: (recipeId: string) => unsaveRecipe(recipeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipe", id] }),
  });

  const rate = useMutation({
    mutationFn: ({ recipeId, rating }: { recipeId: string; rating: number }) =>
      rateRecipe(recipeId, rating),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipe", id] }),
  });

  if (isLoading) return <LoadingSpinner message="Loading recipe..." />;
  if (error || !recipe) {
    return (
      <div className="py-12 text-center text-gray-500">
        Recipe not found.{" "}
        <Link to="/" className="text-primary-600 hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <RecipeDetail
        recipe={recipe}
        onSave={(recipeId) => save.mutate(recipeId)}
        onUnsave={(recipeId) => unsave.mutate(recipeId)}
        onRate={(recipeId, rating) => rate.mutate({ recipeId, rating })}
      />
    </div>
  );
}
