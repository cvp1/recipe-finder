import axios from "axios";
import type {
  DailySuggestion,
  GenerateRequest,
  GenerateResponse,
  ImportResult,
  PaginatedRecipes,
  Recipe,
  RecipeTab,
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

export async function getAllRecipes(
  page = 1,
  perPage = 20,
  search?: string,
  source?: string,
  tabId?: number
): Promise<PaginatedRecipes> {
  const res = await api.get<PaginatedRecipes>("/recipes/all", {
    params: { page, per_page: perPage, search: search || undefined, source: source || undefined, tab_id: tabId },
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

export async function importPaprika(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<ImportResult>("/paprika/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export function exportSavedPaprika(): void {
  window.open("/api/paprika/export", "_blank");
}

export function exportAllPaprika(): void {
  window.open("/api/paprika/export-all", "_blank");
}

export function exportRecipePaprika(id: string): void {
  window.open(`/api/paprika/export/${id}`, "_blank");
}

export function exportSavedMarkdown(): void {
  window.open("/api/markdown/export", "_blank");
}

export function exportAllMarkdown(): void {
  window.open("/api/markdown/export-all", "_blank");
}

export function exportRecipeMarkdown(id: string): void {
  window.open(`/api/markdown/export/${id}`, "_blank");
}

export async function uploadRecipeImage(id: string, file: File): Promise<Recipe> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<Recipe>(`/recipes/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteRecipeImage(id: string): Promise<void> {
  await api.delete(`/recipes/${id}/image`);
}

export async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await api.post<ImportResult>("/import/url", { url });
  return res.data;
}

export async function importFromFiles(files: File[]): Promise<ImportResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await api.post<ImportResult>("/import/files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function backfillImages(): Promise<{ total: number; updated: number; pexels_key_set: boolean; errors: string[] }> {
  const res = await api.post<{ total: number; updated: number; pexels_key_set: boolean; errors: string[] }>("/recipes/backfill-images");
  return res.data;
}

// Tabs API
export async function getTabs(): Promise<RecipeTab[]> {
  const res = await api.get<RecipeTab[]>("/tabs");
  return res.data;
}

export async function createTab(name: string): Promise<RecipeTab> {
  const res = await api.post<RecipeTab>("/tabs", { name });
  return res.data;
}

export async function updateTab(
  tabId: number,
  data: { name?: string; position?: number }
): Promise<RecipeTab> {
  const res = await api.put<RecipeTab>(`/tabs/${tabId}`, data);
  return res.data;
}

export async function deleteTab(tabId: number): Promise<void> {
  await api.delete(`/tabs/${tabId}`);
}

export async function addRecipesToTab(
  tabId: number,
  recipeIds: string[]
): Promise<RecipeTab> {
  const res = await api.post<RecipeTab>(`/tabs/${tabId}/recipes`, {
    recipe_ids: recipeIds,
  });
  return res.data;
}

export async function removeRecipeFromTab(
  tabId: number,
  recipeId: string
): Promise<void> {
  await api.delete(`/tabs/${tabId}/recipes/${recipeId}`);
}

export async function getRecipeTabIds(recipeId: string): Promise<number[]> {
  const res = await api.get<number[]>(`/tabs/recipe/${recipeId}`);
  return res.data;
}
