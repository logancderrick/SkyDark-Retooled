export interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface MealRecipe {
  id: string;
  name: string;
  ingredients: MealIngredient[];
  imageUrl?: string;
  instructions?: string;
}

export interface MealSlot {
  id: string;
  date: string;
  mealType: string;
  name: string;
  recipeId?: string;
  ingredients?: MealIngredient[];
  imageUrl?: string;
  instructions?: string;
}
