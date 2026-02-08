import axios from "axios";
import type {
  DailySuggestion,
  GenerateRequest,
  GenerateResponse,
  PaginatedRecipes,
  Recipe,
  TopIngredient,
} from "../types";

const api = axios.create({
  baseURL: "/api",
});

export async function generateRecipes(
  data: GenerateRequest
): Promise<GenerateResponse> {
  const res = await api.post<GenerateResponse>("/recipes/generate", data);
  return res.data;
}

export async function getRecipe(id: string): Promise<Recipe> {
  const res = await api.get<Recipe>(`/recipes/${id}`);
  return res.data;
}

export async function getSavedRecipes(
  page = 1,
  perPage = 20
): Promise<PaginatedRecipes> {
  const res = await api.get<PaginatedRecipes>("/recipes", {
    params: { page, per_page: perPage },
  });
  return res.data;
}

export async function saveRecipe(
  id: string,
  notes?: string
): Promise<Recipe> {
  const res = await api.post<Recipe>(`/recipes/${id}/save`, { notes });
  return res.data;
}

export async function rateRecipe(
  id: string,
  rating: number
): Promise<Recipe> {
  const res = await api.post<Recipe>(`/recipes/${id}/rate`, { rating });
  return res.data;
}

export async function unsaveRecipe(id: string): Promise<void> {
  await api.delete(`/recipes/${id}/save`);
}

export async function getDailySuggestions(): Promise<DailySuggestion> {
  const res = await api.get<DailySuggestion>("/suggestions/daily");
  return res.data;
}

export async function refreshSuggestions(): Promise<DailySuggestion> {
  const res = await api.post<DailySuggestion>("/suggestions/refresh");
  return res.data;
}

export async function getTopIngredients(
  limit = 10
): Promise<TopIngredient[]> {
  const res = await api.get<TopIngredient[]>("/stats/top-ingredients", {
    params: { limit },
  });
  return res.data;
}
