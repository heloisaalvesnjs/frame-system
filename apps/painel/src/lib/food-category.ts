export const CATEGORY_STYLE = {
  carboidrato: { bgClass: "bg-food-carb", colorVar: "var(--food-carb)", label: "Carboidratos" },
  proteina:    { bgClass: "bg-food-protein", colorVar: "var(--food-protein)", label: "Proteínas" },
  gordura:     { bgClass: "bg-food-fat", colorVar: "var(--food-fat)", label: "Gorduras" },
  fruta:       { bgClass: "bg-food-fruit", colorVar: "var(--food-fruit)", label: "Frutas" },
  vegetal:     { bgClass: "bg-food-veg", colorVar: "var(--food-veg)", label: "Vegetais" },
  laticinios:  { bgClass: "bg-food-dairy", colorVar: "var(--food-dairy)", label: "Laticínios" },
  outros:      { bgClass: "bg-muted-foreground/40", colorVar: "currentColor", label: "Outros" },
} as const;

export type FoodCategory = keyof typeof CATEGORY_STYLE;

const PROTEIN_KEYWORDS = ["carne", "boi", "frango", "peixe", "ovo", "pato", "peru", "camarão", "atum", "sardinha", "salmão", "tilápia", "linguiça", "bacon", "presunto", "proteína", "whey"];
const CARB_KEYWORDS = ["arroz", "pão", "macarrão", "batata", "mandioca", "tapioca", "milho", "aveia", "cereal", "biscoito", "bolacha", "farinha", "trigo", "cuscuz", "inhame"];
const FAT_KEYWORDS = ["óleo", "azeite", "manteiga", "abacate", "castanha", "amendoim", "nozes", "semente", "banha", "gordura", "margarina", "creme"];
const FRUIT_KEYWORDS = ["fruta", "banana", "maçã", "laranja", "uva", "morango", "melão", "melancia", "manga", "abacaxi", "mamão", "pêra", "pêssego", "caju", "goiaba", "limão", "kiwi", "ameixa", "cereja"];
const VEGGIE_KEYWORDS = ["verdura", "legume", "alface", "espinafre", "couve", "brócolis", "cenoura", "tomate", "pepino", "cebola", "alho", "abobrinha", "berinjela", "chuchu", "vagem", "pimentão", "repolho", "beterraba"];
const DAIRY_KEYWORDS = ["leite", "queijo", "iogurte", "requeijão", "ricota", "mussarela", "creme de leite", "nata"];

export function categorize(food: { name: string; category: string }): FoodCategory {
  const text = `${food.name} ${food.category}`.toLowerCase();
  if (DAIRY_KEYWORDS.some((k) => text.includes(k))) return "laticinios";
  if (PROTEIN_KEYWORDS.some((k) => text.includes(k))) return "proteina";
  if (CARB_KEYWORDS.some((k) => text.includes(k))) return "carboidrato";
  if (FAT_KEYWORDS.some((k) => text.includes(k))) return "gordura";
  if (FRUIT_KEYWORDS.some((k) => text.includes(k))) return "fruta";
  if (VEGGIE_KEYWORDS.some((k) => text.includes(k))) return "vegetal";
  return "outros";
}
