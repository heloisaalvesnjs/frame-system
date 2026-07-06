export type TacoFood = {
  id: number;
  name: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  typical_amount: number;
  typical_unit: string;
  unit_weight_g: number;
};

export type FoodSubstitution = {
  food_id: number;
  name: string;
  quantity: number;
  unit: string;
};

export type MealItem = {
  food_id: number;
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  substitutions: FoodSubstitution[];
};

export type Meal = {
  id: string;
  name: string;
  time: string;
  items: MealItem[];
  notes?: string;
};

export type MealPlan = {
  id: string;
  title: string;
  meals: Meal[];
  notes: string | null;
  updated_at: string;
};

export type ClientDetail = {
  client: {
    id: string;
    name: string | null;
    phone: string;
    goal: string | null;
    notes: string | null;
    stage: string | null;
    return_date: string | null;
  };
  appointments: {
    id: string;
    scheduled_at: string;
    modality: string;
    status: string;
    notes: string | null;
  }[];
  next_appointment: { id: string; scheduled_at: string; modality: string; status: string } | null;
  meal_plan: MealPlan | null;
};

export const STAGE_LABEL: Record<string, string> = {
  novo_contato: "Novo contato",
  em_atendimento: "Em atendimento",
  qualificado: "Qualificado",
  avaliando: "Avaliando",
  agendamento_pendente: "Agendamento pendente",
  consulta_marcada: "Consulta marcada",
  perdido: "Perdido",
};
