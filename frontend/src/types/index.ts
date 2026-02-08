export interface Recipe {
  id: string;
  name: string;
  ingredients: string;
  directions: string;
  description: string | null;
  notes: string | null;
  source: string | null;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  servings: string | null;
  categories: string | null;
  nutritional_info: string | null;
  image_url: string | null;
  difficulty: string | null;
  cuisine: string | null;
  ai_generated: boolean;
  created_at: string;
  is_saved: boolean;
  rating: number | null;
}

export interface GenerateRequest {
  ingredients: string[];
  dietary_preferences?: string;
  cuisine_preference?: string;
  max_cook_time?: string;
}

export interface GenerateResponse {
  recipes: Recipe[];
}

export interface DailySuggestion {
  theme: string;
  recipes: Recipe[];
  date: string;
}

export interface TopIngredient {
  ingredient: string;
  count: number;
}

export interface PaginatedRecipes {
  recipes: Recipe[];
  total: number;
  page: number;
  per_page: number;
}
