import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FavoriteMeal {
  id: string;
  name: string;
  meal_type: string;
  created_at: string;
  items: FavoriteMealItem[];
}

export interface FavoriteMealItem {
  id: string;
  favorite_meal_id: string;
  food_name: string;
  portion_size: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibres: number;
  calcium: number;
  vitamin_d: number;
  magnesium: number;
  iron: number;
  omega3: number;
  phytoestrogens: number;
  vitamin_b12: number;
}

export function useFavoriteMeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorite_meals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: meals, error } = await supabase
        .from("favorite_meals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from("favorite_meal_items")
        .select("*")
        .in("favorite_meal_id", meals.map((m: any) => m.id));
      if (itemsError) throw itemsError;

      return meals.map((m: any) => ({
        ...m,
        items: (items || []).filter((i: any) => i.favorite_meal_id === m.id),
      })) as FavoriteMeal[];
    },
    enabled: !!user,
  });

  const saveFavorite = useMutation({
    mutationFn: async ({
      name,
      meal_type,
      items,
    }: {
      name: string;
      meal_type: string;
      items: Omit<FavoriteMealItem, "id" | "favorite_meal_id">[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: meal, error } = await supabase
        .from("favorite_meals")
        .insert({ user_id: user.id, name, meal_type })
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("favorite_meal_items")
          .insert(items.map((i) => ({ ...i, favorite_meal_id: meal.id })));
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite_meals"] });
    },
  });

  const deleteFavorite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("favorite_meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite_meals"] });
    },
  });

  return { favorites, isLoading, saveFavorite, deleteFavorite };
}
